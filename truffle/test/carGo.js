//before()	The before function runs before the testing begins and it can be used to set the adequate variables to be used in each test.
//contract()	It works as describe() in mocha, and it names and groups a set of tests under a common group. It includes a block of it() functions.
//it()	It includes single units of tests, focused on testing specific aspects in a contract.
const CarGo = artifacts.require('../CarGo.sol')
let cargo

// contract("CarGo", () => {
//   it("should update data", async () => {
//     const cargo = await CarGo.new();
//   });
// });

before(async () => {
  cargo = await CarGo.new()
})

contract('CarGo Tests', function (accounts) {
  it('has an owner equal to deployed address', async () => {
    await cargo.registerCar({ from: accounts[1], value: String() })
  })
})
