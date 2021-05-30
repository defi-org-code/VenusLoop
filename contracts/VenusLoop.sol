// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IVenusInterfaces.sol";

contract VenusLoop {
    using SafeERC20 for IERC20;

    // ---- fields ----
    address public constant USDC = address(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d);
    address public constant VUSDC = address(0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8);
    address public constant UNITROLLER = address(0xfD36E2c2a6789Db23113685031d7F16329158384);
    address public constant XVS = address(0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63);
    uint256 public constant PERCENT = 100_000; // percentmil, 1/100,000
    address public immutable owner;
    address public admin;

    // ---- events ----
    event LogSupply(uint256 amount);
    event LogBorrow(uint256 amount);
    event LogRedeem(uint256 amount);
    event LogRedeemVTokens(uint256 amount);
    event LogRepay(uint256 amount);
    event LogSetAdmin(address newAdmin);

    // ---- constructor ----
    constructor(address _owner) {
        owner = _owner;
        admin = _owner;

        IERC20(USDC).safeApprove(VUSDC, type(uint256).max);
        _enterMarkets();
    }

    // ---- modifiers ----

    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner || msg.sender == admin, "onlyOwnerOrAdmin");
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
     * Total borrowed balance (USDC) debt
     */
    function getTotalBorrowed() external view returns (uint256) {
        return IVToken(VUSDC).borrowBalanceStored(address(this));
    }

    /**
     * Total underlying (USDC) supplied balance - with state update
     */
    function getTotalSuppliedAccrued() public returns (uint256) {
        return IVToken(VUSDC).balanceOfUnderlying(address(this));
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

    function getAccountLiquidity() public view returns (uint256) {
        (uint256 err, uint256 liquidity, uint256 shortfall) =
            IComptroller(UNITROLLER).getAccountLiquidity(address(this));
        require(err == 0 && shortfall == 0, "getAccountLiquidity failed");

        uint256 price = PriceOracle(IComptroller(UNITROLLER).oracle()).getUnderlyingPrice(VUSDC);
        liquidity = (liquidity * 1e18) / price;

        return liquidity;
    }

    // ---- unrestricted ----

    function claimRewardsToOwner() external {
        IVToken(VUSDC).accrueInterest();
        IComptroller(UNITROLLER).claimVenus(address(this));
        IERC20(XVS).safeTransfer(owner, getBalanceXVS());
    }

    // ---- main ----
    /**
     * iterations: number of leverage loops
     * ratio: percent of liquidity to borrow each iteration. 100% == 100,000
     */
    function enterPosition(uint256 iterations, uint256 ratio) external onlyOwnerOrAdmin returns (uint256 endLiquidity) {
        _supply(getBalanceUSDC());
        for (uint256 i = 0; i < iterations; i++) {
            _borrowAndSupply(ratio);
        }
        return getAccountLiquidity();
    }

    /**
     * Supports partial exits
     * maxIterations: max (upper bound) of exit deleverage loops
     * ratio: percent of liquidity to redeem each iteration. 100% == 100,000
     */
    function exitPosition(uint256 maxIterations, uint256 ratio)
        external
        onlyOwnerOrAdmin
        returns (uint256 endBalanceUSDC)
    {
        for (uint256 i = 0; getTotalBorrowedAccrued() > 0 && i < maxIterations; i++) {
            _redeemAndRepay(ratio);
        }
        if (getTotalBorrowedAccrued() == 0) {
            _redeemVTokens(IERC20(VUSDC).balanceOf(address(this)));
        }
        return getBalanceUSDC();
    }

    function withdrawAllUSDCToOwner() external onlyOwnerOrAdmin {
        withdrawToOwner(USDC);
    }

    function setAdmin(address newAdmin) external onlyOwnerOrAdmin {
        admin = newAdmin;
        emit LogSetAdmin(newAdmin);
    }

    // ---- internals, public onlyOwnerOrAdmin in case of emergency ----

    /**
     * amount: USDC
     * generates interest
     */
    function _supply(uint256 amount) public onlyOwnerOrAdmin {
        require(IVToken(VUSDC).mint(amount) == 0, "mint failed");
        emit LogSupply(amount);
    }

    /**
     * withdraw from supply
     * amount: USDC
     */
    function _redeem(uint256 amount) public onlyOwnerOrAdmin {
        require(IVToken(VUSDC).redeemUnderlying(amount) == 0, "redeem failed");
        emit LogRedeem(amount);
    }

    /**
     * withdraw from supply
     * amount: VUSDC
     */
    function _redeemVTokens(uint256 amountVUSDC) public onlyOwnerOrAdmin {
        require(IVToken(VUSDC).redeem(amountVUSDC) == 0, "redeemVTokens failed");
        emit LogRedeemVTokens(amountVUSDC);
    }

    /**
     * amount: USDC
     */
    function _borrow(uint256 amount) public onlyOwnerOrAdmin {
        require(IVToken(VUSDC).borrow(amount) == 0, "borrow failed");
        emit LogBorrow(amount);
    }

    /**
     * pay back debt
     * amount: USDC
     */
    function _repay(uint256 amount) public onlyOwnerOrAdmin {
        require(IVToken(VUSDC).repayBorrow(amount) == 0, "repay failed");
        emit LogRepay(amount);
    }

    /**
     * ratio: 100% == 100,000
     */
    function _borrowAndSupply(uint256 ratio) public onlyOwnerOrAdmin {
        uint256 liquidity = getAccountLiquidity();

        uint256 borrowAmount = (liquidity * ratio) / PERCENT;
        _borrow(borrowAmount);

        _supply(getBalanceUSDC());
    }

    /**
     * ratio: 100% == 100,000
     */
    function _redeemAndRepay(uint256 ratio) public onlyOwnerOrAdmin {
        uint256 liquidity = getAccountLiquidity();

        (, uint256 collateralFactor) = IComptroller(UNITROLLER).markets(VUSDC);
        uint256 canWithdraw = ((liquidity * 1e18) / collateralFactor);

        uint256 redeemAmount = (canWithdraw * ratio) / PERCENT;
        _redeem(redeemAmount);

        uint256 usdc = getBalanceUSDC();
        uint256 borrowed = getTotalBorrowedAccrued();
        if (usdc < borrowed) {
            _repay(usdc);
        } else {
            _repay(type(uint256).max);
        }
    }

    function _enterMarkets() private {
        address[] memory markets = new address[](1);
        markets[0] = VUSDC;
        IComptroller(UNITROLLER).enterMarkets(markets);
    }

    // ---- emergency ----

    function withdrawToOwner(address asset) public onlyOwnerOrAdmin {
        uint256 balance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransfer(owner, balance);
    }

    function emergencyFunctionCall(address target, bytes memory data) external onlyOwnerOrAdmin {
        Address.functionCall(target, data);
    }

    function emergencyFunctionDelegateCall(address target, bytes memory data) external onlyOwnerOrAdmin {
        Address.functionDelegateCall(target, data);
    }
}
