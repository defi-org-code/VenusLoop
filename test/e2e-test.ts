import BN from "bn.js";
import { expectOutOfPosition, initOwnerAndUSDC, owner, POSITION, venusloop } from "./test-base";
import { bn6, fmt6, zero, fmt18, bn, bn18, ether } from "../src/utils";
import { XVS } from "../src/token";
import { advanceTime } from "../src/network";
import { USDC } from "../src/token";
import { expect } from "chai";

describe("VenusLoop E2E Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  it("manual borrow and deposit", async () => {
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });

    await venusloop.methods._supply(bn6("1,000,000")).send({ from: owner });
    await venusloop.methods._borrowAndSupply(100_000).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
    expect(await venusloop.methods.getTotalBorrowed().call()).bignumber.closeTo(bn6("800,000"), bn6("1000"));
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.closeTo(bn6("1,800,000"), bn6("1000"));
    expect(await venusloop.methods.getAccountLiquidity().call()).bignumber.closeTo(bn6("640,000"), bn6("1000"));
  });

  it("manual redeem and repay", async () => {
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });
    await venusloop.methods._supply(bn6("1,000,000")).send({ from: owner });
    await venusloop.methods._borrowAndSupply(100_000).send({ from: owner });

    await venusloop.methods._redeemAndRepay(100_000).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.closeTo(zero, bn6("1000"));
    expect(await venusloop.methods.getTotalBorrowed().call()).bignumber.closeTo(zero, bn6("1000"));
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.closeTo(bn6("1,000,000"), bn6("1000"));
    expect(await venusloop.methods.getAccountLiquidity().call()).bignumber.closeTo(bn6("800,000"), bn6("1000"));
  });

  it("happy path", async () => {
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });
    await venusloop.methods.enterPosition(11, 100_000).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.closeTo(zero, bn6("1000"));
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.closeTo(bn6("4,656,000"), bn6("5000"));
    expect(await venusloop.methods.getTotalBorrowed().call()).bignumber.closeTo(bn6("3,656,000"), bn6("5000"));
    expect(await venusloop.methods.getAccountLiquidity().call()).bignumber.closeTo(bn6("68,719"), bn6("5000"));

    await venusloop.methods.exitPosition(100, 100_000).send({ from: owner });
    await expectOutOfPosition();
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.closeTo(bn6("1,000,000"), bn6("1000"));
  });

  it.only("show me the money", async () => {
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });

    await venusloop.methods.enterPosition(11, 100_000).send({ from: owner });
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;

    const day = 60 * 60 * 24;
    await advanceTime(day);

    await venusloop.methods.claimRewardsToOwner().send({ from: owner });

    console.log(await XVS().methods.balanceOf(owner).call());

    const rewardBalance = bn(await XVS().methods.balanceOf(owner).call());
    console.log("rewardBalance", fmt6(rewardBalance));
    const rewardPrice = 32;
    console.log("assuming reward price in USD", rewardPrice, "$");
    const perDay = rewardBalance.muln(rewardPrice);
    console.log("profit from rewards per day", fmt6(perDay));
    const dailyRate = perDay.mul(bn6("1")).div(bn6("1,000,000")); // percent from principal
    console.log("dailyRate:", fmt6(dailyRate.muln(100)), "%");
    const APR = dailyRate.muln(365);
    console.log("result APR: ", fmt6(APR.muln(100)), "%");
  });

  // it("partial exits due to gas limits", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });

  //   await venusloop.methods.enterPosition(20).send({ from: owner });
  //   const startLeverage = await venusloop.methods.getBalanceDebtToken().call();
  //   await venusloop.methods.exitPosition(10).send({ from: owner });
  //   const midLeverage = await venusloop.methods.getBalanceDebtToken().call();
  //   expect(midLeverage).bignumber.gt(zero).lt(startLeverage);
  //   await venusloop.methods.exitPosition(100).send({ from: owner });

  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.greaterThan(POSITION);
  //   await expectOutOfPosition();
  // });
  //
  // it("health factor decay rate", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
  //   await venusloop.methods.enterPosition(14).send({ from: owner });
  //
  //   const startHF = bn((await venusloop.methods.getPositionData().call()).healthFactor);
  //
  //   const year = 60 * 60 * 24 * 365;
  //   await jumpTime(year);
  //
  //   const endHF = bn((await venusloop.methods.getPositionData().call()).healthFactor);
  //
  //   console.log("health factor after 1 year:", fmt18(startHF), fmt18(endHF), "diff:", fmt18(endHF.sub(startHF)));
  //   expect(endHF).bignumber.lt(startHF).gt(ether); // must be > 1 to not be liquidated
  // });
});
