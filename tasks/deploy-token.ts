console.log(">>> deploy-token.ts LOADED <<<");

import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("deploy-token", "Deploy the ConfidentialToken contract")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();

    console.log(`Deploying ConfidentialToken to ${network.name}...`);
    console.log(`Deploying with account: ${deployer.address}`);

    const TokenFactory = await ethers.getContractFactory("ConfidentialToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    const address = await token.getAddress();
    console.log(`ConfidentialToken deployed to: ${address}`);
  });