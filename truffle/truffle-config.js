require('dotenv').config({ path: '../.env' })
//var path = require('path')
//const config = require('../configs/config')
var HDWalletProvider = require('truffle-hdwallet-provider')

module.exports = {
  // change build location because react doesn't allow imports outside of src
  contracts_build_directory: '../client/src/abi',

  // list of networks
  networks: {
    ganache: {
      host: '127.0.0.1',
      port: 7545, // local ganache
      network_id: '*',
    },

    // rinkeby testnet
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(
          (privateKeys = process.env.PROVIDER_PKEY),
          process.env.RINKEBY_URL,
          //config.rinkeby.url,
        )
      },
      network_id: 4,
      gas: 4500000,
      gasPrice: 104930817622,
    },

    // arbitrum rinkeby testnet
    arbitrum: {
      provider: function () {
        return new HDWalletProvider(
          (privateKeys = process.env.PROVIDER_PKEY),
          process.env.ARBITRUM_URL,
          //config.arbitrum.url,
        )
      },
      network_id: 421611,
    },
  },

  mocha: {
    // https://github.com/cgewecke/eth-gas-reporter
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'EUR',
      gasPrice: 10,
      //coinmarketcap: "d95b9953-dadf-4136-93b0-f7bd310ecb7a",
      showTimeSpent: true,
      excludeContracts: ['Migrations'],
    },
  },

  // Configure compilers
  compilers: {
    solc: {
      version: '0.8.9',
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
}
