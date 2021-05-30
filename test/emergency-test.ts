import { expect } from "chai";
import { USDC, VUSDC } from "../src/token";
import { expectOutOfPosition, initOwnerAndUSDC, owner, POSITION, venusloop } from "./test-base";
import { bn6, bn8, max } from "../src/utils";

describe("VenusLoop Emergency Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  it.skip("owner able to call step by step", async () => {
    await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
    expect(await USDC().methods.balanceOf(venusloop.options.address)).eq(POSITION);

    await venusloop.methods._supply(bn6("100")).send({ from: owner });
    await venusloop.methods._borrow(bn6("50")).send({ from: owner });
    await venusloop.methods._repay(bn6("50")).send({ from: owner });
    await venusloop.methods._redeem(bn6("100")).send({ from: owner });
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

  // Skipped
  it.skip("emergency function delegate call", async () => {
    // upload a temp contract to use as lib (extension)
    await USDC().methods.transfer(venusloop.options.address, 1000).send({ from: owner });
    const encoded = USDC().methods.transfer(owner, 1000).encodeABI();
    await venusloop.methods.emergencyFunctionDelegateCall(USDC().options.address, encoded).send({ from: owner });
  });

  it("exit position one by one manually", async () => {
    // enter position
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });
    await venusloop.methods.enterPosition(11, 100_000).send({ from: owner });
    //
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;

    // Iterations 800000	(rounding iteration) 640000	512000	409600	327680	262144	209715	167772	134218	107374	85899	68719
    let usdc;

    // rounding original number
    await venusloop.methods._redeem(bn6("68,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("85,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("107,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("134,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("167,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("209,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("262,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("327,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("409,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("512,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    await venusloop.methods._redeem(bn6("640,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    console.log("+++last Iter have left over from previous round down");

    await venusloop.methods._redeem(bn6("652,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(usdc).send({ from: owner });
    console.log("repay usdc = ", usdc);

    // repay max

    await venusloop.methods._redeem(bn6("148,000")).send({ from: owner });
    usdc = await venusloop.methods.getBalanceUSDC().call();
    await venusloop.methods._repay(max).send({ from: owner });

    // redeam v token
    console.log("redeam remaining vtoken after last round");
    let vusdc = await VUSDC().methods.balanceOf(venusloop.options.address).call();
    console.log("redeem vusdc left: ", vusdc);
    await venusloop.methods._redeemVTokens(vusdc).send({ from: owner });

    // out of position
    await expectOutOfPosition();

    // less than 1m withdraw fees
    expect(await venusloop.methods.getBalanceUSDC().call())
      .bignumber.closeTo(bn6("1,000,000"), bn6("1,000"))
      .lessThan(bn6("1,000,000"));
  });
});
