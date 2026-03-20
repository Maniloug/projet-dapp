import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default defineConfig({
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "paris"
    }
  },
  plugins: [hardhatToolboxMochaEthers],
  networks: {
    ganache: {
      type: "http",
      url: "http://127.0.0.1:7545",
    },
  },
});