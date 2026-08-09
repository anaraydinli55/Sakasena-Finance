// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract ConfidentialERC20 is Ownable {

    string public constant name = "Confidential Sakasena ETH";
    string public constant symbol = "sakETH";
    uint8 public constant decimals = 18;

    mapping(address => euint64) internal balances;
    mapping(address => mapping(address => euint64)) internal allowances;

    euint64 internal totalSupply;

    event Mint(address indexed to);
    event Transfer(address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);
    event Unshield(address indexed account);

    constructor() Ownable(msg.sender) {
        totalSupply = FHE.asEuint64(0);
        FHE.allowThis(totalSupply);
    }

    function balanceOf(address account) public view returns (euint64) {
        return balances[account];
    }

    function allowance(address owner, address spender) public view returns (euint64) {
        return allowances[owner][spender];
    }

    function mint(
        address to,
        InEuint64 memory amount
    ) public {
        euint64 encryptedAmount = FHE.asEuint64(amount);

        balances[to] = FHE.add(balances[to], encryptedAmount);
        totalSupply = FHE.add(totalSupply, encryptedAmount);

        FHE.allowThis(balances[to]);
        FHE.allowSender(balances[to]);
        FHE.allow(balances[to], to);

        FHE.allowThis(totalSupply);

        emit Mint(to);
    }

    function transfer(
        address to,
        InEuint64 memory encryptedAmount
    ) public returns (bool) {
        euint64 amount = FHE.asEuint64(encryptedAmount);

        ebool canTransfer = FHE.gte(balances[msg.sender], amount);
        euint64 amountToTransfer = FHE.select(canTransfer, amount, FHE.asEuint64(0));

        balances[msg.sender] = FHE.sub(balances[msg.sender], amountToTransfer);
        balances[to] = FHE.add(balances[to], amountToTransfer);

        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);

        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);

        emit Transfer(msg.sender, to);

        return true;
    }

    function approve(
        address spender,
        InEuint64 memory amount
    ) public returns (bool) {
        euint64 encryptedAmount = FHE.asEuint64(amount);
        allowances[msg.sender][spender] = encryptedAmount;

        FHE.allowThis(allowances[msg.sender][spender]);
        FHE.allow(allowances[msg.sender][spender], msg.sender);
        FHE.allow(allowances[msg.sender][spender], spender);

        emit Approval(msg.sender, spender);

        return true;
    }

    function transferFrom(
        address from,
        address to,
        InEuint64 memory encryptedAmount
    ) public returns (bool) {
        euint64 amount = FHE.asEuint64(encryptedAmount);

        ebool canTransferBalance = FHE.gte(balances[from], amount);
        ebool canTransferAllowance = FHE.gte(allowances[from][msg.sender], amount);
        ebool canTransfer = FHE.and(canTransferBalance, canTransferAllowance);

        euint64 amountToTransfer = FHE.select(canTransfer, amount, FHE.asEuint64(0));

        balances[from] = FHE.sub(balances[from], amountToTransfer);
        balances[to] = FHE.add(balances[to], amountToTransfer);
        allowances[from][msg.sender] = FHE.sub(allowances[from][msg.sender], amountToTransfer);

        FHE.allowThis(balances[from]);
        FHE.allow(balances[from], from);

        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);

        FHE.allowThis(allowances[from][msg.sender]);
        FHE.allow(allowances[from][msg.sender], from);
        FHE.allow(allowances[from][msg.sender], msg.sender);

        emit Transfer(from, to);

        return true;
    }

    // ?? SAFE UNSHIELD (FHE Mimarisine Tam Uyumlu Sifreli Yakma/Geri Çekme)
    function unshield(
        InEuint64 memory encryptedAmount
    ) public {
        euint64 amount = FHE.asEuint64(encryptedAmount);

        balances[msg.sender] = FHE.sub(balances[msg.sender], amount);
        totalSupply = FHE.sub(totalSupply, amount);

        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);
        FHE.allowThis(totalSupply);

        emit Unshield(msg.sender);
    }
}
