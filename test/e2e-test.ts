import BN from "bn.js";
import { expectOutOfPosition, initOwnerAndUSDC, owner, POSITION, venusloop } from "./test-base";
import { bn6, fmt6, zero, fmt18, bn, bn18, ether } from "../src/utils";
import { XVS } from "../src/token";
import { advanceTime, web3 } from "../src/network";
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

  it("show me the money", async () => {
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

  it("partial exits due to gas limits", async () => {
    await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });

    await venusloop.methods.enterPosition(20, 100_000).send({ from: owner });
    const startLeverage = await venusloop.methods.getTotalBorrowedAccrued().call();
    await venusloop.methods.exitPosition(10, 100_000).send({ from: owner });
    const midLeverage = await venusloop.methods.getTotalBorrowedAccrued().call();
    expect(midLeverage).bignumber.gt(zero).lt(startLeverage);
    await venusloop.methods.exitPosition(100, 100_000).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.closeTo(POSITION, bn6("3000")); // fee
    await expectOutOfPosition();
  });

  it("health factor decay rate", async () => {
    await USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });
    await venusloop.methods.enterPosition(11, 100_000).send({ from: owner });

    const startLiquidity = bn(await venusloop.methods.getAccountLiquidityAccrued().call());

    const blocksPerYear = (60 * 60 * 24 * 365) / 3;
    require("ethereumjs-hooks").jumpBlocks(blocksPerYear);

    const endLiquidity = bn(await venusloop.methods.getAccountLiquidityAccrued().call());

    console.log(
      "liquidity after 1 year:",
      fmt6(startLiquidity),
      fmt6(endLiquidity),
      "diff:",
      fmt6(endLiquidity.sub(startLiquidity))
    );
    expect(endLiquidity).bignumber.lt(startLiquidity).gt(zero); // must be > 0 to not be liquidated
  });
});
