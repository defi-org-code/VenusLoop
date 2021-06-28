import { HardhatUserConfig } from "hardhat/types";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-tracer";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-etherscan";
import { task } from "hardhat/config";
import { askAddress, bn18, bscChainId, deploy } from "@defi.org/web3-candies";

task("deploy").setAction(async () => {
  const name = "VenusLoop";
  const owner = await askAddress("owner address 0x");
  const gasLimit = 2_000_000;

  await deploy(name, [owner], gasLimit, 0, false);
});

function configFile() {
  return require("./.config.json");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: "https://bsc-dataseed4.binance.org",
      },
      blockGasLimit: 12e6,
      accounts: {
        accountsBalance: bn18("1,000,000").toString(),
      },
    },
    bsc: {
      chainId: bscChainId,
      url: "https://bsc-dataseed4.binance.org",
    },
  },
  typechain: {
    outDir: "typechain-hardhat",
    target: "web3-v1",
  },
  mocha: {
    timeout: 500_000,
    retries: 0,
    bail: true,
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: configFile().coinmarketcapKey,
    showTimeSpent: true,
  },
  etherscan: {
    apiKey: configFile().etherscanKey,
  },
};
export default config;
