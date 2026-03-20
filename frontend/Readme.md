Présentation

Ce projet consiste à développer une application web en React (Vite) permettant d’interagir avec un smart contract Ethereum déployé sur le réseau Sepolia.

L’application simule une élection où chaque utilisateur peut :

consulter les résultats directement depuis la blockchain

connecter son wallet avec MetaMask

voter pour un candidat

respecter un délai entre deux votes

suivre les transactions effectuées

Le tout fonctionne en interaction directe avec la blockchain, sans backend classique.

Technologies utilisées

React + Vite

Ethers.js

MetaMask

Réseau Ethereum Sepolia

Lancer le projet
unzip starter.zip
cd starter
npm install
npm run dev

Puis ouvrir dans le navigateur :

http://localhost:5173
Connexion MetaMask

Pour utiliser toutes les fonctionnalités :

Installer MetaMask

Activer les réseaux de test

Choisir Sepolia

Ajouter de l’ETH de test (via faucet)

Fonctionnement de l’application
Affichage des résultats

Les candidats et leurs votes sont récupérés via le smart contract grâce à des fonctions en lecture.

Aucun wallet n’est requis pour cette partie.

Connexion du wallet

L’utilisateur se connecte avec MetaMask via :

eth_requestAccounts

Une vérification est faite pour s’assurer que l’utilisateur est bien sur le réseau Sepolia.

Système de vote

Lorsqu’un utilisateur vote :

une transaction est signée via MetaMask

elle est envoyée à la blockchain

on attend la confirmation (wait())

Le hash de la transaction et le bloc de confirmation sont affichés.

Gestion du cooldown

Après chaque vote :

un délai est imposé avant de pouvoir revoter

ce délai est géré par le smart contract

le frontend affiche un compte à rebours dynamique

⚡ Mise à jour en temps réel

L’application écoute l’événement :

Voted(address voter, uint256 candidateIndex)

Cela permet :

de mettre à jour automatiquement les résultats

d’afficher le dernier vote effectué

Historique des votes

Une section permet d’afficher les derniers votes enregistrés sur la blockchain :

On retrouve :

le hash de la transaction

le numéro du bloc

l’adresse du votant

le candidat choisi

la date

le gas utilisé

Structure du projet
src/
├── App.jsx        → composant principal
├── abi.json       → interface du smart contract
├── config.js      → configuration (adresse + réseau)
Questions importantes
Pourquoi peut-on voir les résultats sans MetaMask ?

Parce que la blockchain est publique.
Les fonctions en lecture (view) ne nécessitent ni signature ni connexion.

Est-ce qu’on peut voter avec l’adresse de quelqu’un d’autre ?

Non.
Il faut signer avec la clé privée, et seule MetaMask permet ça.

Qui gère la limite de temps entre deux votes ?

Le smart contract.
Le frontend affiche juste l’information.

Pourquoi ne pas utiliser l’heure du navigateur ?

Parce qu’elle peut être modifiée.
La blockchain utilise block.timestamp, qui est fiable.

Pourquoi enlever les listeners (off) ?

Pour éviter :

les appels multiples

les bugs

les fuites mémoire

Pourquoi la blockchain est sécurisée ?

Chaque bloc dépend du précédent (hash).
Modifier un bloc casserait toute la chaîne.

 Conclusion

Ce projet permet de comprendre concrètement :

comment interagir avec un smart contract

la différence entre lecture et écriture on-chain

l’importance de la signature

le fonctionnement des événements blockchain

la transparence des données
