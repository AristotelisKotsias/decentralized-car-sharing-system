const Web3 = require('web3')
var web3 = new Web3(process.env.KOVAN_URL)

async function main() {
  // web3.eth.net
  //   .isListening()
  //   .then(() => console.log("is connected"))
  //   .catch((e) => console.log("Wow. Something went wrong: " + e));

  // web3.eth.net.getNetworkType().then(console.log);

  let txHash =
    '0xca7dae4256de0ac79b9aeec24dc8316fc7172910c34f3159dfd570a16c9c2416'
  web3.eth.getTransactionReceipt(txHash).then(console.log)
}

main()
