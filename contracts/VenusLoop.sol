// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IVenusInterfaces.sol";
import "hardhat/console.sol";

contract VenusLoop {
    using SafeERC20 for IERC20;

    // ---- fields ----
    address public constant USDC = address(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d);
    address public constant VUSDC = address(0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8);
    address public constant UNITROLLER = address(0xfD36E2c2a6789Db23113685031d7F16329158384);
    address public constant XVS = address(0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63);
    uint256 public constant PERCENT = 100_000; // percentmil, 1/100,000
    address public immutable owner; // TODO add admin role

    // ---- events ----
    event LogSupply(uint256 amount);
    event LogBorrow(uint256 amount);
    event LogRedeem(uint256 amount);
    event LogRepay(uint256 amount);

    // ---- constructor ----
    constructor(address _owner) {
        owner = _owner;

        IERC20(USDC).safeApprove(VUSDC, type(uint256).max);
        _enterMarkets();
    }

    // ---- modifiers ----

    modifier onlyOwner() {
        require(msg.sender == owner, "onlyOwner");
        _;
    }

    // ---- views ----

    /**
     * Underlying balance
     */
    function getBalanceUSDC() public view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }

    /**
     * Total underlying (USDC) supplied balance
     */
    function getTotalSupplied() external view returns (uint256) {
        return (IVToken(VUSDC).exchangeRateStored() * IERC20(VUSDC).balanceOf(address(this))) / 1e18;
    }

    /**
     * Total underlying (USDC) supplied balance - with state update
     */
    function getTotalSuppliedAccrued() public returns (uint256) {
        return IVToken(VUSDC).balanceOfUnderlying(address(this));
    }

    /**
     * Total borrowed balance (USDC) debt
     */
    function getTotalBorrowed() external view returns (uint256) {
        return IVToken(VUSDC).borrowBalanceStored(address(this));
    }

    /**
     * Total borrowed balance (USDC) debt - with state update
     */
    function getTotalBorrowedAccrued() public returns (uint256) {
        return IVToken(VUSDC).borrowBalanceCurrent(address(this));
    }

    /**
     * Claimed reward balance
     */
    function getBalanceXVS() public view returns (uint256) {
        return IERC20(XVS).balanceOf(address(this));
    }

    /**
     * Unclaimed reward balance
     */
    function getClaimableXVS() external view returns (uint256) {
        return IComptroller(UNITROLLER).venusAccrued(address(this));
    }

    function getAccountLiquidity()
        public
        view
        returns (
            uint256 err,
            uint256 liquidity,
            uint256 shortfall
        )
    {
        return IComptroller(UNITROLLER).getAccountLiquidity(address(this));
    }

    // ---- unrestricted ----

    function claimRewardsToOwner() external {
        IComptroller(UNITROLLER).claimVenus(address(this));
        IERC20(XVS).safeTransfer(owner, getBalanceXVS());
    }

    // ---- main ----
    /**
     * iterations: number of leverage loops
     * ratio: percent of liquidity to borrow each iteration. 1/100,000 (recommended 97.5% == 97,500)
     */
    function enterPosition(uint256 iterations, uint256 ratio) external onlyOwner {
        _supply(getBalanceUSDC());
        for (uint256 i = 0; i < iterations; i++) {
            _borrowAndSupply(ratio);
        }
    }

    /**
     * Supports partial exits
     * maxIterations: max (upper bound) of exit deleverage loops
     * ratio: percent of liquidity to redeem each iteration. 1/100,000 (recommended 121.118% == 121,118)
     */
    function exitPosition(uint256 maxIterations, uint256 ratio) external onlyOwner returns (uint256 endingBalance) {
        for (uint256 i = 0; getTotalBorrowedAccrued() > 0 && i < maxIterations; i++) {
            console.log("exit", i);
            _redeemAndRepay(ratio);
        }
        if (getTotalBorrowedAccrued() == 0) {
            _redeem(getTotalSuppliedAccrued());
        }
        return getBalanceUSDC();
    }

    function withdrawAllUSDCToOwner() external onlyOwner {
        withdrawToOwner(USDC);
    }

    // ---- internals, public onlyOwner in case of emergency ----

    /**
     * amount: USDC
     * generates interest
     */
    function _supply(uint256 amount) public onlyOwner {
        require(IVToken(VUSDC).mint(amount) == 0, "mint failed");
        emit LogSupply(amount);
    }

    /**
     * withdraw from supply
     * amount: USDC
     */
    function _redeem(uint256 amount) public onlyOwner {
        require(IVToken(VUSDC).redeemUnderlying(amount) == 0, "withdraw failed");
        emit LogRedeem(amount);
    }

    /**
     * amount: USDC
     */
    function _borrow(uint256 amount) public onlyOwner {
        require(IVToken(VUSDC).borrow(amount) == 0, "borrow failed");
        emit LogBorrow(amount);
    }

    /**
     * pay back debt
     * amount: USDC
     */
    function _repay(uint256 amount) public onlyOwner {
        require(IVToken(VUSDC).repayBorrow(amount) == 0, "repay failed");
        emit LogRepay(amount);
    }

    /**
     * ratio: 1/100,000 (recommended 97.5% == 97,500)
     */
    function _borrowAndSupply(uint256 ratio) public onlyOwner {
        (uint256 err, uint256 liquidity, uint256 shortfall) = getAccountLiquidity();
        require(err == 0 && shortfall == 0, "_borrowAndSupply failed");

        uint256 borrowAmount = (liquidity * ratio) / PERCENT;
        _borrow(borrowAmount);

        _supply(getBalanceUSDC());
    }

    /**
     * ratio: 1/100,000 (recommended 121.118% == 121,118)
     */
    function _redeemAndRepay(uint256 ratio) public onlyOwner {
        (uint256 err, uint256 liquidity, uint256 shortfall) = getAccountLiquidity();
        require(err == 0 && shortfall == 0, "_redeemAndRepay failed");

        uint256 redeemAmount = (liquidity * ratio) / PERCENT;
        console.log("redeemAmount", redeemAmount);
        console.log("liquidity", liquidity);
        _redeem(redeemAmount);

        uint256 usdc = getBalanceUSDC();
        uint256 borrowed = getTotalBorrowedAccrued();
        if (usdc < borrowed) {
            _repay(usdc);
        } else {
            _repay(borrowed);
        }
    }

    function _enterMarkets() private {
        address[] memory markets = new address[](1);
        markets[0] = VUSDC;
        IComptroller(UNITROLLER).enterMarkets(markets);
    }

    // ---- emergency ----

    function withdrawToOwner(address asset) public onlyOwner {
        uint256 balance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransfer(owner, balance);
    }

    function emergencyFunctionCall(address target, bytes memory data) external onlyOwner {
        Address.functionCall(target, data);
    }

    function emergencyFunctionDelegateCall(address target, bytes memory data) external onlyOwner {
        Address.functionDelegateCall(target, data);
    }
}
