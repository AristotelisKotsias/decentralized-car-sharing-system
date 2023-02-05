require("dotenv").config({ path: "../../.env" });
var Tx = require("ethereumjs-tx");
var _Common = require("ethereumjs-common");
const EthCrypto = require("eth-crypto");
const Web3 = require("web3");
let web3 = new Web3(process.env.ARBITRUM_URL);
const prompt = require("prompt-async");

const { abi } = require("./abi/CarGo.json");
const contractAddress = "0xb314B2417C9f32B292A89528b647B95DBCcbD072";
const contract = new web3.eth.Contract(abi, contractAddress);
const provider = {};
const owner = {};
const renter = {};
const car = {};

provider.privateKey = process.env.PROVIDER_PKEY;
provider.publicKey = EthCrypto.publicKeyByPrivateKey(provider.privateKey);
provider.address = EthCrypto.publicKey.toAddress(provider.publicKey);

owner.privateKey = process.env.OWNER_PKEY;
owner.publicKey = EthCrypto.publicKeyByPrivateKey(owner.privateKey);
owner.address = EthCrypto.publicKey.toAddress(owner.publicKey);

renter.privateKey = process.env.RENTER_PKEY;
renter.publicKey = EthCrypto.publicKeyByPrivateKey(renter.privateKey);
renter.address = EthCrypto.publicKey.toAddress(renter.publicKey);

car.privateKey = process.env.CAR_PKEY;
car.publicKey = EthCrypto.publicKeyByPrivateKey(car.privateKey);
car.address = EthCrypto.publicKey.toAddress(car.publicKey);

const Common = _Common.default;
const custom_common = Common.forCustomChain(
  "mainnet",
  {
    name: "arbitrum_rinkeby",
    networkId: 421611,
    chainId: 421611,
  },
  "petersburg"
);

const carLocation = "cordinates";
const carPlate = "IAK 2134";
const carModel = "Toyota";
const pricePerMinute = "$0.0001";
const extraTimeCharge = "$0.001";
const bookingDetails =
  carLocation +
  " " +
  carPlate +
  " " +
  carModel +
  " " +
  pricePerMinute +
  " " +
  extraTimeCharge;
var seconds;
var carId = new Date().getTime(); // unique id for each car
var vrsCarId;
var vrsrenterID;
var ATcar;
var ATrenter;
var signedTime;
var myData;
var myData1;
//ATrenter cid that is used to retrieve it from IPFS
let cid = "QmQL6Tb4bTEvAbm8fNbAeeUk9X7MYmae4APShqHNhd3A5c";

function signDocument(privateKey, document) {
  return EthCrypto.sign(privateKey, EthCrypto.hash.keccak256(document));
}

function encryptDocument(publicKey, payload) {
  return EthCrypto.encryptWithPublicKey(publicKey, JSON.stringify(payload));
}

async function decryptDocument(privateKey, payload) {
  return JSON.parse(await EthCrypto.decryptWithPrivateKey(privateKey, payload));
}

async function buildTransaction(address, myData, key, payable) {
  // transaction count
  console.log("KEY", key);
  const transactionCount = await web3.eth.getTransactionCount(address);
  // Transaction Object
  var txObject;
  if (payable) {
    txObject = {
      nonce: web3.utils.toHex(transactionCount),
      to: contractAddress,
      value: web3.utils.toHex(web3.utils.toWei("0.0001", "ether")),
      gasLimit: web3.utils.toHex(2100000),
      gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
      data: myData,
    };
  } else {
    txObject = {
      nonce: web3.utils.toHex(transactionCount),
      to: contractAddress,
      value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
      gasLimit: web3.utils.toHex(2100000),
      gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
      data: myData,
    };
  }
  const privateKeyBuffer = Buffer.from(key, "hex");
  const tx = new Tx.Transaction(txObject, { common: custom_common });
  tx.sign(privateKeyBuffer);
  const serializedTx = tx.serialize();
  const raw = "0x" + serializedTx.toString("hex");
  // Broadcast the transaction
  const transaction = await web3.eth.sendSignedTransaction(raw);
  console.log("Transaction receipt \n", transaction);
}

async function usersRegistration() {
  const signedCarId = signDocument(provider.privateKey, carId);
  vrsCarId = EthCrypto.vrs.fromString(signedCarId);
  // console.log(transaction);
  myData = contract.methods
    .registerCar(
      car.address,
      carId,
      1,
      1,
      EthCrypto.hash.keccak256(carId),
      vrsCarId.r,
      vrsCarId.s,
      vrsCarId.v
    )
    .encodeABI();

  buildTransaction(owner.address, myData, owner.privateKey, true);

  var renterID = renter.address;
  var signedRenterID = signDocument(provider.privateKey, renterID);
  var vrsrenterID = EthCrypto.vrs.fromString(signedRenterID);
  myData1 = contract.methods
    .registerRenter(
      EthCrypto.hash.keccak256(renterID),
      vrsrenterID.r,
      vrsrenterID.s,
      vrsrenterID.v
    )
    .encodeABI();
  buildTransaction(renter.address, myData1, renter.privateKey, true);
}

async function generateAccessToken() {
  const signedBD = signDocument(owner.privateKey, bookingDetails);
  const payload = {
    message: bookingDetails,
    signature: signedBD,
  };
  ATcar = await encryptDocument(car.publicKey, payload);
  const payload2 = {
    message: bookingDetails,
    ATcar: ATcar,
  };
  ATrenter = await encryptDocument(renter.publicKey, payload2);
  var maxRentingTime = 3 * 24 * 60 * 60; // This is an example (3 days)
  var myData = contract.methods
    .setAccessToken(carId, cid, renter.address, maxRentingTime)
    .encodeABI();

  buildTransaction(owner.address, myData, owner.privateKey, false);
}

async function carFunctions() {
  // 1. Car decrypts the ATcar that received from renter through close range communication
  console.log("ATcar is: ", ATcar);
  const decryptedPayloadcar = await decryptDocument(car.privateKey, ATcar);
  // 2. Car verifies that the owner signed the BD
  const signerIsOwner = EthCrypto.recover(
    decryptedPayloadcar.signature, // generated signature
    EthCrypto.hash.keccak256(decryptedPayloadcar.message) // signed message hash
  );

  if (signerIsOwner === owner.address) console.log("Owner signed the BD");
  else console.log("Owner DIDNT sign the BD");
}

async function initBooking() {
  // 1. Renter first verifies that the car signed the time
  seconds = Math.round(Date.now() / 1000);
  signedTime = signDocument(car.privateKey, seconds);

  const signerIsCar = EthCrypto.recover(
    signedTime, // generated signature
    EthCrypto.hash.keccak256(seconds) // signed message hash
  );

  const vrsBeginTime = EthCrypto.vrs.fromString(signedTime);

  if (signerIsCar === car.address) {
    console.log("Car signed the begin time");

    var myData = contract.methods
      .beginBooking(
        EthCrypto.hash.keccak256(seconds),
        vrsBeginTime.v,
        vrsBeginTime.r,
        vrsBeginTime.s,
        carId,
        seconds
      )
      .encodeABI();
    buildTransaction(renter.address, myData, renter.privateKey, false);
  } else {
    console.log("Car DIDNT sign the begin time");
  }
}

async function extraTime() {
  let extraTime = 1;
  var myData = contract.methods.setExtraTime(carId, extraTime).encodeABI();

  buildTransaction(renter.address, myData, renter.privateKey, false);
}

async function endBooking() {
  seconds = Math.round(Date.now() / 1000);
  //The car signes the end time
  const signedEndTime = signDocument(car.privateKey, seconds);
  const vrsEndTime = EthCrypto.vrs.fromString(signedEndTime);

  //Renter ends booking on chain
  const myData = contract.methods
    .endBooking(
      carId,
      seconds,
      EthCrypto.hash.keccak256(seconds),
      vrsEndTime.v,
      vrsEndTime.r,
      vrsEndTime.s
    )
    .encodeABI();
  buildTransaction(renter.address, myData, renter.privateKey, false);
}

async function cancelBooking() {
  //Renter cancels booking on chain
  var myData = contract.methods.cancelBooking(carId).encodeABI();
  buildTransaction(renter.address, myData, renter.privateKey, false);
}

async function withdrawMoney() {
  //Owner withdraws money from contract
  var myDataOwner = contract.methods.withdrawMoneyToOwner(carId).encodeABI();
  buildTransaction(owner.address, myDataOwner, owner.privateKey, false);

  //Renter withdraws money from contract
  const myDataRenter = contract.methods.withdrawMoneyToRenter().encodeABI();
  buildTransaction(renter.address, myDataRenter, renter.privateKey, false);
}

async function main_async() {
  prompt.start();
  while (true) {
    const { option } = await prompt.get(["option"]);

    if (option === "1") {
      usersRegistration();
    } else if (option === "2") {
      generateAccessToken();
    } else if (option === "3") {
      carFunctions();
    } else if (option === "4") {
      initBooking();
    } else if (option === "5") {
      extraTime();
    } else if (option === "6") {
      endBooking();
    } else if (option === "7") {
      cancelBooking();
    } else if (option === "8") {
      withdrawMoney();
    } else {
      continue;
    }
  }
}

async function error_handling_async() {
  try {
    console.log(
      "Chose: \n 1 for registration \n 2 for AT generation \n 3 for car functions" +
        "\n 4 for begin booking \n 5 for setting extra time \n 6 for ending the booking \n 7 for cancelling the booking \n 8 for withdrawing funds"
    );
    await main_async();
  } catch (error) {
    console.error("An error occurred: ", error);
  }
}

error_handling_async();