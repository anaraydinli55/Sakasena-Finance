import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { FheTypes } from "@cofhe/sdk";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/node";
import { Ethers6Adapter } from "@cofhe/sdk/adapters";
import { chains } from "@cofhe/sdk/chains";

const TOKEN_ADDRESS = "0x0e0B526686Dd20A8CC60965EDf2Cd40680940Eb1";

task("balance-erc20", "Get and decrypt the confidential balance of an account")
  .addOptionalParam("address", "The address to query the balance for")
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;

    const [signer] = await ethers.getSigners();
    const targetAddress = args.address || signer.address;

    console.log(`Network: ${network.name}`);
    console.log(`Querying balance for: ${targetAddress}`);

    // 1. Kontrat ile baglanti kuruyoruz
    const token = await ethers.getContractAt(
      "ConfidentialERC20",
      TOKEN_ADDRESS,
      signer
    );

    console.log("Fetching encrypted balance handle from contract...");
    
    // Kontrattaki balanceOf() metodunu cagiriyoruz. Bize ciphertext handle (BigInt) donecektir.
    const ctHash = await token.balanceOf(targetAddress);
    
    console.log(`Encrypted Balance Handle: ${ctHash.toString()}`);

    // 2. CoFHE istemcisini bagliyoruz
    console.log("Initializing CoFHE client for decryption...");
    const { publicClient, walletClient } = await Ethers6Adapter(ethers.provider, signer);

    const config = createCofheConfig({
      supportedChains: [chains.sepolia],
    });

    const cofheClient = createCofheClient(config);
    await cofheClient.connect(publicClient, walletClient);

    // 3. EIP-712 Permit olusturuyoruz (veya yerel depodan cekiyoruz)
    console.log("Requesting and signing EIP-712 permit for decryption...");
    await cofheClient.permits.getOrCreateSelfPermit();

    console.log("Decrypting balance off-chain via Threshold Network...");

    // 4. EIP-712 Permit ile decryptForView islemini gerceklestiriyoruz
    const decryptedBalance = await cofheClient
      .decryptForView(ctHash, FheTypes.Uint64)
      .execute();

    console.log("\n==========================================");
    console.log(`Address: ${targetAddress}`);
    console.log(`Confidential Balance: ${decryptedBalance.toString()}`);
    console.log("==========================================\n");
  });
