import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { FheTypes } from "@cofhe/sdk";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/node";
import { Ethers6Adapter } from "@cofhe/sdk/adapters";
import { chains } from "@cofhe/sdk/chains";

const TOKEN_ADDRESS = "0x0e0B526686Dd20A8CC60965EDf2Cd40680940Eb1";

task("allowance-erc20", "Get and decrypt the confidential allowance approved for a spender")
  .addParam("owner", "The token owner address")
  .addParam("spender", "The spender address")
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;

    const [signer] = await ethers.getSigners();
    const owner = args.owner;
    const spender = args.spender;

    console.log(`Network: ${network.name}`);
    console.log(`Querying allowance for Owner: ${owner} | Spender: ${spender}`);

    const token = await ethers.getContractAt(
      "ConfidentialERC20",
      TOKEN_ADDRESS,
      signer
    );

    console.log("Fetching encrypted allowance handle from contract...");
    const ctHash = await token.allowance(owner, spender);
    
    console.log(`Encrypted Allowance Handle: ${ctHash.toString()}`);

    console.log("Initializing CoFHE client...");
    const { publicClient, walletClient } = await Ethers6Adapter(ethers.provider, signer);

    const config = createCofheConfig({
      supportedChains: [chains.sepolia],
    });

    const cofheClient = createCofheClient(config);
    await cofheClient.connect(publicClient, walletClient);

    console.log("Requesting and signing EIP-712 permit for decryption...");
    await cofheClient.permits.getOrCreateSelfPermit();

    console.log("Decrypting allowance off-chain via Threshold Network...");
    const decryptedAllowance = await cofheClient
      .decryptForView(ctHash, FheTypes.Uint64)
      .execute();

    console.log("\n==========================================");
    console.log(`Owner: ${owner}`);
    console.log(`Spender: ${spender}`);
    console.log(`Confidential Allowance: ${decryptedAllowance.toString()}`);
    console.log("==========================================\n");
  });
