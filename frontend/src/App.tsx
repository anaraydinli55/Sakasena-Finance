import { useState, useEffect } from "react";
import { BrowserProvider, Contract, formatEther, formatUnits } from "ethers";
import { FheTypes, Encryptable } from "@cofhe/sdk";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { Ethers6Adapter } from "@cofhe/sdk/adapters";

import "./index.css";

// 🌟 SIBER ZINCIR AYARLARINI HARICI IMPORT OLMADAN DOĞRUDAN TANIMLIYORUZ (Sifir Hata Garantisi!)
const sepoliaChain = {
  id: 11155111,
  name: "Sepolia",
  network: "sepolia",
  coFheUrl: "https://testnet-cofhe.fhenix.zone",
  verifierUrl: "https://testnet-cofhe-vrf.fhenix.zone",
  thresholdNetworkUrl: "https://testnet-cofhe-tn.fhenix.zone",
  environment: "TESTNET" as const
};

const arbSepoliaChain = {
  id: 421614,
  name: "Arbitrum Sepolia",
  network: "arb-sepolia",
  coFheUrl: "https://testnet-cofhe.fhenix.zone",
  verifierUrl: "https://testnet-cofhe-vrf.fhenix.zone",
  thresholdNetworkUrl: "https://testnet-cofhe-tn.fhenix.zone",
  environment: "TESTNET" as const
};

const baseSepoliaChain = {
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  coFheUrl: "https://testnet-cofhe.fhenix.zone",
  verifierUrl: "https://testnet-cofhe-vrf.fhenix.zone",
  thresholdNetworkUrl: "https://testnet-cofhe-tn.fhenix.zone",
  environment: "TESTNET" as const
};

const CONTRACT_ADDRESSES: { [chainId: number]: string } = {
  11155111: "0x6F5f63D9724AD79Dae1348199aB6dbBF135a8Cc4",
  421614: "0x43F62bf115d07a32fe0537CE5b9b6eB61A36F483",  
  84532: "0xA830acED3E05549d6FA2D71261cA4a4114279b13"   
};

const NETWORK_NAMES: { [chainId: number]: string } = {
  11155111: "Ethereum Sepolia",
  421614: "Arbitrum Sepolia",
  84532: "Base Sepolia"
};

const CONTRACT_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function mint(address to, (uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) amount) external",
  "function transfer(address to, (uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) amount) external returns (bool)",
  "function approve(address spender, (uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function unshield((uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) amount) external"
];

interface TokenConfig {
  symbol: string;
  publicAddresses: { [chainId: number]: string };
  privateAddresses: { [chainId: number]: string };
  decimals: number;
}

interface TxLog {
  id: string;
  type: "Mint" | "Transfer" | "Approve" | "Unshield";
  amount: string;
  target: string;
  hash: string;
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"mint" | "unshield" | "transfer" | "approve">("mint");
  
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [balanceHandle, setBalanceHandle] = useState<string | null>(null);
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [publicEthBalance, setPublicEthBalance] = useState<string | null>(null);
  const [publicBalance, setPublicBalance] = useState<string | null>(null);
  const [sliderPercent, setSliderPercent] = useState<number>(0);
  
  const [cofheClient, setCofheClient] = useState<any | null>(null);
  const [status, setStatus] = useState<string>("Please authorize your wallet to connect to Sakasena Finance.");
  const [loading, setLoading] = useState<boolean>(false);
  const [txLogs, setTxLogs] = useState<TxLog[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [showDisconnect, setShowDisconnect] = useState<boolean>(false);
  const [showTokenSelect, setShowTokenSelect] = useState<boolean>(false);

  // DINAMIK SIBER COIN LISTESI
  const [tokens, setTokens] = useState<TokenConfig[]>([
    {
      symbol: "sakETH",
      publicAddresses: {
        11155111: "0x0000000000000000000000000000000000000000",
        421614: "0x0000000000000000000000000000000000000000",
        84532: "0x0000000000000000000000000000000000000000"
      },
      privateAddresses: {
        11155111: "0x6F5f63D9724AD79Dae1348199aB6dbBF135a8Cc4",
        421614: "0x43F62bf115d07a32fe0537CE5b9b6eB61A36F483",
        84532: "0xA830acED3E05549d6FA2D71261cA4a4114279b13"
      },
      decimals: 18
    },
    {
      symbol: "sakUSDC",
      publicAddresses: {
        11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", 
        421614: "0x75faf114eafb1BD239ee39415693418300681BCE",   
        84532: "0x034934E2777df4c7F5b2df50D8A5890736173b9E"    
      },
      privateAddresses: {
        11155111: "0x6F5f63D9724AD79Dae1348199aB6dbBF135a8Cc4",
        421614: "0x43F62bf115d07a32fe0537CE5b9b6eB61A36F483",
        84532: "0xA830acED3E05549d6FA2D71261cA4a4114279b13"
      },
      decimals: 6
    },
    {
      symbol: "sakUSDT",
      publicAddresses: {
        11155111: "0xaA8E23Fb1079EA71e0a56F48a2aa51851D8433D0", 
        421614: "0x1111111111111111111111111111111111111111",
        84532: "0x2222222222222222222222222222222222222222"
      },
      privateAddresses: {
        11155111: "0x6F5f63D9724AD79Dae1348199aB6dbBF135a8Cc4",
        421614: "0x43F62bf115d07a32fe0537CE5b9b6eB61A36F483",
        84532: "0xA830acED3E05549d6FA2D71261cA4a4114279b13"
      },
      decimals: 6
    }
  ]);
  const [activeTokenSymbol, setActiveTokenSymbol] = useState<string>("sakETH");

  const [showAddCoin, setShowAddCoin] = useState<boolean>(false);
  const [newCoinAddress, setNewAddCoinAddress] = useState<string>("");

  // Form Girdileri
  const [mintAmount, setMintAmount] = useState<string>("10");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("1");
  const [approveSpender, setApproveSpender] = useState<string>("");
  const [approveAmount, setApproveAmount] = useState<string>("5");
  const [unshieldAmount, setUnshieldAmount] = useState<string>("2");

  const activeToken = tokens.find(t => t.symbol === activeTokenSymbol);
  const currentContractAddress = chainId && activeToken ? activeToken.privateAddresses[chainId] : null;

  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.on("chainChanged", (hexChainId: string) => {
        const decodedChainId = parseInt(hexChainId, 16);
        setChainId(decodedChainId);
        setIsPrivacyOpen(false);
        setDecryptedBalance(null);
        setBalanceHandle(null);
        setPublicEthBalance(null);
      });
    }
  }, []);

  // OTM-RECONNECT: Ag degistiginde siber motoru otomatik baglar
  useEffect(() => {
    if (account && chainId) {
      initConnection();
    }
  }, [chainId]);

  useEffect(() => {
    const totalSource = activeTab === "mint" ? publicBalance : decryptedBalance;
    if (!totalSource) {
      setSliderPercent(0);
      return;
    }
    const total = parseFloat(totalSource);
    if (total <= 0) {
      setSliderPercent(0);
      return;
    }
    
    let current = 0;
    if (activeTab === "mint") current = parseFloat(mintAmount || "0");
    else if (activeTab === "transfer") current = parseFloat(transferAmount || "0");
    else if (activeTab === "approve") current = parseFloat(approveAmount || "0");
    else if (activeTab === "unshield") current = parseFloat(unshieldAmount || "0");
    
    const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
    setSliderPercent(pct);
  }, [mintAmount, transferAmount, approveAmount, unshieldAmount, activeTab, publicBalance, decryptedBalance]);

  // Bakiye Tazeleyici
  async function refreshBalances(prov?: any, acc?: string) {
    const activeProvider = prov || new BrowserProvider((window as any).ethereum);
    const activeAccount = acc || account;
    if (!activeAccount || !chainId || !activeToken) return;

    try {
      const publicAddress = activeToken.publicAddresses[chainId];
      if (activeToken.symbol === "sakETH" || activeToken.symbol === "ETH") {
        const ethBalanceRaw = await activeProvider.getBalance(activeAccount);
        setPublicBalance(parseFloat(formatEther(ethBalanceRaw)).toFixed(4));
        setPublicEthBalance(parseFloat(formatEther(ethBalanceRaw)).toFixed(4));
      } else {
        try {
          const publicContract = new Contract(publicAddress, ["function balanceOf(address) external view returns (uint256)"], activeProvider);
          const rawBalance = await publicContract.balanceOf(activeAccount);
          const decs = activeToken.decimals;
          setPublicBalance(parseFloat(formatUnits(rawBalance, decs)).toFixed(4));
        } catch (e) {
          console.warn("Public balance error", e);
          setPublicBalance("0.0000");
        }
      }

      const privateAddress = activeToken.privateAddresses[chainId];
      if (isPrivacyOpen && privateAddress && cofheClient) {
        const signer = await activeProvider.getSigner();
        const tokenContract = new Contract(privateAddress, CONTRACT_ABI, signer);
        const ctHandle = await tokenContract.balanceOf(activeAccount);
        setBalanceHandle(ctHandle.toString());

        const balance = await cofheClient
          .decryptForView(ctHandle, FheTypes.Uint64)
          .execute();
        setDecryptedBalance(balance.toString());
      }
    } catch (err) {
      console.error("Balance refresh error:", err);
    }
  }

  function handlePercentClick(percent: number) {
    const totalSource = activeTab === "mint" ? publicBalance : decryptedBalance;
    if (!totalSource) return;

    const total = parseFloat(totalSource);
    let calculated = (total * percent) / 100;
    
    if (activeTab === "mint") {
      if (percent === 100) {
        calculated = Math.max(0, calculated - 0.005);
      }
      setMintAmount(calculated.toFixed(4));
    } else {
      const integerAmount = Math.floor(calculated);
      if (activeTab === "transfer") {
        setTransferAmount(integerAmount.toString());
      } else if (activeTab === "approve") {
        setApproveAmount(integerAmount.toString());
      } else if (activeTab === "unshield") {
        setUnshieldAmount(integerAmount.toString());
      }
    }
    setSliderPercent(percent);
  }

  // Dinamik Coin Ekleme
  async function handleAddCustomCoin() {
    if (!newCoinAddress || !chainId) {
      setStatus("Error: Please provide a valid contract address!");
      return;
    }
    try {
      setLoading(true);
      setStatus("Fetching token metadata from the siber blockchain...");
      
      const provider = new BrowserProvider((window as any).ethereum);
      const tempContract = new Contract(newCoinAddress, ["function symbol() external view returns (string)"], provider);
      const symbol = await tempContract.symbol();
      
      const newConfig: TokenConfig = {
        symbol: symbol,
        publicAddresses: {
          [chainId]: "0x0000000000000000000000000000000000000000"
        },
        privateAddresses: {
          [chainId]: newCoinAddress
        },
        decimals: 18
      };
      
      setTokens(prev => [...prev, newConfig]);
      setActiveTokenSymbol(symbol);
      setShowAddCoin(false);
      setNewAddCoinAddress("");
      setStatus(`Success: Automatically detected siber token symbol: ${symbol}!`);
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: Failed to fetch siber token metadata! ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    setAccount(null);
    setChainId(null);
    setCofheClient(null);
    setDecryptedBalance(null);
    setBalanceHandle(null);
    setPublicBalance(null);
    setPublicEthBalance(null);
    setIsPrivacyOpen(false);
    setShowDisconnect(false);
    setStatus("Wallet connection disconnected successfully.");
  }

  async function handleNetworkSwitch(targetChainId: number) {
    if (!(window as any).ethereum) return;
    const hexChainId = "0x" + targetChainId.toString(16);
    try {
      setStatus("Wallet network switch request sent...");
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          const chainParamsMap: { [key: number]: any } = {
            421614: {
              chainId: "0x66eed",
              chainName: "Arbitrum Sepolia",
              rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://sepolia.arbiscan.io"]
            },
            84532: {
              chainId: "0x14a34",
              chainName: "Base Sepolia",
              rpcUrls: ["https://sepolia.base.org"],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://sepolia.basescan.org"]
            }
          };
          if (chainParamsMap[targetChainId]) {
            await (window as any).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [chainParamsMap[targetChainId]],
            });
          }
        } catch (addError) {
          console.error(addError);
        }
      }
      console.error(error);
    }
  }

  // SESSİZ BAĞLANTI (Donguyu onlemek icin onay paneli acmadan senkronize olur!)
  async function initConnection() {
    try {
      setStatus("MetaMask gateway connecting...");
      const provider = new BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      setChainId(currentChainId);
      setAccount(accounts[0]);

      setStatus("CoFHE multi-chain siber cryptographic engine initializing...");
      const { publicClient, walletClient } = await Ethers6Adapter(provider, signer);

      const config = createCofheConfig({
        supportedChains: [sepoliaChain, arbSepoliaChain, baseSepoliaChain],
      });

      const client = createCofheClient(config);
      await client.connect(publicClient, walletClient);

      setCofheClient(client);
      setStatus(`Connected to Sakasena. Active Network: ${NETWORK_NAMES[currentChainId] || "Unknown"}`);
      
      refreshBalances(provider, accounts[0]);
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    }
  }

  // MANUEL BAĞLANTI
  async function connectWallet() {
    try {
      setLoading(true);
      setStatus("MetaMask siber kapisi aciliyor...");
      if (!(window as any).ethereum) {
        throw new Error("Tarayicinizda MetaMask yuklu olmalidir!");
      }

      await (window as any).ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });

      await initConnection();
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleMint() {
    if (!account || !cofheClient || !currentContractAddress) return;
    try {
      setLoading(true);
      setActiveStep(1);
      setStatus("STEP 1: Amount is being encrypted on-client with homomorphic proof...");

      const amountBigInt = BigInt(Math.floor(parseFloat(mintAmount)));
      const [encryptedAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(amountBigInt)])
        .execute();

      setActiveStep(2);
      setStatus("STEP 2: Preparing transaction package with signed ZK-Proof...");

      setActiveStep(3);
      setStatus("STEP 3: Submitting transaction to the blockchain. Wallet approval required... ");
      
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(currentContractAddress, CONTRACT_ABI, signer);

      const tx = await tokenContract.mint(account, encryptedAmount);
      setStatus(`Tx submitted: ${tx.hash.slice(0, 16)}... Onay bekleniyor...`);
      await tx.wait();

      const newLog: TxLog = {
        id: Math.random().toString(),
        type: "Mint",
        amount: mintAmount,
        target: account,
        hash: tx.hash
      };
      setTxLogs(prev => [newLog, ...prev]);

      setStatus(`Successfully shielded asset and minted ${activeTokenSymbol}!`);
      refreshBalances(provider, account);
      setIsPrivacyOpen(false);
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setActiveStep(null);
    }
  }

  async function handleTransfer() {
    if (!account || !cofheClient || !transferTo || !currentContractAddress) return;
    try {
      setLoading(true);
      setActiveStep(1);
      setStatus("STEP 1: Transfer amount is being encrypted with FHE wrapper...");

      const amountBigInt = BigInt(transferAmount);
      const [encryptedAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(amountBigInt)])
        .execute();

      setActiveStep(2);
      setStatus("STEP 2: Formulating siber transfer signature payload...");

      setActiveStep(3);
      setStatus("STEP 3: Broadcasting encrypted transfer transaction...");
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(currentContractAddress, CONTRACT_ABI, signer);

      const tx = await tokenContract.transfer(transferTo, encryptedAmount);
      setStatus(`Tx broadcasted: ${tx.hash.slice(0, 16)}... Confirming...`);
      await tx.wait();

      const newLog: TxLog = {
        id: Math.random().toString(),
        type: "Transfer",
        amount: transferAmount,
        target: transferTo,
        hash: tx.hash
      };
      setTxLogs(prev => [newLog, ...prev]);

      setStatus("Private transfer completed successfully!");
      refreshBalances(provider, account);
      setIsPrivacyOpen(false);
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setActiveStep(null);
    }
  }

  async function handleApprove() {
    if (!account || !cofheClient || !approveSpender || !currentContractAddress) return;
    try {
      setLoading(true);
      setActiveStep(1);
      setStatus("STEP 1: Allowance limit is being encrypted...");

      const amountBigInt = BigInt(approveAmount);
      const [encryptedAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(amountBigInt)])
        .execute();

      setActiveStep(2);
      setStatus("STEP 2: Signing siber allowance authorization payload...");

      setActiveStep(3);
      setStatus("STEP 3: Broadcasting siber approval transaction...");
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(currentContractAddress, CONTRACT_ABI, signer);

      const tx = await tokenContract.approve(approveSpender, encryptedAmount);
      setStatus(`Tx broadcasted: ${tx.hash.slice(0, 16)}... Confirming...`);
      await tx.wait();

      const newLog: TxLog = {
        id: Math.random().toString(),
        type: "Approve",
        amount: approveAmount,
        target: approveSpender,
        hash: tx.hash
      };
      setTxLogs(prev => [newLog, ...prev]);

      setStatus("Confidential allowance limit approved!");
      refreshBalances(provider, account);
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setActiveStep(null);
    }
  }

  async function handleUnshield() {
    if (!account || !cofheClient || !currentContractAddress) return;
    try {
      setLoading(true);
      setActiveStep(1);
      setStatus("STEP 1: Burn/Unshield amount is being encrypted...");

      const amountBigInt = BigInt(unshieldAmount);
      const [encryptedAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(amountBigInt)])
        .execute();

      setActiveStep(2);
      setStatus("STEP 2: Formulation burn & unshield signature payload...");

      setActiveStep(3);
      setStatus("STEP 3: Sending unshield command. Wallet approval required...");
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(currentContractAddress, CONTRACT_ABI, signer);

      const tx = await tokenContract.unshield(encryptedAmount);
      setStatus(`Tx submitted: ${tx.hash.slice(0, 16)}... Confirming...`);
      await tx.wait();

      const newLog: TxLog = {
        id: Math.random().toString(),
        type: "Unshield",
        amount: unshieldAmount,
        target: account,
        hash: tx.hash
      };
      setTxLogs(prev => [newLog, ...prev]);

      setStatus(`Successfully unshielded ${activeTokenSymbol} back to public!`);
      refreshBalances(provider, account);
      setIsPrivacyOpen(false);
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setActiveStep(null);
    }
  }

  return (
    <div className="dapp-container">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <h1 className="hero-title">
          <span className="text-gradient-cyan">Sakasena</span><br />
          Finance.<br />
          Shield Your Assets.
        </h1>
        <p className="hero-desc">
          True on-chain privacy with FHERC20, powered by Fhenix CoFHE.
          Encrypted balances, private transfers, and secure withdrawals in one interface.
        </p>

        <div className="badge-row">
          <div className="cyber-badge">🔒 Encrypted Balances</div>
          <div className="cyber-badge">🎯 Private Transfers</div>
          <div className="cyber-badge">⚙️ Fhenix CoFHE</div>
        </div>
      </div>

      <div className="cyber-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h3 style={{ fontSize: "20px", fontWeight: "700" }}>
              {activeTab === "mint" && `Mint ${activeTokenSymbol}`}
              {activeTab === "transfer" && "Private Transfer"}
              {activeTab === "approve" && "DeFi Approval"}
              {activeTab === "unshield" && `Unshield ${activeTokenSymbol}`}
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              {activeTab === "mint" && `Mint encrypted Sakasena ${activeTokenSymbol} tokens.`}
              {activeTab === "transfer" && `Transfer encrypted ${activeTokenSymbol} tokens privately.`}
              {activeTab === "approve" && `Set confidential allowances for other spenders.`}
              {activeTab === "unshield" && `Unshield (burn) ${activeTokenSymbol} back to public.`}
            </p>
            <p style={{ fontSize: "11px", color: "var(--color-primary)", fontWeight: "600", marginTop: "8px", letterSpacing: "1px" }}>
              BALANCE: {isPrivacyOpen && decryptedBalance !== null ? `${decryptedBalance} ${activeTokenSymbol}` : `•••• ${activeTokenSymbol}`}
            </p>
          </div>

          <button 
            className={`privacy-toggle ${isPrivacyOpen ? "active" : ""}`} 
            onClick={togglePrivacy}
            disabled={loading}
            title={isPrivacyOpen ? "Hide" : "Decrypt & View Balance"}
            style={{ display: "flex", alignItems: "center", gap: "8px", width: "auto", padding: "8px 12px", borderRadius: "6px" }}
          >
            {isPrivacyOpen ? (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.45 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
            <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {isPrivacyOpen ? "Encrypt" : "Decrypt"}
            </span>
          </button>
        </div>

        <div className="tab-container">
          <button className={`tab-btn ${activeTab === "mint" ? "active" : ""}`} onClick={() => setActiveTab("mint")}>
            Shield
          </button>
          <button className={`tab-btn ${activeTab === "unshield" ? "active" : ""}`} onClick={() => setActiveTab("unshield")}>
            Unshield
          </button>
          <button className={`tab-btn ${activeTab === "transfer" ? "active" : ""}`} onClick={() => setActiveTab("transfer")}>
            Transfer
          </button>
          <button className={`tab-btn ${activeTab === "approve" ? "active" : ""}`} onClick={() => setActiveTab("approve")}>
            Approve
          </button>
        </div>

        {/* ACTIVE TAB BODY */}
        {/* 1. MINT SECTION */}
        {activeTab === "mint" && (
          <div>
            <div className="deposit-box">
              <div className="deposit-header">
                <span>You Deposit</span>
                <span>{activeTokenSymbol} Token</span>
              </div>
              <div className="deposit-input-row">
                <input 
                  type="number" 
                  className="deposit-num-input" 
                  value={mintAmount} 
                  onChange={(e) => setMintAmount(e.target.value)} 
                  disabled={loading || !account} 
                />
                
                {/* YENI COIN SEÇİCİ DROPDOWN (Yüksek okunabilirlikli koin isimleri!) */}
                <div style={{ position: "relative" }}>
                  <button 
                    className="token-badge" 
                    onClick={() => setShowTokenSelect(!showTokenSelect)}
                    style={{ cursor: "pointer", border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.04)" }}
                  >
                    <div className="token-dot"></div>
                    {activeTokenSymbol}
                  </button>
                  {showTokenSelect && (
                    <div className="glass-panel" style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", padding: "8px", zIndex: 20, display: "flex", flexDirection: "column", minWidth: "120px" }}>
                      {tokens.map(t => (
                        <button 
                          key={t.symbol} 
                          className="sidebar-link" 
                          style={{ fontSize: "12px", padding: "8px", background: "transparent", border: "none", color: "#FFFFFF", textAlign: "left", width: "100%", cursor: "pointer", fontWeight: "700" }}
                          onClick={() => {
                            setActiveTokenSymbol(t.symbol);
                            setShowTokenSelect(false);
                            setIsPrivacyOpen(false);
                            setDecryptedBalance(null);
                            setBalanceHandle(null);
                          }}
                        >
                          {t.symbol}
                        </button>
                      ))}
                      <button 
                        className="sidebar-link" 
                        style={{ fontSize: "12px", padding: "8px", background: "transparent", border: "none", color: "var(--color-accent)", textAlign: "left", width: "100%", cursor: "pointer", fontWeight: "700" }}
                        onClick={() => {
                          setShowAddCoin(true);
                          setShowTokenSelect(false);
                        }}
                      >
                        ➕ Add Custom
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", fontWeight: "600" }}>
                <span>Balance: {publicBalance ? `${publicBalance} ${activeTokenSymbol === "sakETH" ? "ETH" : activeTokenSymbol.replace("sak", "")}` : "••••"}</span>
                {account && (
                  <span style={{ color: "var(--color-accent)", cursor: "pointer" }} onClick={() => setMintAmount("100")}>MAX</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. TRANSFER SECTION */}
        {activeTab === "transfer" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <input 
                type="text" 
                className="cyber-input" 
                placeholder="Recipient Address (0x...)" 
                value={transferTo} 
                onChange={(e) => setTransferTo(e.target.value)} 
                disabled={loading || !account} 
              />
            </div>
            <div className="deposit-box">
              <div className="deposit-header">
                <span>You Send</span>
                <span>{activeTokenSymbol} Token</span>
              </div>
              <div className="deposit-input-row">
                <input 
                  type="number" 
                  className="deposit-num-input" 
                  value={transferAmount} 
                  onChange={(e) => setTransferAmount(e.target.value)} 
                  disabled={loading || !account} 
                />
                
                {/* YENI COIN SEÇİCİ DROPDOWN */}
                <div style={{ position: "relative" }}>
                  <button 
                    className="token-badge" 
                    onClick={() => setShowTokenSelect(!showTokenSelect)}
                    style={{ cursor: "pointer", border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.04)" }}
                  >
                    <div className="token-dot"></div>
                    {activeTokenSymbol}
                  </button>
                  {showTokenSelect && (
                    <div className="glass-panel" style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", padding: "8px", zIndex: 20, display: "flex", flexDirection: "column", minWidth: "120px" }}>
                      {tokens.map(t => (
                        <button 
                          key={t.symbol} 
                          className="sidebar-link" 
                          style={{ fontSize: "12px", padding: "8px", background: "transparent", border: "none", color: "#FFFFFF", textAlign: "left", width: "100%", cursor: "pointer", fontWeight: "700" }}
                          onClick={() => {
                            setActiveTokenSymbol(t.symbol);
                            setShowTokenSelect(false);
                            setIsPrivacyOpen(false);
                            setDecryptedBalance(null);
                            setBalanceHandle(null);
                          }}
                        >
                          {t.symbol}
                        </button>
                      ))}
                      <button 
                        className="sidebar-link" 
                        style={{ fontSize: "12px", padding: "8px", background: "transparent", border: "none", color: "var(--color-accent)", textAlign: "left", width: "100%", cursor: "pointer", fontWeight: "700" }}
                        onClick={() => {
                          setShowAddCoin(true);
                          setShowTokenSelect(false);
                        }}
                      >
                        ➕ Add Custom
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", fontWeight: "600" }}>
                <span>Balance: {isPrivacyOpen && decryptedBalance !== null ? decryptedBalance : "••••"}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. APPROVE SECTION */}
        {activeTab === "approve" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                  <input 
                    type="text" 
                    className="cyber-input" 
                    placeholder="Spender Address (0x...)" 
                    value={approveSpender} 
                    onChange={(e) => setApproveSpender(e.target.value)} 
                    disabled={loading || !account} 
                  />
                </div>
                <div className="deposit-box">
                  <div className="deposit-header">
                    <span>Authorize Limit</span>
                    <span>{activeTokenSymbol} Token</span>
                  </div>
                  <div className="deposit-input-row">
                    <input 
                      type="number" 
                      className="deposit-num-input" 
                      value={approveAmount} 
                      onChange={(e) => setApproveAmount(e.target.value)} 
                      disabled={loading || !account} 
                    />
                    
                    {/* YENI COIN SEÇİCİ DROPDOWN */}
                    <div style={{ position: "relative" }}>
                      <button 
                        className="token-badge" 
                        onClick={() => setShowTokenSelect(!showTokenSelect)}
                        style={{ cursor: "pointer", border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.04)" }}
                      >
                        <div className="token-dot"></div>
                        {activeTokenSymbol}
                      </button>
                      {showTokenSelect && (
                        <div className="glass-panel" style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", padding: "8px", zIndex: 20, display: "flex", flexDirection: "column", minWidth: "120px" }}>
                          {tokens.map(t => (
                            <button 
                              key={t.symbol} 
                              className="sidebar-link" 
                              style={{ fontSize: "12px", padding: "8px", background: "transparent", border: "none", color: "#FFFFFF", textAlign: "left", width: "100%", cursor: "pointer", fontWeight: "700" }}
                              onClick={() => {
                                setActiveTokenSymbol(t.symbol);
                                setShowTokenSelect(false);
                                setIsPrivacyOpen(false);
                                setDecryptedBalance(null);
                                setBalanceHandle(null);
                              }}
                            >
                              {t.symbol}
                            </button>
                          ))}
                          <button 
                            className="sidebar-link" 
                            style={{ fontSize: "12px", padding: "8px", background: "transparent", border: "none", color: "var(--color-accent)", textAlign: "left", width: "100%", cursor: "pointer", fontWeight: "700" }}
                            onClick={() => {
                              setShowAddCoin(true);
                              setShowTokenSelect(false);
                            }}
                          >
                            ➕ Add Custom
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. UNSHIELD SECTION */}
            {activeTab === "unshield" && (
              <div>
                <div className="deposit-box">
                  <div className="deposit-header">
                    <span>Unshield Amount</span>
                    <span>{activeTokenSymbol} Token</span>
                  </div>
                  <div className="deposit-input-row">
                    <input 
                      type="number" 
                      className="deposit-num-input" 
                      value={unshieldAmount} 
                      onChange={(e) => setUnshieldAmount(e.target.value)} 
                      disabled={loading || !account} 
                    />
                    
                    {/* YENI COIN SEÇİCİ DROPDOWN */}
                    <div style={{ position: "relative" }}>
                      <button 
                        className="token-badge" 
                        onClick={() => setShowTokenSelect(!showTokenSelect)}
                        style={{ cursor: "pointer", border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.04)" }}
                      >
                        <div className="token-dot"></div>
                        {activeTokenSymbol}
                      </button>
                      {showTokenSelect && (
                        <div className="glass-panel" style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", padding: "8px", zIndex: 20, display: "flex", flexDirection: "column", minWidth: "120px" }}>
                          {tokens.map(t => (
                            <button 
                              key={t.symbol} 
                              className="sidebar-link" 
                              style={{ fontSize: "12px", padding: "8px", background: "transparent", border: "none", color: "#FFFFFF", textAlign: "left", width: "100%", cursor: "pointer", fontWeight: "700" }}
                              onClick={() => {
                                setActiveTokenSymbol(t.symbol);
                                setShowTokenSelect(false);
                                setIsPrivacyOpen(false);
                                setDecryptedBalance(null);
                                setBalanceHandle(null);
                              }}
                            >
                              {t.symbol}
                            </button>
                          ))}
                          <button 
                            className="sidebar-link" 
                            style={{ fontSize: "12px", padding: "8px", background: "transparent", border: "none", color: "var(--color-accent)", textAlign: "left", width: "100%", cursor: "pointer", fontWeight: "700" }}
                            onClick={() => {
                              setShowAddCoin(true);
                              setShowTokenSelect(false);
                            }}
                          >
                            ➕ Add Custom
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", fontWeight: "600" }}>
                    <span>Balance: {isPrivacyOpen && decryptedBalance !== null ? decryptedBalance : "••••"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Percentage Slider (🌟 DINAMIK DEQIQ SLIDER CHIZGISI) */}
            {account && (
              <div className="slider-container">
                <div className="slider-track">
                  <div className="slider-fill" style={{ width: `${sliderPercent}%` }}></div>
                </div>
                <div className="slider-steps">
                  <button className="slider-step-btn" onClick={() => handlePercentClick(0)}>0%</button>
                  <button className="slider-step-btn" onClick={() => handlePercentClick(25)}>25%</button>
                  <button className="slider-step-btn" onClick={() => handlePercentClick(50)}>50%</button>
                  <button className="slider-step-btn" onClick={() => handlePercentClick(75)}>75%</button>
                  <button className="slider-step-btn" onClick={() => handlePercentClick(100)}>100%</button>
                </div>
              </div>
            )}

            {account && (
              <div className="steps-container">
                <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                  Sakasena Steps
                </p>
                <div className={`step-item ${activeStep === 1 ? "active" : ""} ${activeStep && activeStep > 1 ? "completed" : ""}`}>
                  <div className="step-circle">1</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)" }}>STEP 1</span>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>PREPARE (ENCRYPT INPUTS)</span>
                  </div>
                </div>
                <div className={`step-item ${activeStep === 2 ? "active" : ""} ${activeStep && activeStep > 2 ? "completed" : ""}`}>
                  <div className="step-circle">2</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)" }}>STEP 2</span>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>APPROVE & SIGN PROOF</span>
                  </div>
                </div>
                <div className={`step-item ${activeStep === 3 ? "active" : ""}`}>
                  <div className="step-circle">3</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)" }}>STEP 3</span>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>SUBMIT TRANSACTION</span>
                  </div>
                </div>
              </div>
            )}

            {!account ? (
              <button className="btn-primary" onClick={connectWallet} disabled={loading}>
                {loading && <div className="spinner" style={{ marginRight: "8px" }}></div>}
                Connect Wallet
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {activeTab === "mint" && (
                  <button className="btn-primary" onClick={handleMint} disabled={loading}>
                    {loading && <div className="spinner" style={{ marginRight: "8px" }}></div>}
                    Shield Asset (Mint)
                  </button>
                )}
                {activeTab === "transfer" && (
                  <button className="btn-primary" style={{ background: "var(--color-accent)", boxShadow: "0 4px 12px rgba(0, 245, 255, 0.2)" }} onClick={handleTransfer} disabled={loading}>
                    {loading && <div className="spinner" style={{ marginRight: "8px" }}></div>}
                    Send Privately
                  </button>
                )}
                {activeTab === "approve" && (
                  <button className="btn-primary" onClick={handleApprove} disabled={loading}>
                    {loading && <div className="spinner" style={{ marginRight: "8px" }}></div>}
                    Authorize Spender
                  </button>
                )}
                {activeTab === "unshield" && (
                  <button className="btn-primary" onClick={handleUnshield} disabled={loading} style={{ background: "red", color: "#fff", boxShadow: "0 4px 12px rgba(255, 0, 0, 0.2)" }}>
                    {loading && <div className="spinner" style={{ marginRight: "8px" }}></div>}
                    Unshield Asset (Burn)
                  </button>
                )}
              </div>
            )}

            <div style={{ marginTop: "24px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                Terminal Log
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px", fontFamily: "monospace" }}>
                &gt; {status}
              </p>
              {chainId && (
                <p style={{ fontSize: "11px", color: "var(--color-primary)", marginTop: "4px", fontFamily: "monospace" }}>
                  &gt; Active Network: {NETWORK_NAMES[chainId] || "Unsupported Network"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bottom-panel">
          <div className="activity-box">
            <h3 className="activity-header">Recent activity</h3>
            <p className="activity-desc">
              Local history for the current wallet session. Mint, transfer, and approve events appear here after each transaction completes.
            </p>

            {txLogs.length === 0 ? (
              <div className="activity-empty">
                <span style={{ fontSize: "24px" }}>🔄</span>
                <p>No activity yet</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Connect your wallet or make a transaction to see session history.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {txLogs.map(log => (
                  <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "13px" }}>
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      <span style={{ padding: "4px 8px", background: log.type === "Mint" ? "rgba(0,255,102,0.08)" : "rgba(0,245,255,0.08)", borderRadius: "4px", color: log.type === "Mint" ? "var(--color-primary)" : "var(--color-secondary)", fontSize: "11px", fontWeight: "700" }}>
                        {log.type.toUpperCase()}
                      </span>
                      <span>{log.amount} {activeTokenSymbol}</span>
                      <span style={{ color: "var(--text-muted)" }}>-&gt; {log.target.slice(0, 10)}...</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--color-primary)" }}>
                      Tx: {log.hash.slice(0, 12)}...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-label">Entries</span>
              <span className="stat-value">{txLogs.length < 10 ? `0${txLogs.length}` : txLogs.length}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Latest Event</span>
              <span className="stat-value" style={{ color: txLogs.length > 0 ? "var(--color-primary)" : "var(--text-muted)", fontSize: "16px" }}>
                {txLogs.length > 0 ? txLogs[0].type.toUpperCase() : "IDLE"}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Wallet State</span>
              <span className="stat-value" style={{ color: account ? "var(--color-primary)" : "var(--text-muted)", fontSize: "16px" }}>
                {account ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}