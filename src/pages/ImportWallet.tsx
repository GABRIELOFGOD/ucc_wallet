import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import * as bip39 from 'bip39';
import { toast } from 'sonner';

export default function ImportWallet() {
  const navigate = useNavigate();
  const [mnemonic, setMnemonic] = useState('');

  const importWallet = async () => {
    if (!bip39.validateMnemonic(mnemonic)) {
      toast.error('Invalid mnemonic phrase');
      return;
    }

    try {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'UCC' });
      const [account] = await wallet.getAccounts();
      
      navigate('/dashboard', { 
        state: { 
          wallet,
          address: account.address,
          mnemonic
        } 
      });
    } catch (error) {
      toast.error('Failed to import wallet. Please check your mnemonic phrase.');
    }
  };

  return (
    <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
      <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Import Existing Wallet</h2>
      <p className="text-gray-600">Enter your secret recovery phrase to import your wallet.</p>
      <textarea
        className="rounded-md border-2 border-slate-600 outline-none p-3 font-semibold"
        rows={3}
        value={mnemonic}
        onChange={(e) => setMnemonic(e.target.value)}
        placeholder="Enter your secret recovery phrase..."
      />
      <button
        onClick={importWallet}
        className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer"
      >
        Import Wallet
      </button>
      <button
        onClick={() => navigate('/')}
        className="border-2 border-slate-900 rounded-md px-4 py-2 bg-transparent text-slate-900 cursor-pointer font-semibold shadow-sm hover:bg-gray-50/20 duration-200"
      >
        Back to Home
      </button>
    </div>
  );
} 