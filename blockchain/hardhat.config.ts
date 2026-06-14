import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '';
const POLYGON_RPC_URL      = process.env.POLYGON_RPC_URL ?? '';
const AMOY_RPC_URL         = process.env.AMOY_RPC_URL ?? '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // Blockchain locale en mémoire — pour les tests (gratuit, instantané)
    hardhat: {},

    // Polygon Amoy — testnet officiel (gratuit, MATIC de test)
    amoy: {
      url: AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 80002,
    },

    // Polygon Mainnet — production (coûte de vrais MATIC)
    polygon: {
      url: POLYGON_RPC_URL || 'https://polygon-rpc.com',
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 137,
    },
  },

  paths: {
    sources:   './contracts',
    tests:     './test',
    cache:     './cache',
    artifacts: './artifacts',
  },
};

export default config;
