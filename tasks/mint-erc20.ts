import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Encryptable } from "@cofhe/sdk";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/node";
import { Ethers6Adapter } from "@cofhe/sdk/adapters";
import { chains } from "@cofhe/sdk/chains";

const TOKEN_ADDRESS = "0x0e0B526686Dd20A8CC60965EDf2Cd40680940Eb1";

task("mint-erc20", "Mint encrypted cERC tokens")
  .addOptionalParam("amount", "Amount to mint", "100")
  .addOptionalParam(
    "to",
    "Address receiving the tokens"
  )
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;

    const [signer] = await ethers.getSigners();

    const recipient = args.to || signer.address;
    const amount = BigInt(args.amount);

    console.log(`Network: ${network.name}`);
    console.log(`Minter: ${signer.address}`);
    console.log(`Recipient: ${recipient}`);
    console.log(`Amount: ${amount}`);

    if (amount <= 0n) {
      throw new Error("Amount must be greater than zero");
    }

    console.log("Creating CoFHE client...");

    // 1. Ethers v6 Saglayicisini ve Signer'i CoFHE adapter ile donusturuyoruz
    const { publicClient, walletClient } = await Ethers6Adapter(ethers.provider, signer);

    // 2. Hardhat eklenti katmanini pas gecip, dogrudan saf SDK ile Sepolia zincir ayarlarini yapiyoruz
    const config = createCofheConfig({
      supportedChains: [chains.sepolia],
    });

    // 3. Istemciyi olusturup manuel olarak baglantiyi tamamliyoruz
    const cofheClient = createCofheClient(config);
    await cofheClient.connect(publicClient, walletClient);

    console.log("Encrypting amount...");

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

    console.log("Calling mint()...");

    const tx = await token.mint(
      recipient,
      encryptedAmount
    );

    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();

    console.log(
      `Mint confirmed in block: ${receipt?.blockNumber}`
    );

    console.log("Encrypted mint completed successfully.");
  });
