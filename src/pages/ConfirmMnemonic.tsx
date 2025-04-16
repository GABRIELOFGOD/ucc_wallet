import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

interface LocationState {
  mnemonic: string;
  wallet: DirectSecp256k1HdWallet;
  address: string;
}

export default function ConfirmMnemonic() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mnemonic } = location.state as LocationState;
  const [confirmedMnemonic, setConfirmedMnemonic] = useState('');

  const confirmMnemonic = async () => {
    if (confirmedMnemonic.trim() === mnemonic.trim()) {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(confirmedMnemonic, { prefix: 'UCC' });
      const [account] = await wallet.getAccounts();
      navigate('/dashboard', { 
        state: { 
          wallet,
          address: account.address,
          mnemonic: confirmedMnemonic
        } 
      });
    } else {
      toast.error('Mnemonic does not match. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
      <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Confirm Your Secret Phrase</h2>
      <p className="text-gray-600">Please enter your secret phrase to confirm you have saved it correctly.</p>
      <textarea
        className="rounded-md border-2 border-slate-600 outline-none p-3 font-semibold"
        rows={3}
        value={confirmedMnemonic}
        onChange={(e) => setConfirmedMnemonic(e.target.value)}
        placeholder="Enter your secret phrase..."
      />
      <button
        onClick={confirmMnemonic}
        className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full mt-3 cursor-pointer"
      >
        Confirm & Continue
      </button>
    </div>
  );
} 