import BN from "bn.js";
import { expect } from "chai";
import { VenusLoop } from "../typechain-hardhat/VenusLoop";
import chai from "chai";
import CBN from "chai-bn";
import {
  account,
  bn,
  bn6,
  deployArtifact,
  erc20,
  impersonate,
  resetNetworkFork,
  tag,
  erc20s,
} from "@defi.org/web3-candies";

export const usdcWhale = "0xF977814e90dA44bFA03b6295A0616a897441aceC";

export const VUSDC = erc20("$VUSDC", "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8");
export const XVS = erc20("$XVS", "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63");

export let deployer: string;
export let owner: string;
export let venusloop: VenusLoop;
export const POSITION = bn6("5,000,000");

before(() => {
  chai.use(CBN(BN));
});

export async function initOwnerAndUSDC() {
  while (true) {
    try {
      return await doInitState();
    } catch (e) {
      console.error(e, "\ntrying again...");
    }
  }
}

async function doInitState() {
  await resetNetworkFork();
  await impersonate(usdcWhale);
  tag(usdcWhale, "USDC whale");

  deployer = await account(0);
  tag(deployer, "deployer");

  owner = await account(1);
  venusloop = await deployArtifact<VenusLoop>("VenusLoop", { from: deployer }, [owner]);

  await ensureBalanceUSDC(owner, POSITION);
}

/**
 * Takes USDC from whale ensuring minimum amount
 */
async function ensureBalanceUSDC(address: string, amount: BN) {
  if (bn(await erc20s.bsc.USDC().methods.balanceOf(address).call()).lt(amount)) {
    await erc20s.bsc.USDC().methods.transfer(address, amount).send({ from: usdcWhale });
  }
}

export async function expectRevert(fn: () => any) {
  let err: Error | null = null;
  try {
    await fn();
  } catch (e) {
    err = e;
  }
  expect(!!err, "expected to revert").true;
}

export async function expectOutOfPosition() {
  expect(await venusloop.methods.getTotalSupplied().call()).bignumber.zero;
  expect(await venusloop.methods.getTotalBorrowed().call()).bignumber.zero;
  expect(await venusloop.methods.getAccountLiquidity().call()).bignumber.zero;
}
