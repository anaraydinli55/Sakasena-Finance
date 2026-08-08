import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import fs from "fs";
import path from "path";

task("deploy-erc20", "Deploy the ConfidentialERC20 contract")
  .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;

    const [deployer] = await ethers.getSigners();

    console.log(`Deploying ConfidentialERC20 to ${network.name}...`);
    console.log(`Deploying with account: ${deployer.address}`);

    const Factory = await ethers.getContractFactory("ConfidentialERC20");

    const token = await Factory.deploy();

    await token.waitForDeployment();

    const address = await token.getAddress();

    console.log(`ConfidentialERC20 deployed to: ${address}`);

    // deployments klasörünü olustur
    const deploymentsDir = path.join(process.cwd(), "deployments");

    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    const deployment = {
      network: network.name,
      contract: "ConfidentialERC20",
      address,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(deploymentsDir, `${network.name}-erc20.json`),
      JSON.stringify(deployment, null, 2)
    );

    console.log("Deployment information saved.");
  });
