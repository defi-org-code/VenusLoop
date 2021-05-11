import { expectOutOfPosition, initOwnerAndUSDC, POSITION, venusloop,  } from "./test-base";
import { expect } from "chai";


describe("VenusLoop Sanity Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  it("empty state", async () => {
    expect(await venusloop.methods.getBalanceUSDC().call()).bignumber.zero;
    await expectOutOfPosition();
    // expect(await venusloop.methods.owner().call()).eq(owner);
    // const result = await venusloop.methods.getPositionData().call();
    // expect(result.healthFactor).bignumber.eq(max);
    // expect(result.ltv).bignumber.zero;
    // await venusloop.methods.claimRewardsToOwner().send();
    // expect(await stkAAVE().methods.balanceOf(owner).call()).bignumber.zero;
  });
  //
  // it("access control", async () => {
  //   await USDC().methods.transfer(venusloop.options.address, POSITION).send({ from: owner });
  //
  //   await expectRevert(() => venusloop.methods._deposit(100).send());
  //   await expectRevert(() => venusloop.methods._borrow(50).send());
  //   await expectRevert(() => venusloop.methods._repay(50).send());
  //   await expectRevert(() => venusloop.methods._withdraw(100).send());
  //
  //   await expectRevert(() => venusloop.methods.enterPosition(1).send());
  //   await expectRevert(() => venusloop.methods.exitPosition(20).send());
  //
  //   await expectRevert(() => venusloop.methods.withdrawAllUSDCToOwner().send());
  //   await expectRevert(() => venusloop.methods.emergencyFunctionCall("", "").send());
  //   await expectRevert(() => venusloop.methods.emergencyFunctionDelegateCall("", "").send());
  // });
});
