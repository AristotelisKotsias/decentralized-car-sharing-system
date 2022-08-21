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

// async function logic(n) {
//   const carLocation = "cordinates";
//   const reservationTime = "3hrs";
//   const carPlate = "IAK 2134";
//   const bookingDetails = carLocation + " " + reservationTime + " " + carPlate;

//   // 1. Owner first signs the booking details
//   const signedBD = EthCrypto.sign(
//     owner.privateKey,
//     EthCrypto.hash.keccak256(bookingDetails)
//   );

//   const payload = {
//     message: bookingDetails,
//     signature: signedBD,
//   };

//   // 2. Owner generates ATcar with car's public key
//   let ATcar = await EthCrypto.encryptWithPublicKey(
//     car.publicKey,
//     JSON.stringify(payload)
//   );

//   // 3. Owner generates ATrenter with renter's public key
//   const payload2 = {
//     message: bookingDetails,
//     ATcar: ATcar,
//   };

//   const ATrenter = await EthCrypto.encryptWithPublicKey(
//     renter.publicKey,
//     JSON.stringify(payload2)
//   );

//   // Car signs the starting time and sends it to the renter, allows access to the car
//   const d = new Date();
//   const beginTime = 1; //d.getTime(); // time in milliseconds

//   const signedTime = EthCrypto.sign(
//     car.privateKey,
//     EthCrypto.hash.keccak256(beginTime)
//   );

//   // IPFS cid that can be used by the renter to retrieve the booking details
//   let cid = "Qmf4fotCcsB4iqkgLLaGvDxPxFxzmTnBCETHmmVwFJw6bJ";

//   switch (n) {
//     case 1:
//       // --------------------------------------------------------Car and Renter Registration---------------------------------------------------------------------
//       // Service provider signs the car and renter ID
//       const signedCarId = EthCrypto.sign(
//         provider.privateKey,
//         EthCrypto.hash.keccak256(carId)
//       );
//       const renterID = renter.address;
//       const signedRenterID = EthCrypto.sign(
//         provider.privateKey,
//         EthCrypto.hash.keccak256(renterID)
//       );
//       //retrieve v, r, s from signature in order to send them to the smart contract
//       const vrsCarId = EthCrypto.vrs.fromString(signedCarId);
//       const vrsrenterID = EthCrypto.vrs.fromString(signedRenterID);

//       const myData = contract.methods
//         .registerCar(
//           car.address,
//           carId,
//           1,
//           1,
//           EthCrypto.hash.keccak256(carId),
//           vrsCarId.r,
//           vrsCarId.s,
//           vrsCarId.v
//         )
//         .encodeABI();
//       // transaction count
//       const transactionCount = await web3.eth.getTransactionCount(
//         owner.address
//       );
//       // Transaction Object
//       const txObject = {
//         nonce: web3.utils.toHex(transactionCount),
//         to: contractAddress,
//         value: web3.utils.toHex(web3.utils.toWei("0.0001", "ether")),
//         gasLimit: web3.utils.toHex(2100000),
//         gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//         data: myData,
//       };
//       const privateKeyBuffer = Buffer.from(owner.privateKey, "hex");
//       const tx = new Tx.Transaction(txObject, { common: custom_common });
//       tx.sign(privateKeyBuffer);
//       const serializedTx = tx.serialize();
//       const raw = "0x" + serializedTx.toString("hex");
//       // Broadcast the transaction
//       const transaction = await web3.eth.sendSignedTransaction(raw);
//       console.log(transaction);
//       //-----------------------------------------------------------------------

//       const myData1 = contract.methods
//         .registerRenter(
//           EthCrypto.hash.keccak256(renterID),
//           vrsrenterID.r,
//           vrsrenterID.s,
//           vrsrenterID.v
//         )
//         .encodeABI();

//       // transaction count
//       const transactionCount1 = await web3.eth.getTransactionCount(
//         renter.address
//       );
//       // Transaction Object
//       const txObject1 = {
//         nonce: web3.utils.toHex(transactionCount1),
//         to: contractAddress,
//         value: web3.utils.toHex(web3.utils.toWei("0.0001", "ether")),
//         gasLimit: web3.utils.toHex(2100000),
//         gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//         data: myData1,
//       };
//       const privateKeyBuffer1 = Buffer.from(renter.privateKey, "hex");
//       const tx1 = new Tx.Transaction(txObject1, { common: custom_common });

//       tx1.sign(privateKeyBuffer1);

//       const serializedTx1 = tx1.serialize();
//       const raw1 = "0x" + serializedTx1.toString("hex");

//       // Broadcast the transaction
//       const transaction1 = await web3.eth.sendSignedTransaction(raw1);
//       console.log(transaction1);

//       break;
//     case 2:
//       // ------------------------------------------------------Owner stores on chain the access token-----------------------------------------------
//       const myData3 = contract.methods
//         .setAccessToken(carId, cid, renter.address)
//         .encodeABI();

//       // transaction count
//       const transactionCount3 = await web3.eth.getTransactionCount(
//         owner.address
//       );
//       // Transaction Object
//       const txObject3 = {
//         nonce: web3.utils.toHex(transactionCount3),
//         to: contractAddress,
//         value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
//         gasLimit: web3.utils.toHex(2100000),
//         gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//         data: myData3,
//       };
//       const privateKeyBuffer3 = Buffer.from(owner.privateKey, "hex");
//       const tx3 = new Tx.Transaction(txObject3, { common: custom_common });

//       tx3.sign(privateKeyBuffer3);

//       const serializedTx3 = tx3.serialize();
//       const raw3 = "0x" + serializedTx3.toString("hex");

//       // Broadcast the transaction
//       const transaction3 = await web3.eth.sendSignedTransaction(raw3);
//       console.log(transaction3);

//       let fromBCtoken = await contract.methods.getAccessToken(carId).call();
//       console.log(fromBCtoken);

//       // //decrypt access token
//       // const result = EthCrypto.cipher.parse(fromBCtoken);

//       // const decryptedd = await EthCrypto.decryptWithPrivateKey(
//       //     renter.privateKey,
//       //     result
//       // );

//       // const decryptedPayloadd = JSON.parse(decryptedd);
//       // console.log('FROM BC: ', decryptedPayloadd)
//       break;
//     case 3:
//       // --------------------------------------------------------Car functions-------------------------------------------
//       // 1. Car decrypts the ATcar that received from renter through close range communication
//       const ecryptedATcar = EthCrypto.cipher.stringify(ATcar);
//       //console.log(ecryptedATcar)
//       const encrypedObjectcar = EthCrypto.cipher.parse(ecryptedATcar);
//       const decryptedATcar = await EthCrypto.decryptWithPrivateKey(
//         car.privateKey,
//         ATcar
//       );
//       const decryptedPayloadcar = JSON.parse(decryptedATcar);
//       // 2. Car verifies that the owner signed the BD
//       const signerIsOwner = EthCrypto.recover(
//         decryptedPayloadcar.signature, // generated signature
//         EthCrypto.hash.keccak256(decryptedPayloadcar.message) // signed message hash
//       );

//       if (signerIsOwner == owner.address) console.log("Owner signed the BD");
//       else console.log("Owner DIDNT sign the BD");

//       break;
//     case 4:
//       // -----------------------------------------Renter begins booking---------------------
//       // 1. Renter first verifies that car signed the time
//       const signerIsCar = EthCrypto.recover(
//         signedTime, // generated signature
//         EthCrypto.hash.keccak256(beginTime) // signed message hash
//       );

//       const vrsBeginTime = EthCrypto.vrs.fromString(signedTime);

//       if (signerIsCar == car.address) {
//         console.log("Car signed the BD");

//         const myData = contract.methods
//           .beginBooking(
//             EthCrypto.hash.keccak256(beginTime),
//             vrsBeginTime.v,
//             vrsBeginTime.r,
//             vrsBeginTime.s,
//             carId,
//             beginTime
//           )
//           .encodeABI();

//         // transaction count
//         const transactionCount = await web3.eth.getTransactionCount(
//           renter.address
//         );
//         // Transaction Object
//         const txObject = {
//           nonce: web3.utils.toHex(transactionCount),
//           to: contractAddress,
//           value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
//           gasLimit: web3.utils.toHex(2100000),
//           gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//           data: myData,
//         };
//         const privateKeyBuffer = Buffer.from(renter.privateKey, "hex");
//         const tx = new Tx.Transaction(txObject, { common: custom_common });

//         tx.sign(privateKeyBuffer);

//         const serializedTx = tx.serialize();
//         const raw = "0x" + serializedTx.toString("hex");

//         // Broadcast the transaction
//         const transaction = await web3.eth.sendSignedTransaction(raw);
//         console.log(transaction);
//       } else {
//         console.log("Car DIDNT sign the BD");
//       }
//       break;
//     case 5:
//       // -----------------------------------------Owner sets extra time------------------------------------------------------------------------------------------
//       let extraTime = 5; // convert it to time units
//       const myData4 = contract.methods
//         .setExtraTime(carId, extraTime)
//         .encodeABI();

//       // transaction count
//       const transactionCount4 = await web3.eth.getTransactionCount(
//         owner.address
//       );
//       // Transaction Object
//       const txObject4 = {
//         nonce: web3.utils.toHex(transactionCount4),
//         to: contractAddress,
//         value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
//         gasLimit: web3.utils.toHex(2100000),
//         gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//         data: myData4,
//       };
//       const privateKeyBuffer4 = Buffer.from(owner.privateKey, "hex");
//       const tx4 = new Tx.Transaction(txObject4, { common: custom_common });

//       tx4.sign(privateKeyBuffer4);

//       const serializedTx4 = tx4.serialize();
//       const raw4 = "0x" + serializedTx4.toString("hex");

//       // Broadcast the transaction
//       const transaction4 = await web3.eth.sendSignedTransaction(raw4);
//       console.log(transaction4);
//       break;
//     case 6:
//       // -----------------------------------------Renter ends booking------------------------------------------------------------------------------------------
//       // In a normal booking, the renter expresses his desire to end the booking to the car
//       let endTime = 5; //d.getTime(); // time in milliseconds

//       const signedEndTime = EthCrypto.sign(
//         car.privateKey,
//         EthCrypto.hash.keccak256(endTime)
//       );

//       const vrsEndTime = EthCrypto.vrs.fromString(signedEndTime);

//       //Renter ends booking on chain
//       const myData6 = contract.methods
//         .endBooking(
//           carId,
//           endTime,
//           EthCrypto.hash.keccak256(endTime),
//           vrsEndTime.v,
//           vrsEndTime.r,
//           vrsEndTime.s
//         )
//         .encodeABI();

//       // transaction count
//       const transactionCount6 = await web3.eth.getTransactionCount(
//         renter.address
//       );
//       // Transaction Object
//       const txObject6 = {
//         nonce: web3.utils.toHex(transactionCount6),
//         to: contractAddress,
//         value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
//         gasLimit: web3.utils.toHex(2100000),
//         gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//         data: myData6,
//       };
//       const privateKeyBuffer6 = Buffer.from(renter.privateKey, "hex");
//       const tx6 = new Tx.Transaction(txObject6, { common: custom_common });

//       tx6.sign(privateKeyBuffer6);

//       const serializedTx6 = tx6.serialize();
//       const raw6 = "0x" + serializedTx6.toString("hex");

//       // Broadcast the transaction
//       const transaction6 = await web3.eth.sendSignedTransaction(raw6);
//       console.log(transaction6);
//       break;
//     case 7:
//       // -----------------------------------Cancel booking-------------------------------------------------------------------------------------------------------
//       //Renter cancels booking on chain
//       const myData7 = contract.methods.cancelBooking(carId).encodeABI();

//       // transaction count
//       const transactionCount7 = await web3.eth.getTransactionCount(
//         renter.address
//       );
//       // Transaction Object
//       const txObject7 = {
//         nonce: web3.utils.toHex(transactionCount7),
//         to: contractAddress,
//         value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
//         gasLimit: web3.utils.toHex(2100000),
//         gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//         data: myData7,
//       };
//       const privateKeyBuffer7 = Buffer.from(renter.privateKey, "hex");
//       const tx7 = new Tx.Transaction(txObject7, { common: custom_common });

//       tx7.sign(privateKeyBuffer7);

//       const serializedTx7 = tx7.serialize();
//       const raw7 = "0x" + serializedTx7.toString("hex");

//       // Broadcast the transaction
//       const transaction7 = await web3.eth.sendSignedTransaction(raw7);
//       console.log(transaction7);

//       //Owner ends booking on chain
//       // await contract.methods.cancelBooking(carId).send({
//       //   from: owner.address,
//       //   gas: 3000000,
//       // })
//       break;
//     case 8:
//       // --------------------------------Withdraw money------------------------------------------------------------------------------------------------------
//       const myData8 = contract.methods.withdrawMoneyToOwner(carId).encodeABI();

//       // transaction count
//       const transactionCount8 = await web3.eth.getTransactionCount(
//         owner.address
//       );
//       // Transaction Object
//       const txObject8 = {
//         nonce: web3.utils.toHex(transactionCount8),
//         to: contractAddress,
//         value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
//         gasLimit: web3.utils.toHex(2100000),
//         gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//         data: myData8,
//       };
//       const privateKeyBuffer8 = Buffer.from(owner.privateKey, "hex");
//       const tx8 = new Tx.Transaction(txObject8, { common: custom_common });

//       tx8.sign(privateKeyBuffer8);

//       const serializedTx8 = tx8.serialize();
//       const raw8 = "0x" + serializedTx8.toString("hex");

//       // Broadcast the transaction
//       const transaction8 = await web3.eth.sendSignedTransaction(raw8);
//       console.log(transaction8);
//       break;
//     case 9:
//       let money = await contract.methods.getMoney().call();
//       console.log(money);
//       break;
//     case 10:
//       // --------------------------------Withdraw money------------------------------------------------------------------------------------------------------
//       const myData10 = contract.methods.withdrawMoneyToRenter().encodeABI();

//       // transaction count
//       const transactionCount10 = await web3.eth.getTransactionCount(
//         renter.address
//       );
//       // Transaction Object
//       const txObject10 = {
//         nonce: web3.utils.toHex(transactionCount10),
//         to: contractAddress,
//         value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
//         gasLimit: web3.utils.toHex(2100000),
//         gasPrice: web3.utils.toHex(web3.utils.toWei("100", "gwei")),
//         data: myData10,
//       };
//       const privateKeyBuffer10 = Buffer.from(renter.privateKey, "hex");
//       const tx10 = new Tx.Transaction(txObject10, { common: custom_common });

//       tx10.sign(privateKeyBuffer10);

//       const serializedTx10 = tx10.serialize();
//       const raw10 = "0x" + serializedTx10.toString("hex");

//       // Broadcast the transaction
//       const transaction10 = await web3.eth.sendSignedTransaction(raw10);
//       console.log(transaction10);
//       break;
//     default:
//       console.log("No case selected");
//   }
// }

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
      let fromBCtokenn = await contract.methods.getCarOwner(carId).call();
      console.log("OWNER IS", fromBCtokenn);
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
