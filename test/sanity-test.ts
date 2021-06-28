import {
  expectOutOfPosition,
  initOwnerAndUSDC,
  POSITION,
  venusloop,
  owner,
  expectRevert,
  XVS,
  deployer,
} from "./test-base";
import { expect } from "chai";
import { account, erc20s } from "@defi.org/web3-candies";

describe("VenusLoop Sanity Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  it("empty state", async () => {
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
    await expectOutOfPosition();
    expect(await venusloop.methods.owner().call()).eq(owner);

    expect(await venusloop.methods.getAccountLiquidity().call()).bignumber.zero;

    await venusloop.methods.claimRewardsToOwner().send({ from: owner });
    expect(await XVS.methods.balanceOf(owner).call()).bignumber.zero;
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.zero;
    expect(await venusloop.methods.getBalanceXVS().call()).bignumber.zero;
    expect(await venusloop.methods.getClaimableXVS().call()).bignumber.zero;
  });

  it("access control", async () => {
    await erc20s.bsc.USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });

    await expectRevert(() => venusloop.methods._supply(100).send({ from: deployer }));
    await expectRevert(() => venusloop.methods._borrow(50).send({ from: deployer }));
    await expectRevert(() => venusloop.methods._repay(50).send({ from: deployer }));
    await expectRevert(() => venusloop.methods._redeem(100).send({ from: deployer }));

    await expectRevert(() => venusloop.methods.emergencyFunctionCall("", "").send({ from: deployer }));
    await expectRevert(() => venusloop.methods.emergencyFunctionDelegateCall("", "").send({ from: deployer }));

    await expectRevert(() => venusloop.methods.enterPosition(1, 100_000).send({ from: deployer }));
    await expectRevert(() => venusloop.methods.exitPosition(20, 100_000).send({ from: deployer }));

    await expectRevert(() => venusloop.methods.withdrawAllUSDCToOwner().send({ from: deployer }));
  });

  it("mutable admin", async () => {
    await erc20s.bsc.USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
    expect(await venusloop.methods.admin().call())
      .eq(await venusloop.methods.owner().call())
      .eq(owner);
    const other = await account(2);
    await venusloop.methods.setAdmin(other).send({ from: owner });
    expect(await venusloop.methods.admin().call()).eq(other);

    await venusloop.methods.withdrawAllUSDCToOwner().send({ from: other });
    expect(await erc20s.bsc.USDC().methods.balanceOf(venusloop.options.address).call()).bignumber.zero;
    expect(await erc20s.bsc.USDC().methods.balanceOf(owner).call()).bignumber.gte(POSITION);
  });
});
