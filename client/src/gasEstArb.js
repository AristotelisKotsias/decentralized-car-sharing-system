const Web3 = require('web3')
var web3 = new Web3(process.env.ARBITRUM_URL)

async function main() {
  //   web3.eth.net
  //     .isListening()
  //     .then(() => console.log("is connected"))
  //     .catch((e) => console.log("Wow. Something went wrong: " + e));

  //   web3.eth.net.getNetworkType().then(console.log);

  let txHash =
    '0x2b456e79a296ecc0cda2b22c96c9fe1aedbf4d29ada1dfb3f33256a710617ee1'
  web3.eth.getTransactionReceipt(txHash).then(console.log)
}

main()
