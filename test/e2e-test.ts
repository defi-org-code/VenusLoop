import BN from "bn.js";
import { expect } from "chai";
import { expectOutOfPosition, initOwnerAndUSDC, owner, venusloop, XVS } from "./test-base";
import { bn, bn6, contract, erc20s, fmt6, max, mineBlocks, zero } from "@defi.org/web3-candies";
import { jumpBlocks } from "ethereumjs-hooks";
import { Abi } from "@defi.org/web3-candies/dist/contracts";

describe("VenusLoop E2E Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
    await erc20s.bsc.USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });
  });

  it("manual borrow and deposit", async () => {
    await venusloop.methods._supply(bn6("1,000,000")).send({ from: owner });
    await venusloop.methods._borrowAndSupply(100_000).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
    expect(await venusloop.methods.getTotalBorrowed().call()).bignumber.closeTo(bn6("800,000"), bn6("1000"));
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.closeTo(bn6("1,800,000"), bn6("1000"));
    expect(await venusloop.methods.getAccountLiquidity().call()).bignumber.closeTo(bn6("640,000"), bn6("1000"));
  });

  it("manual redeem and repay", async () => {
    await venusloop.methods._supply(bn6("1,000,000")).send({ from: owner });
    await venusloop.methods._borrowAndSupply(100_000).send({ from: owner });

    await venusloop.methods._redeemAndRepay(100_000).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.closeTo(zero, bn6("1000"));
    expect(await venusloop.methods.getTotalBorrowed().call()).bignumber.closeTo(zero, bn6("1000"));
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.closeTo(bn6("1,000,000"), bn6("1000"));
    expect(await venusloop.methods.getAccountLiquidity().call()).bignumber.closeTo(bn6("800,000"), bn6("1000"));
  });

  it("happy path", async () => {
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
    await venusloop.methods.enterPosition(11, 100_000).send({ from: owner });
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;

    const day = 60 * 60 * 24;
    await mineBlocks(day, 3);

    await venusloop.methods.claimRewardsToOwner().send({ from: owner });

    console.log("calculated:");
    const rewardBalance = bn(await XVS.methods.balanceOf(owner).call());
    console.log("rewardBalance", fmt6(rewardBalance));
    const rewardPrice = 32;
    console.log("assuming reward price in USD", rewardPrice, "$");
    const perDay = rewardBalance.muln(rewardPrice);
    apyFromRewards(perDay, bn6("1,000,000"));

    console.log("actual (by selling rewards):");
    const routerAbi: Abi = [
      {
        inputs: [
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          { internalType: "uint256", name: "amountOutMin", type: "uint256" },
          { internalType: "address[]", name: "path", type: "address[]" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
        ],
        name: "swapExactTokensForTokens",
        outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const router = contract(routerAbi, "0x10ED43C718714eb63d5aA57B78B54704E256024E");
    await XVS.methods.approve(router.options.address, max).send({ from: owner });
    const usdcBefore = bn(await erc20s.bsc.USDC().methods.balanceOf(owner).call());
    await router.methods
      .swapExactTokensForTokens(
        rewardBalance,
        0,
        [XVS.options.address, erc20s.bsc.WBNB().options.address, erc20s.bsc.USDC().options.address],
        owner,
        max
      )
      .send({ from: owner });
    const usdcAfter = bn(await erc20s.bsc.USDC().methods.balanceOf(owner).call());
    const profit = usdcAfter.sub(usdcBefore);
    apyFromRewards(profit, bn6("1,000,000"));
  });

  it("partial exits due to gas limits", async () => {
    await venusloop.methods.enterPosition(20, 100_000).send({ from: owner });
    const startLeverage = await venusloop.methods.getTotalBorrowedAccrued().call();
    await venusloop.methods.exitPosition(10, 100_000).send({ from: owner });
    const midLeverage = await venusloop.methods.getTotalBorrowedAccrued().call();
    expect(midLeverage).bignumber.gt(zero).lt(startLeverage);
    await venusloop.methods.exitPosition(100, 100_000).send({ from: owner });

    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.closeTo(bn6("1,000,000"), bn6("1000")); // fee
    await expectOutOfPosition();
  });

  it("liquidity after 1 year", async () => {
    await venusloop.methods.enterPosition(11, 100_000).send({ from: owner });

    const startLiquidity = bn(await venusloop.methods.getAccountLiquidityAccrued().call());

    const blocksPerYear = (60 * 60 * 24 * 365) / 3;
    jumpBlocks(blocksPerYear);

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

function apyFromRewards(perDay: BN, principal: BN) {
  console.log("profit from rewards per day", fmt6(perDay));
  const dailyRate = perDay.mul(bn6("1")).div(principal); // percent from principal
  console.log("dailyRate:", fmt6(dailyRate.muln(100)), "%");
  const APR2 = dailyRate.muln(365);
  console.log("result APR: ", fmt6(APR2.muln(100)), "%");
}
