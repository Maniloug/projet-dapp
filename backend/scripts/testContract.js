import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const factory = await ethers.getContractFactory("VotePresidentiel");
  const contract = await factory.deploy();

  await contract.waitForDeployment();

  console.log("Adresse du contrat :", await contract.getAddress());

  const count = await contract.getCandidatesCount();
  console.log("Nombre de candidats :", count.toString());

  const candidate0 = await contract.getCandidate(0);
  console.log("Candidat 0 avant vote :", candidate0);

  const tx = await contract.vote(0);
  await tx.wait();

  const updatedCandidate0 = await contract.getCandidate(0);
  console.log("Candidat 0 apres vote :", updatedCandidate0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});