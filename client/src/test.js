require("dotenv").config({ path: "../../.env" });
const EthCrypto = require("eth-crypto");
const Web3 = require("web3");
let web3 = new Web3("http://127.0.0.1:7545");
const prompt = require("prompt-async");

const { abi } = require("./abi/CarGo.json");
const contractAddress = "0x914A3D9e47B2b6e013180823126ddf1B3E697DFc";
const contract = new web3.eth.Contract(abi, contractAddress);
const provider = {};
const owner = {};
const renter = {};
const car = {};

// web3.eth.net
//   .isListening()
//   .then(() => console.log('is connected'))
//   .catch((e) => console.log('Wow. Something went wrong: ' + e))

// web3.eth.net.getNetworkType().then(console.log)

provider.privateKey = process.env.GANACHE_PROVIDER_PKEY;
provider.publicKey = EthCrypto.publicKeyByPrivateKey(provider.privateKey);
provider.address = EthCrypto.publicKey.toAddress(provider.publicKey);

owner.privateKey = process.env.GANACHE_OWNER_PKEY;
owner.publicKey = EthCrypto.publicKeyByPrivateKey(owner.privateKey);
owner.address = EthCrypto.publicKey.toAddress(owner.publicKey);

renter.privateKey = process.env.GANACHE_RENTER_PKEY;
renter.publicKey = EthCrypto.publicKeyByPrivateKey(renter.privateKey);
renter.address = EthCrypto.publicKey.toAddress(renter.publicKey);

car.privateKey = process.env.CAR_PKEY;
car.publicKey = EthCrypto.publicKeyByPrivateKey(car.privateKey);
car.address = EthCrypto.publicKey.toAddress(car.publicKey);

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

function signDocument(privateKey, document) {
  return EthCrypto.sign(privateKey, EthCrypto.hash.keccak256(document));
}

function encryptDocument(publicKey, payload) {
  return EthCrypto.encryptWithPublicKey(publicKey, JSON.stringify(payload));
}

async function decryptDocument(privateKey, payload) {
  return JSON.parse(await EthCrypto.decryptWithPrivateKey(privateKey, payload));
}

// 3. Car signs the starting time and sends it to the renter, allows access to the car
// const beginTime = Math.round(Date.now() / 1000) // time in milliseconds

// const signedTime = EthCrypto.sign(
//   car.privateKey,
//   EthCrypto.hash.keccak256(beginTime),
// )

var seconds;
var carId = new Date().getTime(); // unique id for each car
var vrsCarId;
var vrsrenterID;
var ATcar;
var ATrenter;
var signedTime;

// ATrenter cid that is used to retrieve it from IPFS
let cid = "QmQL6Tb4bTEvAbm8fNbAeeUk9X7MYmae4APShqHNhd3A5c";

async function usersRegistration() {
  const signedCarId = signDocument(provider.privateKey, carId); // string
  //retrieve v, r, s from signature in order to send them to the smart contract
  vrsCarId = EthCrypto.vrs.fromString(signedCarId);
  await contract.methods
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
    .send({
      from: owner.address,
      value: "1000000000000000000", // 1 ether
      gas: 3000000,
    });

  const renterID = renter.address;
  const signedRenterID = signDocument(provider.privateKey, renterID);
  vrsrenterID = EthCrypto.vrs.fromString(signedRenterID);

  await contract.methods
    .registerRenter(
      EthCrypto.hash.keccak256(renterID),
      vrsrenterID.r,
      vrsrenterID.s,
      vrsrenterID.v
    )
    .send({
      from: renter.address,
      value: "1000000000000000000", // 1 ether
      gas: 3000000,
    });
}

async function generateAccessToken() {
  // 1. Owner first signs the booking details
  const signedBD = signDocument(owner.privateKey, bookingDetails);
  const payload = {
    message: bookingDetails,
    signature: signedBD,
  };

  // 2. Owner generates ATcar with car's public key
  ATcar = await encryptDocument(car.publicKey, payload);

  // 3. Owner generates ATrenter with renter's public key
  const payload2 = {
    message: bookingDetails,
    ATcar: ATcar,
  };
  ATrenter = await encryptDocument(renter.publicKey, payload2);
  //console.log(ATrenter);
  var maxRentingTime = 3 * 24 * 60 * 60; // This is an example (3 days)
  await contract.methods
    .setAccessToken(carId, cid, renter.address, maxRentingTime)
    .send({
      from: owner.address,
      gas: 3000000,
    });

  //console.log('ATrenter is: ', ATrenter)
  //let fromBCtoken = await contract.methods.getAccessToken(carId).call();
  //console.log(fromBCtoken);
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
  console.log("seconds is: ", seconds);
  signedTime = signDocument(car.privateKey, seconds);

  const signerIsCar = EthCrypto.recover(
    signedTime, // generated signature
    EthCrypto.hash.keccak256(seconds) // signed message hash
  );

  const vrsBeginTime = EthCrypto.vrs.fromString(signedTime);

  if (signerIsCar === car.address) {
    console.log("Car signed the begin time");

    await contract.methods
      .beginBooking(
        EthCrypto.hash.keccak256(seconds),
        vrsBeginTime.v,
        vrsBeginTime.r,
        vrsBeginTime.s,
        carId,
        seconds
      )
      .send({
        from: renter.address,
        gas: 3000000,
      });
  } else {
    console.log("Car DIDNT sign the begin time");
  }
}

async function extraTime() {
  let extraTime = 1; // convert it to time units
  await contract.methods.setExtraTime(carId, extraTime).send({
    from: renter.address,
    gas: 3000000,
  });
}

async function endBooking() {
  seconds = Math.round(Date.now() / 1000);
  //The car signes the end time
  const signedEndTime = signDocument(car.privateKey, seconds);
  const vrsEndTime = EthCrypto.vrs.fromString(signedEndTime);

  //Renter ends booking on chain
  await contract.methods
    .endBooking(
      carId,
      seconds,
      EthCrypto.hash.keccak256(seconds),
      vrsEndTime.v,
      vrsEndTime.r,
      vrsEndTime.s
    )
    .send({
      from: renter.address,
      gas: 3000000,
    });
}

async function cancelBooking() {
  //Renter cancels booking on chain
  await contract.methods.cancelBooking(carId).send({
    from: renter.address,
    gas: 3000000,
  });
}

async function withdrawMoney() {
  //Owner withdraws money from contract
  await contract.methods.withdrawMoneyToOwner(carId).send({
    from: owner.address,
    gas: 300000,
  });

  //Renter withdraws money from contract
  await contract.methods.withdrawMoneyToRenter().send({
    from: renter.address,
    gas: 300000,
  });
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
    } else break;
  }
}

async function error_handling_async() {
  try {
    console.log(
      "Chose: \n 1 for car registration \n 2 for AT generation \n 3 for car functions" +
        "\n 4 for begin booking \n 5 for setting extra time \n 6 for ending the booking \n 7 for cancelling the booking \n 8 for withdrawing funds"
    );
    await main_async();
  } catch (error) {
    console.error("An error occurred: ", error);
  }
}

error_handling_async();
