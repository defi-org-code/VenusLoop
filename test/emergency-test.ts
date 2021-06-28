import { expect } from "chai";
import { expectOutOfPosition, initOwnerAndUSDC, owner, POSITION, venusloop, VUSDC } from "./test-base";
import { bn6, max, erc20s } from "@defi.org/web3-candies";

describe("VenusLoop Emergency Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  it("withdrawAllUSDCToOwner", async () => {
    await erc20s.bsc.USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
    await venusloop.methods.withdrawAllUSDCToOwner().send({ from: owner });
    expect(await erc20s.bsc.USDC().methods.balanceOf(owner).call()).bignumber.eq(POSITION);
  });

  it("emergency function call", async () => {
    await erc20s.bsc.USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });

    const encoded = erc20s.bsc.USDC().methods.transfer(owner, POSITION).encodeABI();
    await venusloop.methods.emergencyFunctionCall(erc20s.bsc.USDC().options.address, encoded).send({ from: owner });

    const venusLoopBalance = await erc20s.bsc.USDC().methods.balanceOf(venusloop.options.address).call();
    console.log("USDC venusLoopBalance", venusLoopBalance);
    expect(venusLoopBalance).bignumber.zero;

    const ownerBalance = await erc20s.bsc.USDC().methods.balanceOf(owner).call();
    console.log("USDC ownerBalance", ownerBalance);
    expect(ownerBalance).bignumber.eq(POSITION);
  });

  it.skip("emergency function delegate call", async () => {
    // upload a temp contract to use as lib (extension)
    await erc20s.bsc.USDC().methods.transfer(venusloop.options.address, 1000).send({ from: owner });
    const encoded = erc20s.bsc.USDC().methods.transfer(owner, 1000).encodeABI();
    await venusloop.methods
      .emergencyFunctionDelegateCall(erc20s.bsc.USDC().options.address, encoded)
      .send({ from: owner });
  });

  it("exit position one by one manually", async () => {
    await erc20s.bsc.USDC().methods.transfer(venusloop.options.address, bn6("1,000,000")).send({ from: owner });
    await venusloop.methods.enterPosition(11, 100_000).send({ from: owner });
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;

    await venusloop.methods._redeem(bn6("68,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("85,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("107,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("134,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("167,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("209,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("262,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("327,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("409,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("512,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("640,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    await venusloop.methods._redeem(bn6("652,000")).send({ from: owner });
    await venusloop.methods._repay(await venusloop.methods.getBalanceUSDC().call()).send({ from: owner });

    // last iteration: leftovers
    await venusloop.methods._redeem(bn6("148,000")).send({ from: owner });
    // repay as much as possible
    await venusloop.methods._repay(max).send({ from: owner });

    // remove all remaining supply
    const amountVUSDC = await VUSDC.methods.balanceOf(venusloop.options.address).call();
    await venusloop.methods._redeemVTokens(amountVUSDC).send({ from: owner });

    await expectOutOfPosition();

    // up to 0.1% withdrawal fee
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.closeTo(bn6("1,000,000"), bn6("1,000"));
  });
});
