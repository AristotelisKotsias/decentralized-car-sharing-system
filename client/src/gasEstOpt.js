const Web3 = require('web3')
var web3 = new Web3(process.env.KOVAN_URL)

async function main() {
  // web3.eth.net
  //   .isListening()
  //   .then(() => console.log("is connected"))
  //   .catch((e) => console.log("Wow. Something went wrong: " + e));

  // web3.eth.net.getNetworkType().then(console.log);

  let txHash =
    '0x5687b6f0c6bf1b8f83a8b186fbc08938fdaf997284a773a75e6acf0815be5776'
  web3.eth.getTransactionReceipt(txHash).then(console.log)
}

main()
