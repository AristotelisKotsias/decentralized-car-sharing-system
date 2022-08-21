require("dotenv").config({ path: "../../.env" });
const EthCrypto = require("eth-crypto");
const Web3 = require("web3");
let web3 = new Web3("http://127.0.0.1:7545");

const { abi } = require("./abi/CarGo.json");
const contractAddress = "0x19dc92e25a21F4d6eAc32A8029c86Dde4851b67b";
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
const extraTime = "$0.001";
const bookingDetails =
  carLocation +
  " " +
  carPlate +
  " " +
  carModel +
  " " +
  pricePerMinute +
  " " +
  extraTime;

function signDocument(privateKey, document) {
  return EthCrypto.sign(privateKey, EthCrypto.hash.keccak256(document));
}

function encryptDocument(publicKey, payload) {
  return EthCrypto.encryptWithPublicKey(publicKey, JSON.stringify(payload));
}

function decryptDocument(privateKey, payload) {
  return JSON.parse(EthCrypto.decryptWithPrivateKey(privateKey, payload));
}

// 3. Car signs the starting time and sends it to the renter, allows access to the car
// const beginTime = Math.round(Date.now() / 1000) // time in milliseconds

// const signedTime = EthCrypto.sign(
//   car.privateKey,
//   EthCrypto.hash.keccak256(beginTime),
// )

var seconds = Math.round(Date.now() / 1000);
var carId = "1"; //new Date().getTime() // unique id for each car
var vrsCarId;
var vrsrenterID;
var ATcar;
var ATrenter;

// ATrenter cid that is used to retrieve it from IPFS
let cid = "QmQL6Tb4bTEvAbm8fNbAeeUk9X7MYmae4APShqHNhd3A5c";

async function usersRegistration() {
  carId = "2";
  const signedCarId = signDocument(provider.privateKey, carId); // string
  //retrieve v, r, s from signature in order to send them to the smart contract
  vrsCarId = EthCrypto.vrs.fromString(signedCarId);
  console.log("HELLO", cid);

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
  console.log(ATrenter);
  var maxRentingTime = 3 * 24 * 60 * 60; // This is an example (3 days)
  await contract.methods
    .setAccessToken(carId, cid, renter.address, maxRentingTime)
    .send({
      from: owner.address,
      gas: 3000000,
    });

  //console.log('ATrenter is: ', ATrenter)
  let fromBCtoken = await contract.methods.getAccessToken(carId).call();
  console.log(fromBCtoken);
}

async function carFunctions() {
  // --------------------------------------------------------Car functions-------------------------------------------
  // 1. Car decrypts the ATcar that received from renter through close range communication
  // const ecryptedATcar = EthCrypto.cipher.stringify(ATcar)
  // console.log(ecryptedATcar)
  // const encrypedObjectcar = EthCrypto.cipher.parse(ecryptedATcar)

  const decryptedATcar = await EthCrypto.decryptWithPrivateKey(
    car.privateKey,
    ATcar
  );
  const decryptedPayloadcar = JSON.parse(decryptedATcar);
  //   // console.log('ATcar message is: ', decryptedPayloadcar.message)
  //   // console.log('ATcar signature is: ', decryptedPayloadcar.signature)
  //   // console.log('ATcar hash of BD is: ', EthCrypto.hash.keccak256(bookingDetails))

  // 2. Car verifies that the owner signed the BD
  const signerIsOwner = EthCrypto.recover(
    decryptedPayloadcar.signature, // generated signature
    EthCrypto.hash.keccak256(decryptedPayloadcar.message) // signed message hash
  );

  if (signerIsOwner === owner.address) console.log("Owner signed the BD");
  else console.log("Owner DIDNT sign the BD");
}

const prompt = require("prompt-async");

async function example_async() {
  // Available only with `prompt-async`!
  // Start the prompt.
  prompt.start();

  // Get two properties from the user: the `username` and `email`.
  while (true) {
    const { option } = await prompt.get(["option"]);

    if (option === "1") {
      usersRegistration();
    } else if (option === "2") {
      generateAccessToken();
    } else if (option === "3") {
      carFunctions();
    }
    // Log the results.
    // console.log("Command-line input received: ");
    // console.log(`  username: ${option},`);
  }
}

async function error_handling_async() {
  try {
    console.log(
      "Chose: \n 1 for car registration \n 2 for AT generation \n 3 for car functions"
    );
    await example_async();
  } catch (error) {
    console.error("An error occurred: ", error);
  }
}

error_handling_async();
