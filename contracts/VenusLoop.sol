// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./IVenusInterfaces.sol";

contract VenusLoop is Ownable {
    using SafeERC20 for IERC20;

    // ---- fields ----
    address public constant USDC = address(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d);
    address public constant VUSDC = address(0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8);
    address public constant UNITROLLER = address(0xfD36E2c2a6789Db23113685031d7F16329158384);
    address public constant XVS = address(0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63);

    // ---- events ----
    event LogDeposit(uint256 amount);
    event LogWithdraw(uint256 amount);
    event LogBorrow(uint256 amount);
    event LogRepay(uint256 amount);

    // ---- Constructor ----

    constructor(address owner) {
        transferOwnership(owner);
        // TODO
        //                IERC20(USDC).safeApprove(VUSDC, type(uint256).max);
    }

    // ---- views ----

    function getBalanceUSDC() public view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }

    function getBalanceVUSDC() public view returns (uint256) {
        return IERC20(VUSDC).balanceOf(address(this));
    }

    function getBalanceXVS() public view returns (uint256) {
        return IERC20(XVS).balanceOf(address(this));
    }

    function getBalanceClaimableXVS() public view returns (uint256) {
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

    /**
     * This cannot be a view function as it updates state. Use the custom ABI hack to view it on bscscan
     */
    function borrowBalanceCurrent() public returns (uint256) {
        return IVToken(VUSDC).borrowBalanceCurrent(address(this));
    }

    function claimRewardsToOwner() external {
        IComptroller(UNITROLLER).claimVenus(address(this)); // TODO VAI?
        IERC20(XVS).transfer(owner(), getBalanceXVS());
    }

    // ---- main ----

    function enterPosition(uint256 iterations) external onlyOwner {
        uint256 balanceUSDC = getBalanceUSDC();
        require(balanceUSDC > 0, "insufficient funds");

        //        for (uint256 i = 0; i < iterations; i++) {
        //            _deposit(balanceUSDC);
        //            (, , , , uint256 ltv, ) = getPositionData();
        //            uint256 borrowAmount = (balanceUSDC * ltv) / BASE_PERCENT;
        //            _borrow(borrowAmount - 1e6); // $1 buffer for sanity (rounding error)
        //            balanceUSDC = getBalanceUSDC();
        //        }
        //
        //        _deposit(balanceUSDC);
    }

    /**
     * maxIterations - zero based max num of loops, can be greater than needed. Supports partial exits.
     */
    function exitPosition(uint256 maxIterations) external onlyOwner {
        //        for (uint256 index = 0; getBalanceDebtToken() > 0 && index < maxIterations; index++) {
        //            (uint256 totalCollateralETH, uint256 totalDebtETH, , , uint256 ltv, ) = getPositionData();
        //
        //            uint256 debtWithBufferETH = (totalDebtETH * BASE_PERCENT) / ltv;
        //            uint256 debtSafeRatio = ((totalCollateralETH - debtWithBufferETH) * 1 ether) / totalCollateralETH;
        //            uint256 amountToWithdraw = (getBalanceAUSDC() * debtSafeRatio) / 1 ether;
        //
        //            _withdraw(amountToWithdraw);
        //            _repay(getBalanceUSDC());
        //        }
        //        if (getBalanceDebtToken() == 0) {
        //            _withdraw(type(uint256).max);
        //        }
    }

    function withdrawAllUSDCToOwner() external onlyOwner {
        withdrawToOwner(USDC);
    }

    // ---- internals, public onlyOwner in case of emergency ----

    function _enterMarkets() public onlyOwner {
        address[] memory markets = new address[](1);
        markets[0] = VUSDC;
        IComptroller(UNITROLLER).enterMarkets(markets);
    }

    function _deposit(uint256 amount) public onlyOwner {
        require(IVToken(VUSDC).mint(amount) == 0, "mint failed");
        emit LogDeposit(amount);
    }

    function _withdraw(uint256 amount) public onlyOwner {
        require(IVToken(VUSDC).redeemUnderlying(amount) == 0, "withdraw failed");
        emit LogWithdraw(amount);
    }

    function _borrow(uint256 amount) public onlyOwner {
        require(IVToken(VUSDC).borrow(amount) == 0, "borrow failed");
        emit LogBorrow(amount);
    }

    function _repay(uint256 amount) public onlyOwner {
        require(IVToken(VUSDC).repayBorrow(amount) == 0, "repay failed");
        emit LogRepay(amount);
    }

    // ---- emergency ----

    function withdrawToOwner(address asset) public onlyOwner {
        uint256 balance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransfer(owner(), balance);
    }

    function emergencyFunctionCall(address target, bytes memory data) external onlyOwner {
        Address.functionCall(target, data);
    }

    function emergencyFunctionDelegateCall(address target, bytes memory data) external onlyOwner {
        Address.functionDelegateCall(target, data);
    }
}
