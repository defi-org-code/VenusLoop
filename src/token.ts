import { contract } from "./extensions";
import { ERC20 } from "../typechain-hardhat/ERC20";
import { tag } from "./network";

const abi = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json").abi;

export function USDC() {
  return newToken("$USDC", "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d");
}

export interface Token extends ERC20 {
  displayName: string;
}

export function newToken(name: string, address: string) {
  const token = contract<Token>(abi, address);
  token.displayName = name;
  tag(address, name);
  return token;
}
