import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdContentCopy, MdOutlineFileDownload } from "react-icons/md";
import { toast } from 'sonner';
import { walletUtils, WalletInfo } from '../utils/walletUtils';
import { storageUtils } from '../utils/storageUtils';

export default function CreateWallet() {
  const navigate = useNavigate();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Check if wallet already exists in storage
    const storedWallet = storageUtils.getWallet();
    if (storedWallet) {
      // If wallet exists, redirect to dashboard
      navigate('/dashboard');
      return;
    }

    // Generate new wallet if none exists
    generateWallet();
  }, [navigate]);

  const generateWallet = async () => {
    try {
      const newWallet = await walletUtils.generateWallet();
      setWalletInfo(newWallet);
    } catch (error) {
      console.error('Failed to generate wallet:', error);
      toast.error('Failed to generate wallet. Please try again.');
    }
  };

  const downloadCSV = () => {
    if (!walletInfo) return;
    
    toast.loading("Downloading CSV...");
    const words = walletInfo.mnemonic.split(' ');
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
    if (!walletInfo) return;
    navigator.clipboard.writeText(walletInfo.mnemonic);
    toast.success("Mnemonic copied to clipboard!");
  };

  const proceedToConfirm = () => {
    if (!walletInfo) return;
    
    // Save wallet info to storage before proceeding
    if (storageUtils.saveWallet(walletInfo)) {
      navigate('/confirm', { state: walletInfo });
    } else {
      toast.error('Failed to save wallet details. Please try again.');
    }
  };

  if (!walletInfo) {
    return (
      <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
        <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Generating Wallet...</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
      <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Your Secret Phrase</h2>
      <textarea 
        className="rounded-md border-2 border-slate-600 outline-none p-3 font-semibold" 
        rows={3} 
        readOnly 
        value={walletInfo.mnemonic} 
      />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-600">Your addresses:</p>
        <div className="bg-gray-50 p-2 rounded text-sm font-mono break-all">
          <p><strong>Cosmos:</strong> {walletInfo.cosmosAddress}</p>
          <p><strong>Ethereum:</strong> {walletInfo.ethAddress}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={copyPhrase} 
          className="flex px-4 py-2 w-full gap-3 justify-center items-center bg-slate-600 text-white rounded-md hover:bg-slate-700 duration-200 cursor-pointer outline-none font-semibold shadow-sm"
        >
          <MdContentCopy size={18} className='my-auto' />
          <p className='my-auto'>Copy</p>
        </button>
        <button 
          onClick={downloadCSV} 
          className="flex px-4 py-2 w-full gap-3 justify-center items-center bg-slate-600 text-white rounded-md hover:bg-slate-700 duration-200 cursor-pointer outline-none font-semibold shadow-sm"
        >
          <MdOutlineFileDownload size={18} className='my-auto' />
          <p className='my-auto'>Download CSV</p>
        </button>
        <a ref={downloadRef} style={{ display: 'none' }}>download</a>
      </div>
      <button 
        onClick={proceedToConfirm}
        className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer"
      >
        Proceed
      </button>
    </div>
  );
} 