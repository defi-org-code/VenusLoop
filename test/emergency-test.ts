import { expect } from "chai";
import { USDC, XVS } from "../src/token";
import { initOwnerAndUSDC, owner, POSITION, venusloop } from "./test-base";
import { contract } from "../src/extensions";
import { Wallet } from "../src/wallet";

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
    await venusloop.methods.emergencyFunctionCall(USDC().options.address, encoded).send({ from: owner });

    expect(await USDC().methods.balanceOf(venusloop.options.address).call()).bignumber.zero;
    expect(await USDC().methods.balanceOf(owner).call()).bignumber.eq(POSITION);
  });

  it("emergency function delegate call", async () => {
    const xvsABI = [
      {
        constant: false,
        inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
        name: "transferOwnership",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const xvs = contract(xvsABI, XVS().options.address);

    const fakeOwner = await Wallet.fake(2);
    const encoded = await xvs.methods["transferOwnership"](fakeOwner.address).encodeABI();
    await venusloop.methods.emergencyFunctionDelegateCall(XVS().options.address, encoded).send({ from: owner });

    // expect(await USDC().methods.balanceOf(venusloop.options.address).call()).bignumber.zero;
    // expect(await USDC().methods.balanceOf(owner).call()).bignumber.eq(POSITION);
    expect(await venusloop.methods.owner().call()).eq(fakeOwner.address);
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
