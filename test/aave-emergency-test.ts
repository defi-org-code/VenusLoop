import { expect } from "chai";
import { USDC } from "../src/token";
import { initOwnerAndUSDC, owner, POSITION, venusloop } from "./test-base";
import { contract } from "../src/extensions";

describe("AaveLoop Emergency Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  // it("owner able to call step by step", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
  //
  //   await venusloop.methods._deposit(100).send({ from: owner });
  //   await venusloop.methods._borrow(50).send({ from: owner });
  //   await venusloop.methods._repay(50).send({ from: owner });
  //   await venusloop.methods._withdraw(100).send({ from: owner });
  //
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.eq(POSITION);
  // });
  //
  // it("withdrawAllUSDCToOwner", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
  //   await venusloop.methods.withdrawAllUSDCToOwner().send({ from: owner });
  //   expect(await USDC().methods.balanceOf(owner).call()).bignumber.eq(POSITION);
  // });
  //
  it("emergency function call", async () => {
    await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });

    const encoded = USDC().methods.transfer(owner, POSITION).encodeABI();
    console.log(encoded);
    await venusloop.methods.emergencyFunctionCall(USDC().options.address, encoded).send({ from: owner });

    expect(await USDC().methods.balanceOf(venusloop.options.address).call()).bignumber.zero;
    expect(await USDC().methods.balanceOf(owner).call()).bignumber.eq(POSITION);
  });

  it.skip("emergency function delegate call", async () => {
    await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });

    const compoundLoopAddress = "0x8bd210Fff94C41640F1Fd3E6A6063d04e2f10eEb"; // TODO not existing in bsc, find another
    const compoundLoopABI = [
      {
        inputs: [],
        name: "safeTransferUSDCToOwner",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const compoundLoop = contract(compoundLoopABI, compoundLoopAddress);

    const encoded = await compoundLoop.methods["safeTransferUSDCToOwner"]().encodeABI();
    await venusloop.methods.emergencyFunctionDelegateCall(compoundLoopAddress, encoded).send({ from: owner });

    expect(await USDC().methods.balanceOf(venusloop.options.address).call()).bignumber.zero;
    expect(await USDC().methods.balanceOf(owner).call()).bignumber.eq(POSITION);
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
