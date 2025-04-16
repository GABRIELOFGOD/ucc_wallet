import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import QRCode from 'qrcode';
import { MdContentCopy } from "react-icons/md";
import { toast } from 'sonner';
import { storageUtils } from '../utils/storageUtils';
import { HdPath, Slip10RawIndex } from "@cosmjs/crypto";
import { RPC_API_URL, DENOM, DISPLAY_DENOM, getBalance } from '../utils/apiUtils';

// Define the HD path components for Ethereum-compatible path
const ethereumPath: HdPath = [
  Slip10RawIndex.hardened(44),
  Slip10RawIndex.hardened(60),
  Slip10RawIndex.hardened(0),
  Slip10RawIndex.normal(0),
  Slip10RawIndex.normal(0),
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [wallet, setWallet] = useState<DirectSecp256k1HdWallet | null>(null);
  const [address, setAddress] = useState('');
  const [ethAddress, setEthAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [qr, setQr] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const initializeWallet = async () => {
      // Try to get wallet from storage
      const storedWallet = storageUtils.getWallet();
      if (!storedWallet) {
        // If no wallet in storage, check location state
        const locationState = location.state;
        if (!locationState) {
          navigate('/');
          return;
        }
        // Save wallet from location state to storage
        storageUtils.saveWallet(locationState);
      }

      // Use either stored wallet or location state
      const walletInfo = storedWallet || location.state;
      
      try {
        // Initialize Cosmos wallet
        const cosmosWallet = await DirectSecp256k1HdWallet.fromMnemonic(walletInfo.mnemonic, {
          prefix: 'UCC',
          hdPaths: [ethereumPath]
        });
        
        setWallet(cosmosWallet);
        setAddress(walletInfo.cosmosAddress);
        setEthAddress(walletInfo.ethAddress);
        
        // Fetch balance and generate QR
        await fetchBalance(walletInfo.cosmosAddress);
        await generateQR(walletInfo.cosmosAddress);
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
        toast.error('Failed to initialize wallet. Please try again.');
        navigate('/');
      }
    };

    initializeWallet();
  }, [navigate, location]);

  const fetchBalance = async (addr: string) => {
    try {
      const amount = await getBalance(addr);
      setBalance(amount);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
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
      const client = await SigningStargateClient.connectWithSigner(RPC_API_URL, wallet, {
        gasPrice,
      });

      const amountToSend = {
        denom: DENOM,
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
    } catch (error) {
      console.error("Send failed:", error);
      toast.error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const copyAddress = (type: 'cosmos' | 'eth') => {
    const addr = type === 'cosmos' ? address : ethAddress;
    navigator.clipboard.writeText(addr);
    toast.success(`${type === 'cosmos' ? 'Cosmos' : 'Ethereum'} address copied to clipboard!`);
  };

  const logout = () => {
    const confirmed = window.confirm('Are you sure you want to logout? Make sure you have saved your mnemonic phrase!');
    if (confirmed) {
      storageUtils.clearWallet();
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col gap-5 mx-auto shadow-md border-gray-500/30 border w-full md:w-[500px] rounded-md p-5 bg-gray-100">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl text-shadow-md font-bold text-slate-900">Your Wallet</h2>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 duration-200"
        >
          Logout
        </button>
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Balance:</span>
          <span className="font-bold">{balance} {DISPLAY_DENOM}</span>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Ucc Address:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm truncate max-w-[200px]">{address}</span>
              <button onClick={() => copyAddress('cosmos')} className="p-1 hover:bg-gray-100 rounded">
                <MdContentCopy size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Public Address:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm truncate max-w-[200px]">{ethAddress}</span>
              <button onClick={() => copyAddress('eth')} className="p-1 hover:bg-gray-100 rounded">
                <MdContentCopy size={18} />
              </button>
            </div>
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