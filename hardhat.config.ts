require("@nomiclabs/hardhat-waffle");

const {signers_addr} = require('./secrets/accounts')
const {signers_privkey} = require('./secrets/accounts')

module.exports = {
  solidity: "0.8.9",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: signers_privkey
    }
  },
  paths: {
    artifacts: "./src/artifacts",
  }
}
