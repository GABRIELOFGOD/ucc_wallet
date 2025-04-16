import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import QRCode from 'qrcode';
import { MdContentCopy } from "react-icons/md";
import { toast } from 'sonner';

const RPC = 'https://evmos-rpc.publicnode.com';
const DENOM = 'atucc';
const DISPLAY_DENOM = 'UCC';
const LCD = 'http://145.223.80.193:1317';

interface LocationState {
  wallet: DirectSecp256k1HdWallet;
  address: string;
  mnemonic: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { wallet, address } = location.state as LocationState;

  const [balance, setBalance] = useState('0');
  const [qr, setQr] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!wallet || !address) {
      navigate('/');
      return;
    }
    
    fetchBalance(address);
    generateQR(address);

    // Handle back button
    const handlePopState = () => {
      const confirmExit = window.confirm('Are you sure you want to exit app?');
      if (!confirmExit) {
        history.pushState(null, '', window.location.href);
      } else {
        navigate('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [wallet, address, navigate]);

  const fetchBalance = async (addr: string) => {
    try {
      const res = await fetch(`${LCD}/cosmos/bank/v1beta1/balances/${addr}`);
      const data = await res.json();
      const balanceObj = data.balances.find((b: any) => b.denom === DENOM);
      const amount = balanceObj ? (+balanceObj.amount / 1e18).toFixed(2) : '0';
      setBalance(amount);
    } catch (err) {
      console.error('Failed to fetch balance via LCD:', err);
      toast.error('Error fetching balance. Please check your connection.');
    }
  };

  const generateQR = async (data: string) => {
    try {
      const url = await QRCode.toDataURL(data);
      setQr(url);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const sendTokens = async () => {
    if (!wallet || !to || !amount) {
      toast.error("Please fill in all fields before sending.");
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

      const result = await client.sendTokens(
        address,
        to,
        [amountToSend],
        "auto"
      );

      toast.success(`Transaction sent! Hash: ${result.transactionHash}`);
      fetchBalance(address);
    } catch (err: any) {
      console.error("Send failed:", err);
      toast.error(`Transaction failed: ${err.message || 'Unknown error'}`);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
      <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Your Wallet</h2>
      
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Balance:</span>
          <span className="font-bold">{balance} {DISPLAY_DENOM}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Address:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm truncate max-w-[200px]">{address}</span>
            <button onClick={copyAddress} className="p-1 hover:bg-gray-100 rounded">
              <MdContentCopy size={18} />
            </button>
          </div>
        </div>
      </div>

      {qr && (
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <img src={qr} alt="Wallet QR Code" className="w-48 h-48" />
        </div>
      )}

      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Send Tokens</h3>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Recipient Address"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
          <button
            onClick={sendTokens}
            className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 