const Web3 = require('web3')
var web3 = new Web3(process.env.RINKEBY_URL)

async function main() {
  // web3.eth.net
  //   .isListening()
  //   .then(() => console.log("is connected"))
  //   .catch((e) => console.log("Wow. Something went wrong: " + e));

  // web3.eth.net.getNetworkType().then(console.log);

  let txHash =
    '0x9439bb0b1e0ecf3ffc98983825a670e13b73a92c0e4c6e57bf0917326dce40c7'
  web3.eth.getTransactionReceipt(txHash).then(console.log)
}

main()
