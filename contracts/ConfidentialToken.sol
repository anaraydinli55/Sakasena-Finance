// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract ConfidentialToken {
    string public name = "ConfidentialToken";
    string public symbol = "CTKN";

    mapping(address => euint32) internal balances;
    address public owner;

    event Transfer(address indexed from, address indexed to);
    event Mint(address indexed to);

    constructor() {
        owner = msg.sender;
    }

    // Yalnız owner yeni token "mint" edə bilər (şifrəli miqdarda)
    function mint(address to, InEuint32 calldata encryptedAmount) public {
        require(msg.sender == owner, "Only owner can mint");

        euint32 amount = FHE.asEuint32(encryptedAmount);
        balances[to] = FHE.add(balances[to], amount);

        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);

        emit Mint(to);
    }

    // Şifrəli miqdarda transfer
    function transfer(address to, InEuint32 calldata encryptedAmount) public {
        euint32 amount = FHE.asEuint32(encryptedAmount);

        // Kifayət qədər balans olub-olmadığını yoxla (şifrəli müqayisə)
        ebool canTransfer = FHE.gte(balances[msg.sender], amount);

        // Balansdan azalt / hədəfə əlavə et (şərti FHE əməliyyatı)
        euint32 amountToSend = FHE.select(canTransfer, amount, FHE.asEuint32(0));

        balances[msg.sender] = FHE.sub(balances[msg.sender], amountToSend);
        balances[to] = FHE.add(balances[to], amountToSend);

        FHE.allowThis(balances[msg.sender]);
        FHE.allowSender(balances[msg.sender]);

        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);

        emit Transfer(msg.sender, to);
    }

    // Öz balansını oxumaq (şifrəli hash qaytarır, sonra client-side deşifrə olunur)
    function balanceOf(address account) public view returns (euint32) {
        return balances[account];
    }
}