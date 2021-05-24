import { expect } from "chai";
import { USDC } from "../src/token";
import { initOwnerAndUSDC, owner, POSITION, venusloop } from "./test-base";

describe("VenusLoop Emergency Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  it("owner able to call step by step", async () => {
    await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
    expect(await USDC().methods.balanceOf(venusloop.options.address)).eq(POSITION);

    await venusloop.methods._deposit(100).send({ from: owner });
    await venusloop.methods._borrow(50).send({ from: owner });
    await venusloop.methods._repay(50).send({ from: owner });
    await venusloop.methods._withdraw(100).send({ from: owner });
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.eq(POSITION);
  });

  it("withdrawAllUSDCToOwner", async () => {
    await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
    await venusloop.methods.withdrawAllUSDCToOwner().send({ from: owner });
    expect(await USDC().methods.balanceOf(owner).call()).bignumber.eq(POSITION);
  });

  it("emergency function call", async () => {
    await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });

    const encoded = USDC().methods.transfer(owner, POSITION).encodeABI();
    await venusloop.methods.emergencyFunctionCall(USDC().options.address, encoded).send({ from: owner });

    const venusLoopBalance = await USDC().methods.balanceOf(venusloop.options.address).call();
    console.log("USDC venusLoopBalance", venusLoopBalance);
    expect(venusLoopBalance).bignumber.zero;

    const ownerBalance = await USDC().methods.balanceOf(owner).call();
    console.log("USDC ownerBalance", ownerBalance);
    expect(ownerBalance).bignumber.eq(POSITION);
  });

  it.skip("emergency function delegate call", async () => {
    // upload a temp contract to use as lib (extension)
    await USDC().methods.transfer(venusloop.options.address, 1000).send({ from: owner });
    const encoded = USDC().methods.transfer(owner, 1000).encodeABI();
    await venusloop.methods.emergencyFunctionDelegateCall(USDC().options.address, encoded).send({ from: owner });
  });

  //
  // it("exit position one by one manually", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
  //
  //   await venusloop.methods.enterPosition(5).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   await venusloop.methods._withdraw(bn6("1,638,000")).send({ from: owner });
  //   await venusloop.methods._repay(bn6("1,638,000")).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   await venusloop.methods._withdraw(bn6("2,048,000")).send({ from: owner });
  //   await venusloop.methods._repay(bn6("2,048,000")).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   await venusloop.methods._withdraw(bn6("2,560,000")).send({ from: owner });
  //   await venusloop.methods._repay(bn6("2,560,000")).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   await venusloop.methods._withdraw(bn6("3,200,000")).send({ from: owner });
  //   await venusloop.methods._repay(bn6("3,200,000")).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   await venusloop.methods._withdraw(bn6("4,000,000")).send({ from: owner });
  //   await venusloop.methods._repay(bn6("4,000,000")).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   await venusloop.methods._withdraw(bn6("1,000")).send({ from: owner });
  //   await venusloop.methods._repay(bn6("1,000")).send({ from: owner });
  //
  //   await venusloop.methods._withdraw(max).send({ from: owner });
  //
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.greaterThan(POSITION);
  //
  //   await expectOutOfPosition();
  // });
});
