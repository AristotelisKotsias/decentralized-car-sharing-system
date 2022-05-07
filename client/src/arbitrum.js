require('dotenv').config({ path: '../../.env' })
var Tx = require('ethereumjs-tx')
var _Common = require('ethereumjs-common')
const EthCrypto = require('eth-crypto')
const Web3 = require('web3')
let web3 = new Web3(process.env.ARBITRUM_URL)
const { abi } = require('./abi/CarGo.json')
const contractAddress = '0x767d342f22B85c50a7041CC77b25943348145d12'
const contract = new web3.eth.Contract(abi, contractAddress)
const provider = {}
const owner = {}
const renter = {}
const car = {}
const carId = '123'

provider.privateKey = process.env.PROVIDER_PKEY
provider.publicKey = EthCrypto.publicKeyByPrivateKey(provider.privateKey)
provider.address = EthCrypto.publicKey.toAddress(provider.publicKey)

owner.privateKey = process.env.OWNER_PKEY
owner.publicKey = EthCrypto.publicKeyByPrivateKey(owner.privateKey)
owner.address = EthCrypto.publicKey.toAddress(owner.publicKey)

renter.privateKey = process.env.RENTER_PKEY
renter.publicKey = EthCrypto.publicKeyByPrivateKey(renter.privateKey)
renter.address = EthCrypto.publicKey.toAddress(renter.publicKey)

car.privateKey = process.env.CAR_PKEY
car.publicKey = EthCrypto.publicKeyByPrivateKey(car.privateKey)
car.address = EthCrypto.publicKey.toAddress(car.publicKey)

const Common = _Common.default
const custom_common = Common.forCustomChain(
  'mainnet',
  {
    name: 'arbitrum_rinkeby',
    networkId: 421611,
    chainId: 421611,
  },
  'petersburg',
)

//print owner's and renter's private/public keys
//console.table([owner, renter, provider, car])

async function logic(n) {
  const carLocation = 'cordinates'
  const reservationTime = '3hrs'
  const carPlate = 'IAK 2134'
  const bookingDetails = carLocation + ' ' + reservationTime + ' ' + carPlate

  // 1. Owner first signs the booking details
  const signedBD = EthCrypto.sign(
    owner.privateKey,
    EthCrypto.hash.keccak256(bookingDetails),
  )

  const payload = {
    message: bookingDetails,
    signature: signedBD,
  }

  // 2. Owner generates ATcar with car's public key
  let ATcar = await EthCrypto.encryptWithPublicKey(
    car.publicKey,
    JSON.stringify(payload),
  )

  // 3. Owner generates ATrenter with renter's public key
  const payload2 = {
    message: bookingDetails,
    ATcar: ATcar,
  }

  const ATrenter = await EthCrypto.encryptWithPublicKey(
    renter.publicKey,
    JSON.stringify(payload2),
  )

  // Car signs the starting time and sends it to the renter, allows access to the car
  const d = new Date()
  const beginTime = 1 //d.getTime(); // time in milliseconds

  const signedTime = EthCrypto.sign(
    car.privateKey,
    EthCrypto.hash.keccak256(beginTime),
  )

  let cid = 'QmQL6Tb4bTEvAbm8fNbAeeUk9X7MYmae4APShqHNhd3A5c'

  switch (n) {
    case 1:
      // --------------------------------------------------------Car and Renter Registration---------------------------------------------------------------------
      // Service provider signs the car and renter ID
      const signedCarId = EthCrypto.sign(
        provider.privateKey,
        EthCrypto.hash.keccak256(carId),
      )
      const renterID = renter.address
      const signedRenterID = EthCrypto.sign(
        provider.privateKey,
        EthCrypto.hash.keccak256(renterID),
      )
      //retrieve v, r, s from signature in order to send them to the smart contract
      const vrsCarId = EthCrypto.vrs.fromString(signedCarId)
      const vrsrenterID = EthCrypto.vrs.fromString(signedRenterID)

      const myData = contract.methods
        .registerCar(
          car.address,
          carId,
          0.00001,
          0.00001,
          EthCrypto.hash.keccak256(carId),
          vrsCarId.r,
          vrsCarId.s,
          vrsCarId.v,
        )
        .encodeABI()
      // transaction count
      const transactionCount = await web3.eth.getTransactionCount(owner.address)
      // Transaction Object
      const txObject = {
        nonce: web3.utils.toHex(transactionCount),
        to: contractAddress,
        value: web3.utils.toHex(web3.utils.toWei('0.0001', 'ether')),
        gasLimit: web3.utils.toHex(2100000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
        data: myData,
      }
      const privateKeyBuffer = Buffer.from(owner.privateKey, 'hex')
      const tx = new Tx.Transaction(txObject, { common: custom_common })
      tx.sign(privateKeyBuffer)
      const serializedTx = tx.serialize()
      const raw = '0x' + serializedTx.toString('hex')
      // Broadcast the transaction
      const transaction = await web3.eth.sendSignedTransaction(raw)
      console.log(transaction)
      //-----------------------------------------------------------------------

      const myData1 = contract.methods
        .registerRenter(
          EthCrypto.hash.keccak256(renterID),
          vrsrenterID.r,
          vrsrenterID.s,
          vrsrenterID.v,
        )
        .encodeABI()

      // transaction count
      const transactionCount1 = await web3.eth.getTransactionCount(
        renter.address,
      )
      // Transaction Object
      const txObject1 = {
        nonce: web3.utils.toHex(transactionCount1),
        to: contractAddress,
        value: web3.utils.toHex(web3.utils.toWei('0.0001', 'ether')),
        gasLimit: web3.utils.toHex(2100000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
        data: myData1,
      }
      const privateKeyBuffer1 = Buffer.from(renter.privateKey, 'hex')
      const tx1 = new Tx.Transaction(txObject1, { common: custom_common })

      tx1.sign(privateKeyBuffer1)

      const serializedTx1 = tx1.serialize()
      const raw1 = '0x' + serializedTx1.toString('hex')

      // Broadcast the transaction
      const transaction1 = await web3.eth.sendSignedTransaction(raw1)
      console.log(transaction1)

      break
    case 2:
      // ------------------------------------------------------Owner stores on chain the access token-----------------------------------------------
      const myData3 = contract.methods
        .setAccessToken(carId, cid, renter.address)
        .encodeABI()

      // transaction count
      const transactionCount3 = await web3.eth.getTransactionCount(
        owner.address,
      )
      // Transaction Object
      const txObject3 = {
        nonce: web3.utils.toHex(transactionCount3),
        to: contractAddress,
        value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
        gasLimit: web3.utils.toHex(2100000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
        data: myData3,
      }
      const privateKeyBuffer3 = Buffer.from(owner.privateKey, 'hex')
      const tx3 = new Tx.Transaction(txObject3, { common: custom_common })

      tx3.sign(privateKeyBuffer3)

      const serializedTx3 = tx3.serialize()
      const raw3 = '0x' + serializedTx3.toString('hex')

      // Broadcast the transaction
      const transaction3 = await web3.eth.sendSignedTransaction(raw3)
      console.log(transaction3)

      let fromBCtoken = await contract.methods.getAccessToken(carId).call()
      console.log(fromBCtoken)

      // //decrypt access token
      // const result = EthCrypto.cipher.parse(fromBCtoken);

      // const decryptedd = await EthCrypto.decryptWithPrivateKey(
      //     renter.privateKey,
      //     result
      // );

      // const decryptedPayloadd = JSON.parse(decryptedd);
      // console.log('FROM BC: ', decryptedPayloadd)
      break
    case 3:
      // --------------------------------------------------------Car functions-------------------------------------------
      // 1. Car decrypts the ATcar that received from renter through close range communication
      const ecryptedATcar = EthCrypto.cipher.stringify(ATcar)
      //console.log(ecryptedATcar)
      const encrypedObjectcar = EthCrypto.cipher.parse(ecryptedATcar)
      const decryptedATcar = await EthCrypto.decryptWithPrivateKey(
        car.privateKey,
        ATcar,
      )
      const decryptedPayloadcar = JSON.parse(decryptedATcar)
      // 2. Car verifies that the owner signed the BD
      const signerIsOwner = EthCrypto.recover(
        decryptedPayloadcar.signature, // generated signature
        EthCrypto.hash.keccak256(decryptedPayloadcar.message), // signed message hash
      )

      if (signerIsOwner == owner.address) console.log('Owner signed the BD')
      else console.log('Owner DIDNT sign the BD')

      break
    case 4:
      // -----------------------------------------Renter begins booking---------------------
      // 1. Renter first verifies that car signed the time
      const signerIsCar = EthCrypto.recover(
        signedTime, // generated signature
        EthCrypto.hash.keccak256(beginTime), // signed message hash
      )

      const vrsBeginTime = EthCrypto.vrs.fromString(signedTime)

      if (signerIsCar == car.address) {
        console.log('Car signed the BD')

        const myData = contract.methods
          .beginBooking(
            EthCrypto.hash.keccak256(beginTime),
            vrsBeginTime.v,
            vrsBeginTime.r,
            vrsBeginTime.s,
            carId,
            beginTime,
          )
          .encodeABI()

        // transaction count
        const transactionCount = await web3.eth.getTransactionCount(
          renter.address,
        )
        // Transaction Object
        const txObject = {
          nonce: web3.utils.toHex(transactionCount),
          to: contractAddress,
          value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
          gasLimit: web3.utils.toHex(2100000),
          gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
          data: myData,
        }
        const privateKeyBuffer = Buffer.from(renter.privateKey, 'hex')
        const tx = new Tx.Transaction(txObject, { common: custom_common })

        tx.sign(privateKeyBuffer)

        const serializedTx = tx.serialize()
        const raw = '0x' + serializedTx.toString('hex')

        // Broadcast the transaction
        const transaction = await web3.eth.sendSignedTransaction(raw)
        console.log(transaction)
      } else {
        console.log('Car DIDNT sign the BD')
      }
      break
    case 5:
      // -----------------------------------------Owner sets extra time------------------------------------------------------------------------------------------
      let extraTime = 5 // convert it to time units
      const myData4 = contract.methods
        .setExtraTime(carId, extraTime)
        .encodeABI()

      // transaction count
      const transactionCount4 = await web3.eth.getTransactionCount(
        owner.address,
      )
      // Transaction Object
      const txObject4 = {
        nonce: web3.utils.toHex(transactionCount4),
        to: contractAddress,
        value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
        gasLimit: web3.utils.toHex(2100000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
        data: myData4,
      }
      const privateKeyBuffer4 = Buffer.from(owner.privateKey, 'hex')
      const tx4 = new Tx.Transaction(txObject4, { common: custom_common })

      tx4.sign(privateKeyBuffer4)

      const serializedTx4 = tx4.serialize()
      const raw4 = '0x' + serializedTx4.toString('hex')

      // Broadcast the transaction
      const transaction4 = await web3.eth.sendSignedTransaction(raw4)
      console.log(transaction4)
      break
    case 6:
      // -----------------------------------------Renter ends booking------------------------------------------------------------------------------------------
      // In a normal booking, the renter expresses his desire to end the booking to the car
      let endTime = 5 //d.getTime(); // time in milliseconds

      const signedEndTime = EthCrypto.sign(
        car.privateKey,
        EthCrypto.hash.keccak256(endTime),
      )

      const vrsEndTime = EthCrypto.vrs.fromString(signedEndTime)

      //Renter ends booking on chain
      const myData6 = contract.methods
        .endBooking(
          carId,
          0,
          EthCrypto.hash.keccak256(endTime),
          vrsEndTime.v,
          vrsEndTime.r,
          vrsEndTime.s,
        )
        .encodeABI()

      // transaction count
      const transactionCount6 = await web3.eth.getTransactionCount(
        renter.address,
      )
      // Transaction Object
      const txObject6 = {
        nonce: web3.utils.toHex(transactionCount6),
        to: contractAddress,
        value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
        gasLimit: web3.utils.toHex(2100000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
        data: myData6,
      }
      const privateKeyBuffer6 = Buffer.from(renter.privateKey, 'hex')
      const tx6 = new Tx.Transaction(txObject6, { common: custom_common })

      tx6.sign(privateKeyBuffer6)

      const serializedTx6 = tx6.serialize()
      const raw6 = '0x' + serializedTx6.toString('hex')

      // Broadcast the transaction
      const transaction6 = await web3.eth.sendSignedTransaction(raw6)
      console.log(transaction6)
      break
    case 7:
      // -----------------------------------Cancel booking-------------------------------------------------------------------------------------------------------
      //Renter cancels booking on chain
      const myData7 = contract.methods.cancelBooking(carId).encodeABI()

      // transaction count
      const transactionCount7 = await web3.eth.getTransactionCount(
        renter.address,
      )
      // Transaction Object
      const txObject7 = {
        nonce: web3.utils.toHex(transactionCount7),
        to: contractAddress,
        value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
        gasLimit: web3.utils.toHex(2100000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
        data: myData7,
      }
      const privateKeyBuffer7 = Buffer.from(renter.privateKey, 'hex')
      const tx7 = new Tx.Transaction(txObject7, { common: custom_common })

      tx7.sign(privateKeyBuffer7)

      const serializedTx7 = tx7.serialize()
      const raw7 = '0x' + serializedTx7.toString('hex')

      // Broadcast the transaction
      const transaction7 = await web3.eth.sendSignedTransaction(raw7)
      console.log(transaction7)

      //Owner ends booking on chain
      // await contract.methods.cancelBooking(carId).send({
      //   from: owner.address,
      //   gas: 3000000,
      // })
      break
    case 8:
      // --------------------------------Withdraw money------------------------------------------------------------------------------------------------------
      const myData8 = contract.methods.withdrawMoneyToOwner(carId).encodeABI()

      // transaction count
      const transactionCount8 = await web3.eth.getTransactionCount(
        owner.address,
      )
      // Transaction Object
      const txObject8 = {
        nonce: web3.utils.toHex(transactionCount8),
        to: contractAddress,
        value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
        gasLimit: web3.utils.toHex(2100000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
        data: myData8,
      }
      const privateKeyBuffer8 = Buffer.from(owner.privateKey, 'hex')
      const tx8 = new Tx.Transaction(txObject8, { common: custom_common })

      tx8.sign(privateKeyBuffer8)

      const serializedTx8 = tx8.serialize()
      const raw8 = '0x' + serializedTx8.toString('hex')

      // Broadcast the transaction
      const transaction8 = await web3.eth.sendSignedTransaction(raw8)
      console.log(transaction8)
      break
    case 9:
      let money = await contract.methods.getMoney().call()
      console.log(money)
      break
    default:
      console.log('No case selected')
  }
}

async function main() {
  /* 1: registration
   * 2: access token generation
   * 3: car functions
   * 4: begin booking
   * 5: set extra time
   * 6: end booking
   * 7: cancel booking
   * 8: withdraw
   * 9: getters
   */
  logic(8).catch(console.error)
}
main().catch(console.error)
