import { expectOutOfPosition, initOwnerAndUSDC, POSITION, venusloop, owner, expectRevert } from "./test-base";
import { expect } from "chai";
import { USDC, XVS } from "../src/token";

describe("VenusLoop Sanity Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  it("empty state", async () => {
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
    await expectOutOfPosition();
    expect(await venusloop.methods.owner().call()).eq(owner);

    expect(await venusloop.methods.getAccountLiquidity().call()).bignumber.zero;

    await venusloop.methods.claimRewardsToOwner().send();
    expect(await XVS().methods.balanceOf(owner).call()).bignumber.zero;
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
    expect(await venusloop.methods.getTotalSupplied().call()).bignumber.zero;
    expect(await venusloop.methods.getBalanceXVS().call()).bignumber.zero;
    expect(await venusloop.methods.getClaimableXVS().call()).bignumber.zero;
  });

  it("access control", async () => {
    await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });

    // check revert with default deployer (who is not the default owner )
    await expectRevert(() => venusloop.methods._supply(100).send());
    await expectRevert(() => venusloop.methods._borrow(50).send());
    await expectRevert(() => venusloop.methods._repay(50).send());
    await expectRevert(() => venusloop.methods._redeem(100).send());

    await expectRevert(() => venusloop.methods.emergencyFunctionCall("", "").send());
    await expectRevert(() => venusloop.methods.emergencyFunctionDelegateCall("", "").send());

    await expectRevert(() => venusloop.methods.enterPosition(1, 100_000).send());
    await expectRevert(() => venusloop.methods.exitPosition(20, 100_000).send());

    await expectRevert(() => venusloop.methods.withdrawAllUSDCToOwner().send());
  });
});
