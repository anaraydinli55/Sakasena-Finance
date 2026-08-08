import { useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import { FheTypes, Encryptable } from "@cofhe/sdk";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { Ethers6Adapter } from "@cofhe/sdk/adapters";

// Zincirleri daha guvenli ve bagimsiz degiskenler olarak dogrudan import ediyoruz!
import { sepolia, arbSepolia, baseSepolia } from "@cofhe/sdk/chains";

import "./index.css";

const CONTRACT_ADDRESSES: { [chainId: number]: string } = {
  11155111: "0x0e0B526686Dd20A8CC60965EDf2Cd40680940Eb1",
  421614: "0x44a35f412433dB0fFB6112A584D0839B044778aF",  
  84532: "0xcf39F6428381e77993240a36F208c499326056A8"   
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
  "function allowance(address owner, address spender) external view returns (uint256)"
];

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"mint" | "transfer" | "approve">("mint");
  
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [balanceHandle, setBalanceHandle] = useState<string | null>(null);
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  
  const [cofheClient, setCofheClient] = useState<any | null>(null);
  const [status, setStatus] = useState<string>("Sakasena siber agina baglanmak icin cuzdaninizi yetkilendirin.");
  const [loading, setLoading] = useState<boolean>(false);
  const [txLogs, setTxLogs] = useState<TxLog[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  // Form Girdileri
  const [mintAmount, setMintAmount] = useState<string>("10");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("1");
  const [approveSpender, setApproveSpender] = useState<string>("");
  const [approveAmount, setApproveAmount] = useState<string>("5");

  const currentContractAddress = chainId ? CONTRACT_ADDRESSES[chainId] : null;

  // Cuzdan degisimlerini dinleyen siber gozcu
  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.on("chainChanged", (hexChainId: string) => {
        const decodedChainId = parseInt(hexChainId, 16);
        setChainId(decodedChainId);
        setIsPrivacyOpen(false);
        setDecryptedBalance(null);
        setBalanceHandle(null);
      });
    }
  }, []);

  // 🌟 OTM-RECONNECT: Ag degistigi an siber motoru yeni aga otomatik baglar!
  useEffect(() => {
    if (account && chainId) {
      connectWallet();
    }
  }, [chainId]);

  function handlePercentClick(percent: number) {
    if (decryptedBalance === null) return;
    const total = parseFloat(decryptedBalance);
    const calculated = Math.floor((total * percent) / 100);
    
    if (activeTab === "transfer") {
      setTransferAmount(calculated.toString());
    } else if (activeTab === "approve") {
      setApproveAmount(calculated.toString());
    }
  }

  async function handleNetworkSwitch(targetChainId: number) {
    if (!(window as any).ethereum) return;
    const hexChainId = "0x" + targetChainId.toString(16);
    try {
      setStatus("Cuzdaninizdan ag degistirme talebi onaylaniyor...");
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

  async function connectWallet() {
    try {
      setLoading(true);
      setStatus("MetaMask siber kapisi aciliyor...");
      if (!(window as any).ethereum) {
        throw new Error("Tarayicinizda MetaMask yuklu olmalidir!");
      }

      const provider = new BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);
      setAccount(accounts[0]);

      setStatus("CoFHE coklu-zincir siber motoru yukleniyor...");
      const { publicClient, walletClient } = await Ethers6Adapter(provider, signer);

      const config = createCofheConfig({
        supportedChains: [sepolia, arbSepolia, baseSepolia],
      });

      const client = createCofheClient(config);
      await client.connect(publicClient, walletClient);

      setCofheClient(client);
      setStatus(`Sakasena siber agina baglanildi. Aktif Zincir: ${NETWORK_NAMES[currentChainId] || "Bilinmeyen"}`);
    } catch (error: any) {
      console.error(error);
      setStatus(`Hata: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function togglePrivacy() {
    if (isPrivacyOpen) {
      setIsPrivacyOpen(false);
      setDecryptedBalance(null);
      setStatus("Bakiye maskelendi.");
      return;
    }

    if (!account || !cofheClient || !currentContractAddress) {
      setStatus("Lutfen cuzdaninizi baglayin ve desteklenen bir aga gecin!");
      return;
    }

    try {
      setLoading(true);
      setStatus("Sifreli bakiye anahtari sorgulaniyor...");

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(currentContractAddress, CONTRACT_ABI, signer);

      const ctHandle = await tokenContract.balanceOf(account);
      setBalanceHandle(ctHandle.toString());

      setStatus("EIP-712 Permit anahtar dogrulamasi isteniyor...");
      await cofheClient.permits.getOrCreateSelfPermit();

      setStatus("Threshold Network gizli anahtari cozuyor...");
      const balance = await cofheClient
        .decryptForView(ctHandle, FheTypes.Uint64)
        .execute();

      setDecryptedBalance(balance.toString());
      setIsPrivacyOpen(true);
      setStatus("Siber bakiye maskesi kaldirildi.");
    } catch (error: any) {
      console.error(error);
      setStatus(`Kripto Hatasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleMint() {
    if (!account || !cofheClient || !currentContractAddress) return;
    try {
      setLoading(true);
      setActiveStep(1);
      setStatus("ADIM 1: Miktar siber motor tarafindan homomorfik olarak sifreleniyor...");

      const amountBigInt = BigInt(mintAmount);
      const [encryptedAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(amountBigInt)])
        .execute();

      setActiveStep(2);
      setStatus("ADIM 2: Islem siber anahtar dogrulamasi icin imzalanmaya hazirlaniyor...");

      setActiveStep(3);
      setStatus("ADIM 3: Islem siber aga gonderiliyor. Cuzdan onayiniz bekleniyor...");
      
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(currentContractAddress, CONTRACT_ABI, signer);

      const tx = await tokenContract.mint(account, encryptedAmount);
      setStatus(`Islem gonderildi: ${tx.hash.slice(0, 16)}... Onay bekleniyor...`);
      await tx.wait();

      const newLog: TxLog = {
        id: Math.random().toString(),
        type: "Mint",
        amount: mintAmount,
        target: account,
        hash: tx.hash
      };
      setTxLogs(prev => [newLog, ...prev]);

      setStatus("sakETH basimi basariyla onaylandi!");
      if (isPrivacyOpen) {
        setIsPrivacyOpen(false);
        togglePrivacy();
      }
    } catch (error: any) {
      console.error(error);
      setStatus(`Hata: ${error.message}`);
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
      setStatus("ADIM 1: Gonderim miktari siber korumali olarak sifreleniyor...");

      const amountBigInt = BigInt(transferAmount);
      const [encryptedAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(amountBigInt)])
        .execute();

      setActiveStep(2);
      setStatus("ADIM 2: Siber transfer veri paketi imzalanmaya hazirlaniyor...");

      setActiveStep(3);
      setStatus("ADIM 3: Sifreli transfer emri Sepolia agina iletiliyor...");
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(currentContractAddress, CONTRACT_ABI, signer);

      const tx = await tokenContract.transfer(transferTo, encryptedAmount);
      setStatus(`Islem gonderildi: ${tx.hash.slice(0, 16)}... Blok onayi bekleniyor...`);
      await tx.wait();

      const newLog: TxLog = {
        id: Math.random().toString(),
        type: "Transfer",
        amount: transferAmount,
        target: transferTo,
        hash: tx.hash
      };
      setTxLogs(prev => [newLog, ...prev]);

      setStatus("Gizli transfer basariyla tamamlandi!");
      if (isPrivacyOpen) {
        setIsPrivacyOpen(false);
        togglePrivacy();
      }
    } catch (error: any) {
      console.error(error);
      setStatus(`Hata: ${error.message}`);
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
      setStatus("ADIM 1: Onaylanacak siber limit siber motorla sifreleniyor...");

      const amountBigInt = BigInt(approveAmount);
      const [encryptedAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(amountBigInt)])
        .execute();

      setActiveStep(2);
      setStatus("ADIM 2: Limit yetkilendirmesi siber imza icin paketleniyor...");

      setActiveStep(3);
      setStatus("ADIM 3: Limit yetkisi kontrata yaziliyor...");
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(currentContractAddress, CONTRACT_ABI, signer);

      const tx = await tokenContract.approve(approveSpender, encryptedAmount);
      setStatus(`Islem gonderildi: ${tx.hash.slice(0, 16)}... Onay bekleniyor...`);
      await tx.wait();

      const newLog: TxLog = {
        id: Math.random().toString(),
        type: "Approve",
        amount: approveAmount,
        target: approveSpender,
        hash: tx.hash
      };
      setTxLogs(prev => [newLog, ...prev]);

      setStatus("Sifreli harcama yetkilendirmesi onaylandi!");
    } catch (error: any) {
      console.error(error);
      setStatus(`Hata: ${error.message}`);
    } finally {
      setLoading(false);
      setActiveStep(null);
    }
  }

  return (
    <div>
      <header className="cyber-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "10px", height: "10px", background: "var(--color-accent)", borderRadius: "50%", boxShadow: "0 0 10px var(--color-accent)" }}></div>
          <span style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "1.5px", background: "linear-gradient(90deg, #fff, var(--text-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            SAKASENA FINANCE
          </span>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {account && (
            <select 
              className="network-select" 
              value={chainId || 11155111} 
              onChange={(e) => handleNetworkSwitch(Number(e.target.value))}
              disabled={loading}
            >
              <option value={11155111}>Ethereum Sepolia</option>
              <option value={421614}>Arbitrum Sepolia</option>
              <option value={84532}>Base Sepolia</option>
            </select>
          )}

          {!account ? (
            <button className="btn-primary" style={{ width: "auto", padding: "10px 20px" }} onClick={connectWallet} disabled={loading}>
              Cuzdani Bagla
            </button>
          ) : (
            <div className="cyber-badge" style={{ border: "1px solid var(--color-accent)", background: "rgba(0, 245, 255, 0.05)" }}>
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          )}
        </div>
      </header>

      <div className="dapp-layout">
        <div className="dapp-hero-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "40px" }}>
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
                  {activeTab === "mint" && "Mint sakETH"}
                  {activeTab === "transfer" && "Private Transfer"}
                  {activeTab === "approve" && "DeFi Approval"}
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {activeTab === "mint" && "Mint encrypted Sakasena sakETH tokens."}
                  {activeTab === "transfer" && "Transfer encrypted sakETH tokens privately."}
                  {activeTab === "approve" && "Set confidential allowances for other spenders."}
                </p>
                <p style={{ fontSize: "11px", color: "var(--color-primary)", fontWeight: "600", marginTop: "8px", letterSpacing: "1px" }}>
                  BALANCE: {isPrivacyOpen && decryptedBalance !== null ? `${decryptedBalance} sakETH` : "•••• sakETH"}
                </p>
              </div>

              <button 
                className={`privacy-toggle ${isPrivacyOpen ? "active" : ""}`} 
                onClick={togglePrivacy}
                disabled={loading}
                title={isPrivacyOpen ? "Gizle" : "Bakiyeyi Sifreli Coz ve Goster"}
              >
                {isPrivacyOpen ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <div className="tab-container">
              <button className={`tab-btn ${activeTab === "mint" ? "active" : ""}`} onClick={() => setActiveTab("mint")}>
                Mint
              </button>
              <button className={`tab-btn ${activeTab === "transfer" ? "active" : ""}`} onClick={() => setActiveTab("transfer")}>
                Transfer
              </button>
              <button className={`tab-btn ${activeTab === "approve" ? "active" : ""}`} onClick={() => setActiveTab("approve")}>
                Approve
              </button>
            </div>

            {activeTab === "mint" && (
              <div>
                <div className="deposit-box">
                  <div className="deposit-header">
                    <span>You Deposit</span>
                    <span>sakETH Token</span>
                  </div>
                  <div className="deposit-input-row">
                    <input 
                      type="number" 
                      className="deposit-num-input" 
                      value={mintAmount} 
                      onChange={(e) => setMintAmount(e.target.value)} 
                      disabled={loading || !account} 
                    />
                    <div className="token-badge">
                      <div className="token-dot"></div>
                      sakETH
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", fontWeight: "600" }}>
                    <span>Balance: {isPrivacyOpen && decryptedBalance !== null ? decryptedBalance : "••••"}</span>
                    {account && (
                      <span style={{ color: "var(--color-accent)", cursor: "pointer" }} onClick={() => setMintAmount("100")}>MAX</span>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                    <span>sakETH Token</span>
                  </div>
                  <div className="deposit-input-row">
                    <input 
                      type="number" 
                      className="deposit-num-input" 
                      value={transferAmount} 
                      onChange={(e) => setTransferAmount(e.target.value)} 
                      disabled={loading || !account} 
                    />
                    <div className="token-badge">
                      <div className="token-dot"></div>
                      sakETH
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", fontWeight: "600" }}>
                    <span>Balance: {isPrivacyOpen && decryptedBalance !== null ? decryptedBalance : "••••"}</span>
                  </div>
                </div>
              </div>
            )}

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
                    <span>sakETH Token</span>
                  </div>
                  <div className="deposit-input-row">
                    <input 
                      type="number" 
                      className="deposit-num-input" 
                      value={approveAmount} 
                      onChange={(e) => setApproveAmount(e.target.value)} 
                      disabled={loading || !account} 
                    />
                    <div className="token-badge">
                      <div className="token-dot"></div>
                      sakETH
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "mint" && account && decryptedBalance !== null && (
              <div className="slider-container">
                <div className="slider-track">
                  <div className="slider-fill" style={{ width: "100%" }}></div>
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
                Cuzdani Siber Aga Bagla
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
                  &gt; Aktif Siber Ag: {NETWORK_NAMES[chainId] || "Gecersiz Ag"} ({chainId})
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
                      <span>{log.amount} sakETH</span>
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