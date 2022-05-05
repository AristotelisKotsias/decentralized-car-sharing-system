const CarGo = artifacts.require("../CarGo.sol");

contract("CarGo", () => {
  it("should update data", async () => {
    const cargo = await CarGo.new();
  });
});
