import { expect } from "chai";
import { ethers } from "hardhat";

describe("ConfidentialERC20 security guards", function () {
  async function deployToken() {
    const [owner, attacker] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ConfidentialERC20");
    const token: any = await Token.deploy();
    await token.waitForDeployment();
    return { token, owner, attacker };
  }

  const emptyEncryptedAmount = {
    ctHash: 0,
    securityZone: 0,
    utype: 0,
    signature: "0x",
  };

  it("rejects mint attempts from non-owners before processing encrypted input", async function () {
    const { token, owner, attacker } = await deployToken();

    await expect(
      token.connect(attacker).mint(owner.address, emptyEncryptedAmount)
    )
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
      .withArgs(attacker.address);
  });

  it("keeps redemption disabled rather than burning funds without returning real assets", async function () {
    const { token } = await deployToken();

    await expect(token.unshield(emptyEncryptedAmount)).to.be.revertedWith(
      "Unshield disabled: real asset redemption is not implemented"
    );
  });
});
