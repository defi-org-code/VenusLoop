import BN from "bn.js";
import { initOwnerAndUSDC, owner, POSITION, venusloop } from "./test-base";
import { bn6, fmt6, zero } from "../src/utils";
import { USDC } from "../src/token";
import { expect } from "chai";

describe("VenusLoop E2E Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  // it("happy path", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
  //
  //   await venusloop.methods.enterPosition(14).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   await venusloop.methods.exitPosition(14).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.greaterThan(POSITION);
  //
  //   await expectOutOfPosition();
  // });
  //
  // it("Show me the money", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
  //
  //   console.log("entering with 14 loops", fmt6(POSITION));
  //   await venusloop.methods.enterPosition(14).send({ from: owner });
  //   expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   const day = 60 * 60 * 24;
  //   await advanceTime(day);
  //
  //   const rewardBalance = await venusloop.methods.getBalanceReward().call();
  //   expect(rewardBalance).bignumber.greaterThan(zero);
  //   console.log("rewards", fmt18(rewardBalance));
  //
  //   console.log("claim rewards");
  //   await venusloop.methods.claimRewardsToOwner().send({ from: deployer });
  //
  //   const claimedBalance = bn(await stkvenus().methods.balanceOf(owner).call());
  //   expect(claimedBalance).bignumber.greaterThan(zero).closeTo(rewardBalance, bn18("0.1"));
  //   console.log("reward stkvenus", fmt18(claimedBalance));
  //
  //   console.log("exiting with 15 loops");
  //   await venusloop.methods.exitPosition(15).send({ from: owner }); // +1 loop due to lower liquidity
  //   const endBalanceUSDC = bn(await venusloop.methods.getBalanceUSDC().call());
  //   expect(endBalanceUSDC).bignumber.greaterThan(POSITION);
  //
  //   await expectOutOfPosition();
  //
  //   printAPY(endBalanceUSDC, claimedBalance);
  // });
  //
  // it("partial exits due to gas limits", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
  //
  //   await venusloop.methods.enterPosition(20).send({ from: owner });
  //   const startLeverage = await venusloop.methods.getBalanceDebtToken().call();
  //   await venusloop.methods.exitPosition(10).send({ from: owner });
  //   const midLeverage = await venusloop.methods.getBalanceDebtToken().call();
  //   expect(midLeverage).bignumber.gt(zero).lt(startLeverage);
  //   await venusloop.methods.exitPosition(100).send({ from: owner });
  //
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

  it.only("manual borrowAndDeposit", async () => {
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });

    await venusloop.methods._deposit(bn6("1,000,000")).send({ from: owner });
    await venusloop.methods._borrowAndDeposit(97_500).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
    expect(await venusloop.methods.getTotalBorrowed().call()).bignumber.closeTo(bn6("780,000"), bn6("1000"));
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.closeTo(bn6("1,780,000"), bn6("1000"));
    expect((await venusloop.methods.getAccountLiquidity().call()).liquidity).bignumber.closeTo(
      bn6("644,000"),
      bn6("1000")
    );
  });

  it("manual repay and redeem", async () => {
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });
    // await venusloop.methods._depositAndBorrow(bn6("1,000,000"), 97_500).send({ from: owner });

    // await venusloop.methods._repayAndWithdraw()
  });

  it("enter position", async () => {
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });
    await venusloop.methods.enterPosition(11, 97_500).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.closeTo(zero, bn6("1000"));
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.closeTo(bn6("4,632,000"), bn6("5000"));
    expect(await venusloop.methods.getTotalBorrowed().call()).bignumber.closeTo(bn6("3,632,000"), bn6("5000"));
    expect((await venusloop.methods.getAccountLiquidity().call()).liquidity).bignumber.closeTo(
      bn6("73,594"),
      bn6("5000")
    );

    // await venusloop.methods.exitPosition(100, 97_500).send({ from: owner });
  });
});

function printAPY(endBalanceUSDC: BN, claimedBalance: BN) {
  console.log("=================");
  const profitFromInterest = endBalanceUSDC.sub(POSITION);
  console.log("profit from interest", fmt6(profitFromInterest));
  const stkvenusPrice = 470;
  console.log("assuming stkvenus price in USD", stkvenusPrice, "$");
  const profitFromRewards = claimedBalance.muln(stkvenusPrice).div(bn6("1,000,000")); // 18->6 decimals
  console.log("profit from rewards", fmt6(profitFromRewards));
  const profit = profitFromInterest.add(profitFromRewards);

  const dailyRate = profit.mul(bn6("1")).div(POSITION);
  console.log("dailyRate:", fmt6(dailyRate.muln(100)), "%");

  const APR = dailyRate.muln(365);
  console.log("result APR: ", fmt6(APR.muln(100)), "%");

  const APY = Math.pow(1 + parseFloat(fmt6(dailyRate)), 365) - 1;
  console.log("result APY: ", APY * 100, "%");
  console.log("=================");
}
