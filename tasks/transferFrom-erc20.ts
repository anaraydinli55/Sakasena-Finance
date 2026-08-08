import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Encryptable } from "@cofhe/sdk";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/node";
import { Ethers6Adapter } from "@cofhe/sdk/adapters";
import { chains } from "@cofhe/sdk/chains";

const TOKEN_ADDRESS = "0x0e0B526686Dd20A8CC60965EDf2Cd40680940Eb1";

task("transferFrom-erc20", "Transfer encrypted tokens on behalf of another account")
  .addParam("from", "Owner address")
  .addParam("to", "Recipient address")
  .addOptionalParam("amount", "Amount to transfer", "1")
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;

    const [signer] = await ethers.getSigners();
    const fromAddress = args.from;
    const recipient = args.to;
    const amount = BigInt(args.amount);

    console.log(`Network: ${network.name}`);
    console.log(`Spender (Caller): ${signer.address}`);
    console.log(`From (Owner): ${fromAddress}`);
    console.log(`To (Recipient): ${recipient}`);
    console.log(`Amount: ${amount}`);

    if (amount <= 0n) {
      throw new Error("Amount must be greater than zero");
    }

    console.log("Creating CoFHE client...");
    const { publicClient, walletClient } = await Ethers6Adapter(ethers.provider, signer);

    const config = createCofheConfig({
      supportedChains: [chains.sepolia],
    });

    const cofheClient = createCofheClient(config);
    await cofheClient.connect(publicClient, walletClient);

    console.log("Encrypting transferFrom amount...");
    const [encryptedAmount] = await cofheClient
      .encryptInputs([
        Encryptable.uint64(amount),
      ])
      .execute();

    console.log("Amount encrypted.");

    const token = await ethers.getContractAt(
      "ConfidentialERC20",
      TOKEN_ADDRESS,
      signer
    );

    console.log("Calling transferFrom()...");
    const tx = await token.transferFrom(fromAddress, recipient, encryptedAmount);

    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();

    console.log(`transferFrom confirmed in block: ${receipt?.blockNumber}`);
    console.log("Encrypted transferFrom completed successfully.");
  });
