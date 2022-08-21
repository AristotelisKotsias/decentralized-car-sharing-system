// require("dotenv").config({ path: "../../.env" });
// const EthCrypto = require("eth-crypto");
// //const ecies = require('eth-ecies')
// const Web3 = require("web3");
// let web3 = new Web3("http://127.0.0.1:7545");

// const { abi } = require("./abi/CarGo.json");
// const contractAddress = "0xeAEB8f3188E835d5fBc3cBB1BCeeA57609960ae3";
// const contract = new web3.eth.Contract(abi, contractAddress);
// const provider = {};
// const owner = {};
// const renter = {};
// const car = {};
// const carId = new Date().getTime(); // unique id for each car

// // web3.eth.net
// //   .isListening()
// //   .then(() => console.log('is connected'))
// //   .catch((e) => console.log('Wow. Something went wrong: ' + e))

// // web3.eth.net.getNetworkType().then(console.log)

// provider.privateKey = process.env.GANACHE_PROVIDER_PKEY;
// provider.publicKey = EthCrypto.publicKeyByPrivateKey(provider.privateKey);
// provider.address = EthCrypto.publicKey.toAddress(provider.publicKey);

// owner.privateKey = process.env.GANACHE_OWNER_PKEY;
// owner.publicKey = EthCrypto.publicKeyByPrivateKey(owner.privateKey);
// owner.address = EthCrypto.publicKey.toAddress(owner.publicKey);

// renter.privateKey = process.env.GANACHE_RENTER_PKEY;
// renter.publicKey = EthCrypto.publicKeyByPrivateKey(renter.privateKey);
// renter.address = EthCrypto.publicKey.toAddress(renter.publicKey);

// car.privateKey = process.env.CAR_PKEY;
// car.publicKey = EthCrypto.publicKeyByPrivateKey(car.privateKey);
// car.address = EthCrypto.publicKey.toAddress(car.publicKey);

// //print owner's and renter's private/public keys
// //console.table([owner, renter, provider, car])

// async function logic(n) {
//   //Owner signs the booking details
//   //const hashedCertRenter = "hashed"
//   const carLocation = "cordinates";
//   const carPlate = "IAK 2134";
//   const carModel = "Toyota";
//   const pricePerMinute = "$0.0001";
//   const extraTime = "$0.001";
//   const bookingDetails =
//     carLocation +
//     " " +
//     carPlate +
//     " " +
//     carModel +
//     " " +
//     pricePerMinute +
//     " " +
//     extraTime;

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
//   console.log(ATrenter);
//   // 3. Car signs the starting time and sends it to the renter, allows access to the car
//   const d = new Date();
//   const beginTime = 1; // = Math.round(Date.now() / 1000) // time in milliseconds

//   const signedTime = EthCrypto.sign(
//     car.privateKey,
//     EthCrypto.hash.keccak256(beginTime)
//   );

//   const seconds = Math.round(Date.now() / 1000);

//   // ATrenter cid that is used to retrieve it from IPFS
//   let cid = "QmQL6Tb4bTEvAbm8fNbAeeUk9X7MYmae4APShqHNhd3A5c";

//   switch (n) {
//     case 1:
//       // --------------------------------------------------------Car and Renter Registration---------------------------------------------------------------------
//       // Service provider signs the car and renter ID
//       const signedCarId = EthCrypto.sign(
//         provider.privateKey,
//         EthCrypto.hash.keccak256(carId)
//       );
//       //retrieve v, r, s from signature in order to send them to the smart contract
//       const vrsCarId = EthCrypto.vrs.fromString(signedCarId);

//       await contract.methods
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
//         .send({
//           from: owner.address,
//           value: "1000000000000000000", // 1 ether
//           gas: 3000000,
//         });

//       const renterID = renter.address;
//       const signedRenterID = EthCrypto.sign(
//         provider.privateKey,
//         EthCrypto.hash.keccak256(renterID)
//       );
//       const vrsrenterID = EthCrypto.vrs.fromString(signedRenterID);
//       await contract.methods
//         .registerRenter(
//           EthCrypto.hash.keccak256(renterID),
//           vrsrenterID.r,
//           vrsrenterID.s,
//           vrsrenterID.v
//         )
//         .send({
//           from: renter.address,
//           value: "1000000000000000000", // 1 ether
//           gas: 3000000,
//         });
//       break;
//     case 2:
//       // ------------------------------------------------------Owner stores on chain the access token-----------------------------------------------
//       await contract.methods
//         .setAccessToken(carId, cid, renter.address, 10)
//         .send({
//           from: owner.address,
//           gas: 3000000,
//         });

//       // //console.log('ATrenter is: ', ATrenter)
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
//       // const ecryptedATcar = EthCrypto.cipher.stringify(ATcar)
//       // console.log(ecryptedATcar)
//       // const encrypedObjectcar = EthCrypto.cipher.parse(ecryptedATcar)

//       const decryptedATcar = await EthCrypto.decryptWithPrivateKey(
//         car.privateKey,
//         ATcar
//       );
//       const decryptedPayloadcar = JSON.parse(decryptedATcar);
//       //   // console.log('ATcar message is: ', decryptedPayloadcar.message)
//       //   // console.log('ATcar signature is: ', decryptedPayloadcar.signature)
//       //   // console.log('ATcar hash of BD is: ', EthCrypto.hash.keccak256(bookingDetails))

//       // 2. Car verifies that the owner signed the BD
//       const signerIsOwner = EthCrypto.recover(
//         decryptedPayloadcar.signature, // generated signature
//         EthCrypto.hash.keccak256(decryptedPayloadcar.message) // signed message hash
//       );

//       if (signerIsOwner === owner.address) console.log("Owner signed the BD");
//       else console.log("Owner DIDNT sign the BD");

//       break;
//     case 4:
//       // -----------------------------------------Renter begins booking------------
//       // 1. Renter first verifies that car signed the time
//       const signerIsCar = EthCrypto.recover(
//         signedTime, // generated signature
//         EthCrypto.hash.keccak256(beginTime) // signed message hash
//       );

//       const vrsBeginTime = EthCrypto.vrs.fromString(signedTime);

//       if (signerIsCar == car.address) {
//         console.log("Car signed the begin time");

//         await contract.methods
//           .beginBooking(
//             EthCrypto.hash.keccak256(beginTime),
//             vrsBeginTime.v,
//             vrsBeginTime.r,
//             vrsBeginTime.s,
//             carId,
//             beginTime
//           )
//           .send({
//             from: renter.address,
//             gas: 3000000,
//           });
//       } else {
//         console.log("Car DIDNT sign the begin time");
//       }
//       break;
//     case 5:
//       // -----------------------------------------Owner sets extra time------------------------------------------------------------------------------------------
//       let extraTime = 1; // convert it to time units
//       await contract.methods.setExtraTime(carId, extraTime).send({
//         from: owner.address,
//         gas: 3000000,
//       });
//       break;
//     case 6:
//       // -----------------------------------------Renter ends booking------------------------------------------------------------------------------------------
//       // In a normal booking, the renter expresses his desire to end the booking to the car
//       let endTime = 5; //= Math.round(Date.now() / 1000) // time in secs

//       const signedEndTime = EthCrypto.sign(
//         car.privateKey,
//         EthCrypto.hash.keccak256(endTime)
//       );

//       const vrsEndTime = EthCrypto.vrs.fromString(signedEndTime);

//       //Renter ends booking on chain
//       await contract.methods
//         .endBooking(
//           carId,
//           endTime,
//           EthCrypto.hash.keccak256(endTime),
//           vrsEndTime.v,
//           vrsEndTime.r,
//           vrsEndTime.s
//         )
//         .send({
//           from: renter.address,
//           gas: 3000000,
//         });
//       break;
//     case 7:
//       // -----------------------------------Cancel booking-------------------------------------------------------------------------------------------------------
//       //Renter cancels booking on chain
//       await contract.methods.cancelBooking(carId).send({
//         from: owner.address,
//         gas: 3000000,
//       });

//       //Owner ends booking on chain
//       // await contract.methods.cancelBooking(carId).send({
//       //   from: owner.address,
//       //   gas: 3000000,
//       // })
//       break;
//     case 8:
//       // --------------------------------Withdraw money------------------------------------------------------------------------------------------------------
//       await contract.methods.withdrawMoneyToOwner(carId).send({
//         from: owner.address,
//         gas: 300000,
//       });
//       break;
//     case 9:
//       var time = await contract.methods.getTime(carId).call();
//       console.log(time);
//       break;
//     case 10:
//       await contract.methods.withdrawMoneyToRenter().send({
//         from: renter.address,
//         gas: 300000,
//       });
//       break;
//     default:
//       console.log("No case selected");
//   }
// }

// async function main() {
//   /* 1: registration
//    * 2: access token generation
//    * 3: car functions
//    * 4: begin booking
//    * 5: set extra time
//    * 6: end booking
//    * 7: cancel booking
//    * 8: withdraw
//    */
//   logic(10).catch(console.error);
// }
// main().catch(console.error);
