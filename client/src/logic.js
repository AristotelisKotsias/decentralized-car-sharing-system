const config = require("../../configs/config");

var input = process.argv[2];
var url;
// if (input == "rinkeby") {
//   url = config.rinkeby.url;
//   var contractAddress = require("../../build/addresses/rinkeby.json")[
//     "contract_address"
//   ];
// } else if (input == "arbitrum") {
//   var contractAddress = require("../../build/addresses/arbitrum.json")[
//     "contract_address"
//   ];
//   url = config.arbitrum.url;
// } else {
//   url = config.ganache.url;
//   var contractAddress = require("../../build/addresses/ganache.json")[
//     "contract_address"
//   ];
// }

console.log();

const EthCrypto = require("eth-crypto");
const ecies = require("eth-ecies");
const Web3 = require("web3");
//var web3 = new Web3(url);
var web3 = new Web3("http://127.0.0.1:7545");

const { abi } = require("./abi/CarGo.json");
const contractAddress = "0xfc70d13587F99551c8F7921Edf2dfBB1d3c29069";
const contract = new web3.eth.Contract(abi, contractAddress);

async function main() {
  web3.eth.net
    .isListening()
    .then(() => console.log("is connected"))
    .catch((e) => console.log("Wow. Something went wrong: " + e));

  web3.eth.net.getNetworkType().then(console.log);

  console.log("\n");

  // ------------------------------------------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------Initialize-------------------------------------------------------------------------------------------
  const provider = {};
  provider.privateKey =
    "8fefaefe41e93d685a25d90f6825ac3d4272e731dcf85ecfbd12fb505926b3cd";
  provider.publicKey = EthCrypto.publicKeyByPrivateKey(provider.privateKey);
  //console.log(owner.publicKey + "\n")
  provider.address = EthCrypto.publicKey.toAddress(provider.publicKey);
  //console.log(provider.address + "\n")

  const owner = {};
  owner.privateKey =
    "fadf248e4a51552699882302cd9ca195f9868d08f69b839bbeca0f2ae3a646de";
  owner.publicKey = EthCrypto.publicKeyByPrivateKey(owner.privateKey);
  //console.log(owner.publicKey + "\n")
  owner.address = EthCrypto.publicKey.toAddress(owner.publicKey);
  //console.log(owner.address + "\n")

  const renter = {};
  renter.privateKey =
    "f9811c29d1a9ec8b4f949fef8034f50c2a6009ef7add5341a8ba6473f881785a";
  renter.publicKey = EthCrypto.publicKeyByPrivateKey(renter.privateKey);
  renter.address = EthCrypto.publicKey.toAddress(renter.publicKey);

  const car = {};
  car.privateKey =
    "a8680d89d0f96f040a239666db2a1bd05fb8d53738f5fd0738272d2f640c8ed9";
  car.publicKey = EthCrypto.publicKeyByPrivateKey(car.privateKey);
  car.address = EthCrypto.publicKey.toAddress(car.publicKey);

  // print owner's and renter's private/public keys
  console.table([owner, renter, provider, car])
  // --------------------------------------------------------------------------------------------------------------------------------------------------------

  // --------------------------------------------------------Car and Renter Registration-----------------------------------------------------------------------
  // Service provider signs the car and renter ID
  const carId = "123";
  const signedCarId = EthCrypto.sign(
    provider.privateKey,
    EthCrypto.hash.keccak256(carId)
  );
  //retrieve v, r, s from signature in order to send them to the smart contract
  const vrsCarId = EthCrypto.vrs.fromString(signedCarId);

  await contract.methods
    .registerCar(
      car.address,
      carId,
      2,
      100000000000000,
      EthCrypto.hash.keccak256(carId),
      vrsCarId.r,
      vrsCarId.s,
      vrsCarId.v
    )
    .send({
      from: owner.address,
      value: "100000000000000000",
      gas: 3000000,
    });

  const renterID = renter.address;
  const signedRenterID = EthCrypto.sign(
    provider.privateKey,
    EthCrypto.hash.keccak256(renterID)
  );
  const vrsrenterID = EthCrypto.vrs.fromString(signedRenterID);
  await contract.methods
    .registerRenter(
      EthCrypto.hash.keccak256(renterID),
      vrsrenterID.r,
      vrsrenterID.s,
      vrsrenterID.v
    )
    .send({
      from: renter.address,
      value: "100000000000000",
      gas: 3000000,
    });

  // --------------------------------------------------------------------------------------------------------------------------------------------------------

  // ------------------------------------------------------Access Token generation--------------------------------------------------------------------------
  // Owner signs the booking details
  const carLocation = "cordinates";
  const reservationTime = "3hrs";
  const carPlate = "IAK 2134";
  const bookingDetails = carLocation + " " + reservationTime + " " + carPlate;

  // 1. Owner first signs the booking details
  const signedBD = EthCrypto.sign(
    owner.privateKey,
    EthCrypto.hash.keccak256(bookingDetails)
  );

  const payload = {
    message: bookingDetails,
    signature: signedBD,
  };

  // 2. Owner generates ATcar with car's public key
  const ATcar = await EthCrypto.encryptWithPublicKey(
    car.publicKey,
    JSON.stringify(payload)
  );

  // reduce the length of the encrypted data
  //const encryptedATcar = EthCrypto.cipher.stringify(ATcar);
  //console.log("ALL", ATcar)
  //console.log("CIPHER", encryptedATcar)

  // 3. Owner generates ATrenter with renter's public key
  const payload2 = {
    message: bookingDetails,
    ATcar: ATcar,
    //ATcar: encryptedATcar
  };

  const ATrenter = await EthCrypto.encryptWithPublicKey(
    renter.publicKey,
    JSON.stringify(payload2)
  );

  //console.log(ATrenter);

  // reduce length
  //const encryptedATrenter = EthCrypto.cipher.stringify(ATrenter);

  // 4. Owner stores ATrenter to the blockchain
  // let a = JSON.stringify(ATrenter)

  let cid = "QmQL6Tb4bTEvAbm8fNbAeeUk9X7MYmae4APShqHNhd3A5c";

  // await contract.methods.setAccessToken(carId, cid, renter.address).send({
  //   from: owner.address,
  //   gas: 3000000,
  // });

  // //console.log('ATrenter is: ', ATrenter)
  let fromBCtoken = await contract.methods.getAccessToken(carId).call();
  console.log(fromBCtoken);

  // //decrypt access token
  // const result = EthCrypto.cipher.parse(fromBCtoken);

  // const decryptedd = await EthCrypto.decryptWithPrivateKey(
  //     renter.privateKey,
  //     result
  // );

  // const decryptedPayloadd = JSON.parse(decryptedd);
  // console.log('FROM BC: ', decryptedPayloadd)

  // --------------------------------------------------------------------------------------------------------------------------------------------------------

  // --------------------------------------------------------Car functions-----------------------------------------------------------------------------------
  // 1. Car decrypts the ATcar that received from renter through close range communication
  const ecryptedATcar = EthCrypto.cipher.stringify(ATcar);
  const encrypedObjectcar = EthCrypto.cipher.parse(ecryptedATcar);
  const decryptedATcar = await EthCrypto.decryptWithPrivateKey(
    car.privateKey,
    encrypedObjectcar
  );
  const decryptedPayloadcar = JSON.parse(decryptedATcar);
  // console.log('ATcar message is: ', decryptedPayloadcar.message)
  // console.log('ATcar signature is: ', decryptedPayloadcar.signature)
  // console.log('ATcar hash of BD is: ', EthCrypto.hash.keccak256(bookingDetails))

  // 2. Car verifies that the owner signed the BD
  const signerIsOwner = EthCrypto.recover(
    decryptedPayloadcar.signature, // generated signature
    EthCrypto.hash.keccak256(decryptedPayloadcar.message) // signed message hash
  );

  if (signerIsOwner == owner.address) console.log("Owner signed the BD");
  else console.log("Owner DIDNT sign the BD");

  // 3. Car signs the starting time and sends it to the renter, allows access to the car
  const d = new Date();
  let beginTime = 5; //d.getTime(); // time in milliseconds

  const signedTime = EthCrypto.sign(
    car.privateKey,
    EthCrypto.hash.keccak256(beginTime)
  );

  // --------------------------------------------------------------------------------------------------------------------------------------------------------------

  // -----------------------------------------Renter saves starting time on smart contract-----------------------------------------------------------------------------------
  // 1. Renter first verifies that car signed the time
  // const signerIsCar = EthCrypto.recover(
  //   signedTime, // generated signature
  //   EthCrypto.hash.keccak256(beginTime) // signed message hash
  // );

  // const vrsBeginTime = EthCrypto.vrs.fromString(signedTime);

  // if (signerIsCar == car.address) {
  //   console.log("Car signed the BD");
  //   // await contract.methods.storeBeginTime(carId,time).send({
  //   //     from: owner.address,
  //   //     gas:3000000
  //   // })
  //   await contract.methods
  //     .beginBooking(
  //       EthCrypto.hash.keccak256(beginTime),
  //       vrsBeginTime.v,
  //       vrsBeginTime.r,
  //       vrsBeginTime.s,
  //       carId,
  //       beginTime
  //     )
  //     .send({
  //       from: renter.address,
  //       gas: 3000000,
  //     });
  // } else {
  //   console.log("Car DIDNT sign the BD");
  // }

  // --------------------------------------------------------------------------------------------------------------------------------------------------------

  // -----------------------------------------Owner sets extra time------------------------------------------------------------------------------------------
  let extraTime = 5; // convert it to time units
  // await contract.methods.setExtraTime(carId, extraTime).send({
  //   from: owner.address,
  //   gas: 3000000,
  // });

  // --------------------------------------------------------------------------------------------------------------------------------------------------------

  // -----------------------------------------Renter ends booking------------------------------------------------------------------------------------------
  // In a normal booking, the renter expresses his desire to end the booking to the car
  // let endTime = 1; //d.getTime(); // time in milliseconds

  // const signedEndTime = EthCrypto.sign(
  //   car.privateKey,
  //   EthCrypto.hash.keccak256(endTime)
  // );

  // const vrsEndTime = EthCrypto.vrs.fromString(signedEndTime);

  // //Renter ends booking on chain
  // await contract.methods
  //   .endBooking(
  //     carId,
  //     0,
  //     EthCrypto.hash.keccak256(endTime),
  //     vrsEndTime.v,
  //     vrsEndTime.r,
  //     vrsEndTime.s
  //   )
  //   .send({
  //     from: renter.address,
  //     gas: 3000000,
  //   });

  // -----------------------------------Cancel booking-------------------------------------------------------------------------------------------------------
  // //Renter cancels booking on chain
  // await contract.methods.cancelBooking(carId).send({
  //   from: renter.address,
  //   gas: 3000000,
  // });

  //Owner ends booking on chain
  // await contract.methods.cancelBooking(carId).send({
  //   from: owner.address,
  //   gas: 3000000,
  // });

  // --------------------------------Withdraw money------------------------------------------------------------------------------------------------------

  await contract.methods.withdrawMoneyToOwner(carId).send({
    from: owner.address,
    gas: 300000,
  });

  // --------------------------------------------------------------------------------------------------------------------------------------------------------

  /*
   * DECRYPTION (used for testing)
   */
  // const encryptedString = EthCrypto.cipher.stringify(ATrenter)
  // const encrypedObject = EthCrypto.cipher.parse(encryptedString)
  // const decrypted = await EthCrypto.decryptWithPrivateKey(
  //     renter.privateKey,
  //     encrypedObject
  // )

  // const decryptedPayload = JSON.parse(decrypted)
  /* const senderAddress = EthCrypto.recover(
        decryptedPayload.signature,
        EthCrypto.hash.keccak256(payload2.message)
    )*/
  //console.log("\n")
  //console.log('ATrenter contains: ', decryptedPayload.message)
}

main().catch(console.error);
