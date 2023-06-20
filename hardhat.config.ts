require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.9",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [
        `0x632f0b6c7c10c06ae0ecd933a9d87decf0a0c13b7d883400bbf92cfed501215a`
      ]
    }
  },
  paths: {
    artifacts: "./src/artifacts",
  }
}
