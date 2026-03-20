import { useEffect, useState } from 'react'
import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers'
import ABI from './abi.json'
import {
  CONTRACT_ADDRESS,
  EXPECTED_CHAIN_ID,
  EXPECTED_NETWORK_NAME,
} from './config'

function App() {
  const [walletAddress, setWalletAddress] = useState(null)
  const [ethProvider, setEthProvider] = useState(null)
  const [results, setResults] = useState([])
  const [messageErreur, setMessageErreur] = useState('')

  const [loadingVote, setLoadingVote] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const [currentTxHash, setCurrentTxHash] = useState('')
  const [confirmedBlock, setConfirmedBlock] = useState(null)

  const [recentVote, setRecentVote] = useState(null)

  const [historyVisible, setHistoryVisible] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [voteHistory, setVoteHistory] = useState([])

  const rpcProvider = new JsonRpcProvider('http://127.0.0.1:7545')

  const getMetaMaskProvider = () => {
    if (!window.ethereum) return null

    if (window.ethereum.providers?.length) {
      const metaMaskProvider = window.ethereum.providers.find(
        (provider) => provider.isMetaMask && !provider.isBraveWallet
      )
      return metaMaskProvider || null
    }

    if (window.ethereum.isMetaMask && !window.ethereum.isBraveWallet) {
      return window.ethereum
    }

    return null
  }

  const shortAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const shortHash = (hash) => {
    if (!hash) return ''
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`
  }

  const getReadOnlyContract = (providerInstance) => {
    return new Contract(CONTRACT_ADDRESS, ABI, providerInstance)
  }

  const fetchCandidates = async (providerInstance) => {
    try {
      const contract = getReadOnlyContract(providerInstance)
      const total = await contract.getCandidatesCount()

      const data = []

      for (let index = 0; index < Number(total); index++) {
        const candidateData = await contract.getCandidate(index)

        data.push({
          id: index,
          name: candidateData[0],
          votes: Number(candidateData[1]),
        })
      }

      setResults(data)
      setMessageErreur('')
    } catch (error) {
      console.error(error)
      setMessageErreur("Erreur lors du chargement des résultats.")
    }
  }

  const fetchCooldown = async (providerInstance, address) => {
    try {
      const contract = getReadOnlyContract(providerInstance)
      const seconds = await contract.getTimeUntilNextVote(address)
      setRemainingTime(Number(seconds))
    } catch (error) {
      console.error(error)
    }
  }

  const initializeApp = async () => {
    try {
      await fetchCandidates(rpcProvider)
      setEthProvider(rpcProvider)
    } catch (error) {
      console.error(error)
      setMessageErreur("Erreur lors du chargement des résultats.")
    }
  }

  useEffect(() => {
    initializeApp()
  }, [])

  const handleConnectWallet = async () => {
    try {
      setMessageErreur('')

      const metaMask = getMetaMaskProvider()

      if (!metaMask) {
        setMessageErreur("MetaMask n'est pas détecté.")
        return
      }

      await metaMask.request({ method: 'eth_requestAccounts' })

      let currentChainId = await metaMask.request({ method: 'eth_chainId' })
      console.log('Chain ID detecte :', currentChainId)

      if (currentChainId !== '0x539') {
        try {
          await metaMask.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x539' }],
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            await metaMask.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x539',
                  chainName: 'Ganache',
                  rpcUrls: ['http://127.0.0.1:7545'],
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                },
              ],
            })
          } else {
            throw switchError
          }
        }
      }

      const providerInstance = new BrowserProvider(metaMask)
      const network = await providerInstance.getNetwork()
      console.log('Chain ID final :', network.chainId.toString())

      if (network.chainId !== BigInt(EXPECTED_CHAIN_ID)) {
        setMessageErreur(`Merci de vous connecter au réseau ${EXPECTED_NETWORK_NAME}.`)
        return
      }

      const signer = await providerInstance.getSigner()
      const address = await signer.getAddress()

      setWalletAddress(address)
      setEthProvider(providerInstance)

      await fetchCandidates(rpcProvider)
      await fetchCooldown(providerInstance, address)
      setMessageErreur('')
    } catch (error) {
      console.error(error)
      setMessageErreur(
        error?.code === 4001
          ? 'Connexion refusée par l’utilisateur.'
          : `Impossible de connecter le wallet : ${error.message}`
      )
    }
  }

  const handleVote = async (candidateId) => {
    try {
      if (!walletAddress) {
        setMessageErreur("Vous devez d'abord connecter votre wallet.")
        return
      }

      const metaMask = getMetaMaskProvider()

      if (!metaMask) {
        setMessageErreur("MetaMask n'est pas détecté.")
        return
      }

      setLoadingVote(true)
      setMessageErreur('')
      setCurrentTxHash('')
      setConfirmedBlock(null)

      const providerInstance = new BrowserProvider(metaMask)
      const signer = await providerInstance.getSigner()
      const contractWithSigner = new Contract(CONTRACT_ADDRESS, ABI, signer)

      const timeLeft = await contractWithSigner.getTimeUntilNextVote(walletAddress)

      if (Number(timeLeft) > 0) {
        setRemainingTime(Number(timeLeft))
        setLoadingVote(false)
        return
      }

      const transaction = await contractWithSigner.vote(candidateId)
      setCurrentTxHash(transaction.hash)

      const receipt = await transaction.wait()
      setConfirmedBlock(receipt.blockNumber)

      await fetchCandidates(rpcProvider)
      await fetchCooldown(providerInstance, walletAddress)
    } catch (error) {
      console.error(error)
      setMessageErreur(
        error?.code === 4001
          ? 'Transaction annulée.'
          : `Le vote a échoué : ${error.message}`
      )
    } finally {
      setLoadingVote(false)
    }
  }

  useEffect(() => {
    if (remainingTime <= 0) return

    const intervalId = setInterval(() => {
      setRemainingTime((oldValue) => {
        if (oldValue <= 1) return 0
        return oldValue - 1
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [remainingTime])

  useEffect(() => {
    const contract = getReadOnlyContract(rpcProvider)

    const onVoteDetected = async (voter, candidateIndex, timestamp) => {
      try {
        const candidateId = Number(candidateIndex)

        let candidateName = `Candidat #${candidateId}`

        try {
          const candidateData = await contract.getCandidate(candidateId)
          candidateName = candidateData[0]
        } catch (error) {
          console.error(error)
        }

        setRecentVote({
          voter: shortAddress(voter),
          candidate: candidateName,
          timestamp: Number(timestamp),
        })

        await fetchCandidates(rpcProvider)
      } catch (error) {
        console.error(error)
      }
    }

    contract.on('VoteRecorded', onVoteDetected)

    return () => {
      contract.off('VoteRecorded', onVoteDetected)
    }
  }, [])

  const loadVoteHistory = async () => {
    setHistoryLoading(true)

    try {
      const contract = getReadOnlyContract(rpcProvider)
      const events = await contract.queryFilter(contract.filters.VoteRecorded(), -1000)
      const latestEvents = events.slice(-20).reverse()

      const formattedEvents = await Promise.all(
        latestEvents.map(async (event) => {
          const voterAddress = event.args[0]
          const candidateId = Number(event.args[1])
          const eventTimestamp = Number(event.args[2])

          let candidateName = `Candidat #${candidateId}`
          let gasSpent = null

          try {
            const candidateData = await contract.getCandidate(candidateId)
            candidateName = candidateData[0]
          } catch (error) {
            console.error(error)
          }

          try {
            const receipt = await rpcProvider.getTransactionReceipt(event.transactionHash)
            gasSpent = receipt?.gasUsed ? Number(receipt.gasUsed) : null
          } catch (error) {
            console.error(error)
          }

          return {
            hash: event.transactionHash,
            block: event.blockNumber,
            voter: voterAddress,
            candidate: candidateName,
            timestamp: eventTimestamp,
            gasUsed: gasSpent,
          }
        })
      )

      setVoteHistory(formattedEvents)
    } catch (error) {
      console.error(error)
      setVoteHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (historyVisible) {
      loadVoteHistory()
    }
  }, [historyVisible])

  return (
    <div
      style={{
        maxWidth: '950px',
        margin: '0 auto',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>Bureau de vote décentralisé</h1>

      {!walletAddress ? (
        <button onClick={handleConnectWallet}>Se connecter avec MetaMask</button>
      ) : (
        <p>
          Wallet connecté : <strong>{walletAddress}</strong> — réseau{' '}
          <strong>{EXPECTED_NETWORK_NAME}</strong>
        </p>
      )}

      {messageErreur && (
        <p style={{ color: 'red', marginTop: '12px' }}>
          {messageErreur}
        </p>
      )}

      <div
        style={{
          marginTop: '20px',
          marginBottom: '20px',
          padding: '14px',
          borderRadius: '8px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <h2>Temps avant le prochain vote</h2>

        {walletAddress ? (
          remainingTime > 0 ? (
            <p style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {String(Math.floor(remainingTime / 60)).padStart(2, '0')}:
              {String(remainingTime % 60).padStart(2, '0')}
            </p>
          ) : (
            <p>Vous pouvez voter maintenant.</p>
          )
        ) : (
          <p>Connectez votre wallet pour voir votre cooldown.</p>
        )}
      </div>

      {recentVote && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#eefbea',
          }}
        >
          Dernier vote détecté : <strong>{recentVote.voter}</strong> a voté pour{' '}
          <strong>{recentVote.candidate}</strong>
        </div>
      )}

      <h2>Résultats du scrutin</h2>

      {results.length === 0 ? (
        <p>Chargement des candidats...</p>
      ) : (
        results.map((candidate) => (
          <div
            key={candidate.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              marginBottom: '10px',
            }}
          >
            <div>
              <strong>{candidate.name}</strong> — {candidate.votes} vote(s)
            </div>

            {walletAddress && remainingTime === 0 && (
              <button
                onClick={() => handleVote(candidate.id)}
                disabled={loadingVote}
              >
                {loadingVote ? 'Vote en cours...' : 'Voter'}
              </button>
            )}
          </div>
        ))
      )}

      {currentTxHash && (
        <p style={{ marginTop: '16px' }}>
          Transaction envoyée : {currentTxHash}
        </p>
      )}

      {confirmedBlock && (
        <p>
          Transaction confirmée dans le bloc #{confirmedBlock}
        </p>
      )}

      <div style={{ marginTop: '28px' }}>
        <button onClick={() => setHistoryVisible(!historyVisible)}>
          {historyVisible ? 'Fermer l’historique' : 'Afficher l’historique on-chain'}
        </button>

        {historyVisible && (
          <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            {historyLoading ? (
              <p>Chargement de l’historique...</p>
            ) : voteHistory.length === 0 ? (
              <p>Aucun événement trouvé.</p>
            ) : (
              <table
                border="1"
                cellPadding="8"
                style={{ borderCollapse: 'collapse', width: '100%' }}
              >
                <thead>
                  <tr>
                    <th>Hash</th>
                    <th>Bloc</th>
                    <th>Votant</th>
                    <th>Candidat</th>
                    <th>Date</th>
                    <th>Gas</th>
                  </tr>
                </thead>
                <tbody>
                  {voteHistory.map((item, index) => (
                    <tr key={index}>
                      <td>{shortHash(item.hash)}</td>
                      <td>{item.block}</td>
                      <td>{shortAddress(item.voter)}</td>
                      <td>{item.candidate}</td>
                      <td>
                        {item.timestamp
                          ? new Date(item.timestamp * 1000).toLocaleString('fr-FR')
                          : '—'}
                      </td>
                      <td>
                        {item.gasUsed ? item.gasUsed.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App