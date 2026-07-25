import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
import './HouseTreePerson.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const MONAD_EXPLORER = 'https://monad-testnet.socialscan.io';

const HouseTreePerson = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [base64Data, setBase64Data] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');

  // Blockchain state
  const [wallet, setWallet] = useState(null);
  const [chainTx, setChainTx] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalysis('');
    setError('');
    setChainTx(null);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);

    const b64 = await toBase64(file);
    const pure = b64.split(',')[1];
    setBase64Data(pure);
    await callAnalyze(pure);
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const callAnalyze = async (pureBase64) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: pureBase64 }),
      });
      const data = await res.json();
      if (data.success) setAnalysis(data.analysis);
      else setError(data.analysis || '分析失败，请稍后重试');
    } catch {
      setError('网络连接失败，请检查服务是否已启动');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => document.getElementById('htp-file-input').click();

  const handleReset = () => {
    setImagePreview(null); setBase64Data(''); setAnalysis(''); setError('');
    setLoading(false); setChainTx(null);
  };

  // ---- Wallet ----
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) return setError('请安装 MetaMask 或 Rabby 等钱包');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const addr = await signer.getAddress();
      const net = await provider.getNetwork();
      const chainId = Number(net.chainId);
      if (chainId !== 10143) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x279F' }], // 10143 in hex
          });
        } catch {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x279F',
              chainName: 'Monad Testnet',
              rpcUrls: ['https://testnet-rpc.monad.xyz'],
              nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
              blockExplorerUrls: ['https://monad-testnet.socialscan.io'],
            }],
          });
        }
      }
      setWallet({ address: addr, contract, provider, signer });
      setError('');
    } catch (e) {
      setError('钱包连接失败: ' + e.message);
    }
  }, []);

  // ---- Record to chain ----
  const recordToChain = useCallback(async () => {
    if (!wallet) return;
    setChainLoading(true);
    setChainTx(null);
    try {
      const summary = analysis.slice(0, 200);
      const imageCid = base64Data.slice(0, 32); // first 32 chars as image ref
      const tx = await wallet.contract.createRecord(imageCid, summary, analysis);
      setChainTx({ status: 'pending', hash: tx.hash });
      const receipt = await tx.wait();
      setChainTx({ status: 'confirmed', hash: receipt.hash, block: receipt.blockNumber });
    } catch (e) {
      setChainTx({ status: 'error', message: e.message });
    } finally {
      setChainLoading(false);
    }
  }, [wallet, analysis, base64Data]);

  const shortAddr = (addr) => addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';

  return (
    <div className="htp-container">
      <header className="htp-header">
        <h1 className="htp-title">房树人·情绪显影</h1>
        <p className="htp-subtitle">
          画一幅包含房子、树和人的画，拍照上传，让我陪你一起看看你画里的故事。
        </p>
      </header>

      <main className="htp-main">
        <section className="htp-upload-section">
          <input
            id="htp-file-input" type="file" accept="image/*" capture="environment"
            onChange={handleImageUpload} className="htp-file-input"
          />
          {!imagePreview ? (
            <button className="htp-upload-button" onClick={handleUploadClick}>
              <span className="htp-upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/>
                </svg>
              </span>
              上传你的画作
            </button>
          ) : (
            <div className="htp-preview-wrapper">
              <img src={imagePreview} alt="你上传的画作" className="htp-preview" />
              {!loading && (
                <div className="htp-preview-actions">
                  <button className="htp-reupload-button" onClick={handleUploadClick}>重新选择</button>
                  <button className="htp-reset-button" onClick={handleReset}>重新开始</button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="htp-result-section">
          {loading && (
            <div className="htp-result-loading">
              <div className="htp-spinner" />
              <p className="htp-loading-text">AI 正在解读你的画作……</p>
            </div>
          )}

          {!loading && analysis && (
            <div className="htp-result-content">
              <div className="htp-result-bubble">{analysis}</div>

              {/* 链上记录区块 */}
              <div className="htp-chain-section">
                {!wallet ? (
                  <button className="htp-chain-btn htp-connect-btn" onClick={connectWallet}>
                    <span className="htp-chain-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2zm-2 0H5v10h14V7zm-2 5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/></svg>
                    </span>
                    连接钱包 · 上链存证
                  </button>
                ) : (
                  <>
                    <div className="htp-wallet-info">
                      <span className="htp-wallet-dot" />
                      {shortAddr(wallet.address)}
                    </div>
                    {chainTx && chainTx.status === 'confirmed' ? (
                      <div className="htp-chain-status htp-chain-success">
                        ✅ 已记录到链上
                        <a href={`${MONAD_EXPLORER}/tx/${chainTx.hash}`} target="_blank" rel="noreferrer" className="htp-tx-link">
                          查看交易
                        </a>
                      </div>
                    ) : (
                      <button
                        className="htp-chain-btn htp-record-btn"
                        onClick={recordToChain}
                        disabled={chainLoading}
                      >
                        {chainLoading ? (
                          <><span className="htp-spinner-small" /> 上链中…</>
                        ) : chainTx && chainTx.status === 'pending' ? (
                          <><span className="htp-spinner-small" /> 等待确认…</>
                        ) : (
                          '📝 记录到 Monad 链上'
                        )}
                      </button>
                    )}
                    {chainTx && chainTx.status === 'error' && (
                      <div className="htp-chain-status htp-chain-error">上链失败: {chainTx.message}</div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="htp-result-error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !analysis && !error && (
            <div className="htp-result-placeholder">
              {imagePreview ? (
                <p className="htp-result-hint">AI 解读即将呈现……</p>
              ) : (
                <>
                  <div className="htp-result-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor" opacity="0.4"/>
                    </svg>
                  </div>
                  <p className="htp-result-text">上传画作后，AI 将为你解读画中的情绪密码</p>
                </>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="htp-footer">
        <p>房树人投射测验 · 仅供情绪参考</p>
      </footer>
    </div>
  );
};

export default HouseTreePerson;
