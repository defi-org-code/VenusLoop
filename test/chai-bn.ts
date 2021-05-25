import chai from "chai";
import BN from "bn.js";
import CBN from "chai-bn";

before(() => {
  chai.use(CBN(BN));
});
