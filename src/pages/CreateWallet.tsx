import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import * as bip39 from 'bip39';
import { MdContentCopy, MdOutlineFileDownload } from "react-icons/md";
import { toast } from 'sonner';

export default function CreateWallet() {
  const navigate = useNavigate();
  const [mnemonic, setMnemonic] = useState('');
  const [wallet, setWallet] = useState<any>(null);
  const [address, setAddress] = useState('');
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const generateWallet = async () => {
    const mnemonic = bip39.generateMnemonic();
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'UCC' });
    const [account] = await wallet.getAccounts();
    setMnemonic(mnemonic);
    setWallet(wallet);
    setAddress(account.address);
  };

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
  };

  // Generate wallet on component mount
  useState(() => {
    generateWallet();
  }, []);

  return (
    <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
      <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Your Secret Phrase</h2>
      <textarea 
        className="rounded-md border-2 border-slate-600 outline-none p-3 font-semibold" 
        rows={3} 
        readOnly 
        value={mnemonic} 
      />
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
        onClick={() => navigate('/confirm', { state: { mnemonic, wallet, address } })} 
        className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer"
      >
        Proceed
      </button>
    </div>
  );
} 