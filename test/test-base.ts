import BN from "bn.js";
import { bn, bn6 } from "../src/utils";
import { deployContract } from "../src/extensions";
import { impersonate, resetNetworkFork, tag } from "../src/network";
import { Wallet } from "../src/wallet";
import { expect } from "chai";
import { VenusLoop } from "../typechain-hardhat/VenusLoop";
import { USDC } from "../src/token";

export const usdcWhale = "0xF977814e90dA44bFA03b6295A0616a897441aceC";

export let deployer: string;
export let owner: string;
export let venusloop: VenusLoop;
export const POSITION = bn6("5,000,000");

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

  await initWallet();

  owner = (await Wallet.fake(1)).address;
  venusloop = await deployContract<VenusLoop>("VenusLoop", { from: deployer }, [owner]);

  await ensureBalanceUSDC(owner, POSITION);
}

async function initWallet() {
  const wallet = await Wallet.fake();
  wallet.setAsDefaultSigner();
  deployer = wallet.address;
  tag(deployer, "deployer");
}

/**
 * Takes USDC from whale ensuring minimum amount
 */
async function ensureBalanceUSDC(address: string, amount: BN) {
  if (bn(await USDC().methods.balanceOf(address).call()).lt(amount)) {
    await USDC().methods.transfer(address, amount).send({ from: usdcWhale });
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

  const al = await venusloop.methods.getAccountLiquidity().call();
  expect(al.err).bignumber.zero;
  expect(al.liquidity).bignumber.zero;
  expect(al.shortfall).bignumber.zero;
}
