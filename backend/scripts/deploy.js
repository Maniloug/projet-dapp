import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect("ganache");

  const factory = await ethers.getContractFactory("VotePresidentiel");
  const contract = await factory.deploy();

  await contract.waitForDeployment();

  console.log("Contrat deploye a :", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});