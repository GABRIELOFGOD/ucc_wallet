import { useState, useRef, useEffect } from 'react';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import * as bip39 from 'bip39';
import QRCode from 'qrcode';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { StargateClient } from "@cosmjs/stargate";

// import ethUtil from 'ethereumjs-util';
// import { bech32 } from 'bech32';

import { MdContentCopy, MdOutlineFileDownload } from "react-icons/md";
import { toast, Toaster } from 'sonner';

const RPC = 'https://evmos-rpc.publicnode.com';
const DENOM = 'atucc';
const DISPLAY_DENOM = 'UCC';
// const LCD = 'http://145.223.80.193:1317';
const LCD = 'http://145.223.80.193:26657';

export default function App() {
  const [step, setStep] = useState<'welcome' | 'new' | 'confirm' | 'import' | 'dashboard'>('welcome');
  const [mnemonic, setMnemonic] = useState('');
  const [confirmedMnemonic, setConfirmedMnemonic] = useState('');
  const [wallet, setWallet] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('');
  const [qr, setQr] = useState('');
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  const generateWallet = async () => {
    const mnemonic = bip39.generateMnemonic();
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'UCC' });
    const [account] = await wallet.getAccounts();
    setMnemonic(mnemonic);
    setWallet(wallet);
    setAddress(account.address);
    setStep('new');
  };

  const confirmMnemonic = async () => {
    if (confirmedMnemonic.trim() === mnemonic.trim()) {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(confirmedMnemonic, { prefix: 'UCC' });
      const [account] = await wallet.getAccounts();
      setWallet(wallet);
      setAddress(account.address);
      await fetchBalance(account.address);
      await generateQR(account.address);
      setStep('dashboard');
    } else {
      toast.error('Mnemonic does not match. Please try again.');
    }
  };

  const importWallet = async () => {
    if (!bip39.validateMnemonic(confirmedMnemonic)) {
      alert('Invalid mnemonic');
      return;
    }
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(confirmedMnemonic, { prefix: 'UCC' });
    const [account] = await wallet.getAccounts();
    setMnemonic(confirmedMnemonic);
    setWallet(wallet);
    setAddress(account.address);
    await fetchBalance(account.address);
    await generateQR(account.address);
    setStep('dashboard');
  };

  const fetchBalance = async (addr: string) => {
    try {
      const client = await StargateClient.connect(LCD); // RPC port
      const result = await client.getBalance(addr, DENOM);
      const amount = (parseFloat(result.amount) / 1e18).toFixed(2);
      setBalance(amount);
    } catch (err) {
      console.error("Failed to fetch via RPC:", err);
    }
  };

  // const fetchBalance = async (addr: string) => {
  //   try {
  //     const res = await fetch(`${LCD}/cosmos/bank/v1beta1/balances/${addr}`);
  //     const data = await res.json();
  //     const balanceObj = data.balances.find((b: any) => b.denom === DENOM);
  //     const amount = balanceObj ? (+balanceObj.amount / 1e18).toFixed(2) : '0';
  //     setBalance(amount);
  //   } catch (err) {
  //     console.error('Failed to fetch balance via LCD:', err);
  //     alert('Error fetching balance via REST. Please check the LCD endpoint.');
  //   }
  // };

  const generateQR = async (data: string) => {
    const url = await QRCode.toDataURL(data);
    setQr(url);
  };

  // function ethToUcc(eth: string) {
  //   const addressBuffer = ethUtil.toBuffer(eth);

  //   const words = bech32.toWords(addressBuffer);
  //   const uccAddress = bech32.encode('ucc', words);

  //   return uccAddress;
  // }

  // function uccToEth(uccAddress: string) {
  //   const decoded = bech32.decode(uccAddress);
  //   const addressBytes = Buffer.from(bech32.fromWords(decoded.words));
  //   const ethAddress = '0x' + addressBytes.toString('hex');
  //   return ethAddress;
  // }
  

  const sendTokens = async () => {
    if (!wallet || !to || !amount) {
      alert("Please fill in all fields before sending.");
      return;
    }

    try {
      const gasPrice = GasPrice.fromString("0.00001atucc");

      const client = await SigningStargateClient.connectWithSigner(RPC, wallet, {
        gasPrice,
      });

      const amountToSend = {
        denom: "atucc",
        amount: (parseFloat(amount) * 1e18).toFixed(0),
      };

      // Send transaction
      const result = await client.sendTokens(
        address,
        to,
        [amountToSend],
        "auto" // Let CosmJS calculate gas automatically
      );

      alert(`✅ Sent! Tx Hash: ${result.transactionHash}`);
      fetchBalance(address); // Refresh balance
    } catch (err: any) {
      console.error("Send failed:", err);
      alert(`❌ Send failed: ${err.message || err}`);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (step === 'dashboard') {
        const confirmExit = window.confirm('Are you sure you want to exit app?');
        if (!confirmExit) {
          // Push user back to dashboard
          history.pushState(null, '', window.location.href);
        } else {
          setStep('welcome');
        }
      }
    };
  
    window.addEventListener('popstate', handlePopState);
    history.pushState(null, '', window.location.href); // Prevent default back
  
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [step]);  

  const downloadCSV = () => {
    toast.loading("Downloading CSV...");
    const words = mnemonic.split(' ');
    let csvContent = 'Word #,Word\n';
    words.forEach((word, i) => {
      csvContent += `${i + 1},${word}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    if (downloadRef.current) {
      downloadRef.current.href = url;
      downloadRef.current.download = 'mnemonic.csv';
      downloadRef.current.click();
    }
    toast.dismiss();
    toast.success("CSV download successfully started!");
  };

  const copyPhrase = () => {
    navigator.clipboard.writeText(mnemonic);
    toast.success("Mnemonic copied to clipboard!");
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard!");
  }

  const showComingSoon = () => {
    toast('Coming soon!', {
      description: 'This feature is under development.',
      icon: '🚧',
      duration: 2000,
    });
  };
  
  return (
    <div className="flex justify-center items-center h-screen bg-white px-2 py-10 overflow-y-hidden">
      {/* <div className="w-full h-full justify-center flex flex-col items-center bg-white shadow-lg rounded-lg p-6"> */}
        {step === 'welcome' && (
          <div className='flex flex-col gap-5 items-center justify-center h-screen'>
            <div className='flex flex-col gap-5 items-center justify-center h-screen'>
              <div className="rounded-full bg-white p-3 border-2 border-black w-fit h-fit">
                <img src="/logo.png" alt="Logo" className='w-[200px] md:w-[400px]' />
              </div>
              <h1 className="text-4xl font-extrabold text-center ">Universe Wallet</h1>
              <p className="text-center text-lg font-semibold text-gray-500">Decentralised Web Wallet</p>
              <div className="flex gap-3 mt-6">
                <button onClick={generateWallet} className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 duration-200 cursor-pointer outline-none font-semibold shadow-sm">Create New Wallet</button>
                <button onClick={() => setStep('import')} className="border-2 border-slate-900 rounded-md px-4 py-2 bg-transparent text-slate-900 cursor-pointer font-semibold shadow-sm hover:bg-gray-50/20 duration-200">Import Existing Wallet</button>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-5 justify-center items-center py-5">
              <p className="text-lg font-medium text-center">Universe wallet is now the official cryptocurrency wallet of Universe Chain</p>
              <div className="flex gap-5">
                <button
                  onClick={showComingSoon}
                >
                  <img
                    src="Google.webp"
                    alt="Play store"
                    className="w-32 h-10 rounded-md"
                  />
                </button>
                <button
                  onClick={showComingSoon}
                >
                  <img
                    src="Appstore.png"
                    alt="Play store"
                    className="w-32 h-10 rounded-md"
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'new' && (
          <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
            {/* <h2 className="text-xl font-bold text-indigo-700">Your Mnemonic Phrase</h2> */}
            <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Your Secret Phrase</h2>
            <textarea className="rounded-md border-2 border-slate-600 outline-none p-3 font-semibold" rows={3} readOnly value={mnemonic} />
            <div className="flex gap-3">
              <button onClick={copyPhrase} className="flex px-4 py-2 w-full gap-3 justify-center items-center bg-slate-600 text-white rounded-md hover:bg-slate-700 duration-200 cursor-pointer outline-none font-semibold shadow-sm">
                <MdContentCopy size={18} className='my-auto' />
                <p className='my-auto'>Copy</p>
              </button>
              <button onClick={downloadCSV} className="flex px-4 py-2 w-full gap-3 justify-center items-center bg-slate-600 text-white rounded-md hover:bg-slate-700 duration-200 cursor-pointer outline-none font-semibold shadow-sm">
                <MdOutlineFileDownload size={18} className='my-auto' />
                <p className='my-auto'>Download CSV</p>
              </button>
              <a ref={downloadRef} style={{ display: 'none' }}>download</a>
            </div>
            <button onClick={() => setStep('confirm')} className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer">Proceed</button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
            <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Confirm Your Mnemonic</h2>
            <textarea className="rounded-md border-2 border-slate-600 outline-none p-3 font-semibold" rows={3} value={confirmedMnemonic} onChange={(e) => setConfirmedMnemonic(e.target.value)} />
            <button onClick={confirmMnemonic} className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer">Confirm</button>
          </div>
        )}

        {step === 'import' && (
          <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
            <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Paste Mnemonic to Import Wallet</h2>
            <textarea className="rounded-md border-2 border-slate-600 outline-none p-3 font-semibold" rows={3} value={confirmedMnemonic} onChange={(e) => setConfirmedMnemonic(e.target.value)} />
            <button onClick={importWallet} className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer">Import</button>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md h-full overflow-y-auto p-5 bg-gray-100">
            <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Dashboard</h2>
            <p className="text-sm"><strong>Address:</strong> {address}</p>
            <p className="text-sm mb-4"><strong>Balance:</strong> {balance} {DISPLAY_DENOM}</p>

            <div className="border-t pt-4 flex flex-col gap-3">
              <h3 className="font-bold mb-1 text-indigo-700">Send</h3>
              <input type="text" className="px-3 border-b-2 shadow-sm border-slate-800 rounded-md h-12 outline-none" placeholder="Recipient address" value={to} onChange={(e) => setTo(e.target.value)} />
              <p className="text-xs text-gray-500 mb-1 mt-5 text-right">Available: {balance} {DISPLAY_DENOM}</p>
              <input type="number" className="px-3 border-b-2 shadow-sm border-slate-800 rounded-md h-12 outline-none" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button onClick={sendTokens} className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer">Send</button>
            </div>

            <div className="border-t pt-4 flex flex-col gap-3">
              <h3 className="font-bold mb-1 text-indigo-700">Receive</h3>
              <p className="text-xs text-gray-500 mb-1">Scan or copy your address</p>
              {qr && <img src={qr} className="w-32 mx-auto mb-2" />}
              <button onClick={copyAddress} className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer">Copy Address</button>
            </div>
          </div>
        )}
        <Toaster position='top-right' />
      {/* </div> */}
    </div>
  );
}

// const style = document.createElement('style');
// style.innerHTML = `
//   .btn-primary {
//     background-color: #6366f1;
//     color: white;
//     padding: 0.5rem 1rem;
//     border-radius: 0.5rem;
//     font-weight: 600;
//     transition: background-color 0.2s;
//   }
//   .btn-primary:hover {
//     background-color: #4f46e5;
//   }
//   .btn-secondary {
//     background-color: #9ca3af;
//     color: white;
//     padding: 0.5rem 1rem;
//     border-radius: 0.5rem;
//     font-weight: 600;
//     transition: background-color 0.2s;
//   }
//   .btn-secondary:hover {
//     background-color: #6b7280;
//   }
//   .input {
//     width: 100%;
//     padding: 0.5rem;
//     margin-bottom: 0.5rem;
//     border: 1px solid #d1d5db;
//     border-radius: 0.5rem;
//   }
// `;
// document.head.appendChild(style);
