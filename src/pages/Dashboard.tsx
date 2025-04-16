import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { bech32 } from 'bech32';
import axios from 'axios';
import QRCode from 'qrcode';
import { MdContentCopy } from "react-icons/md";
import { toast } from 'sonner';
import { storageUtils } from '../utils/storageUtils';
import { DISPLAY_DENOM, getBalance } from '../utils/apiUtils';

declare global {
  interface Window {
    ethereum: ethers.providers.ExternalProvider;
  }
}

// Define the HD path components for Ethereum-compatible path
// const ethereumPath: HdPath = [
//   Slip10RawIndex.hardened(44),
//   Slip10RawIndex.hardened(60),
//   Slip10RawIndex.hardened(0),
//   Slip10RawIndex.normal(0),
//   Slip10RawIndex.normal(0),
// ];

interface TransactionFinalStatus {
  tx_response: {
    code: number;
    txhash: string;
    height: string;
  };
}

interface TransactionStatus {
  success: boolean;
  error?: string;
  txHash?: string;
  finalStatus?: TransactionFinalStatus;
}

interface CosmosSignature {
  pub_key: {
    type: string;
    value: string;
  };
  signature: string;
}

interface CosmosTx {
  msg: Array<{
    type: string;
    value: {
      from_address: string;
      to_address: string;
      amount: Array<{
        denom: string;
        amount: string;
      }>;
    };
  }>;
  fee: {
    amount: Array<{
      denom: string;
      amount: string;
    }>;
    gas: string;
  };
  signatures: CosmosSignature[] | null;
  memo: string;
}

class UCCTransactionManager {
  private rpcUrl: string;
  private restUrl: string;
  private provider: ethers.providers.JsonRpcProvider;
  private chainId: string;

  constructor() {
    this.rpcUrl = 'http://145.223.80.193:8545';
    this.restUrl = 'http://145.223.80.193:1317';
    this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
    this.chainId = 'universe_9000-1';
  }

  ethToUcc(ethAddress: string): string {
    const addressBuffer = Buffer.from(ethAddress.slice(2), 'hex');
    const words = bech32.toWords(addressBuffer);
    return bech32.encode('ucc', words);
  }

  uccToAtucc(uccAmount: number): ethers.BigNumber {
    return ethers.utils.parseUnits(uccAmount.toString(), 18);
  }

  async sendUCC(senderPrivateKey: string, recipientAddress: string, uccAmount: number) {
    try {
      const wallet = new ethers.Wallet(senderPrivateKey, this.provider);
      
      let uccRecipient = recipientAddress;
      if (recipientAddress.startsWith('0x')) {
        uccRecipient = this.ethToUcc(recipientAddress);
      }

      const atuccAmount = this.uccToAtucc(uccAmount);
      const senderUccAddress = this.ethToUcc(wallet.address);

      // Simplified transaction structure
      const tx: CosmosTx = {
        msg: [{
          type: "cosmos-sdk/MsgSend",
          value: {
            from_address: senderUccAddress,
            to_address: uccRecipient,
            amount: [{
              denom: "atucc",
              amount: atuccAmount.toString()
            }]
          }
        }],
        fee: {
          amount: [{
            denom: "atucc",
            amount: "10000000000000"
          }],
          gas: "200000"
        },
        signatures: null,
        memo: ""
      };

      // Get account info
      const accountResponse = await axios.get(
        `${this.restUrl}/cosmos/auth/v1beta1/accounts/${senderUccAddress}`
      );
      
      if (!accountResponse.data.account) {
        throw new Error('Account not found or not initialized');
      }

      const account = accountResponse.data.account;

      // Create sign doc
      const signDoc = {
        chain_id: this.chainId,
        account_number: account.account_number || "0",
        sequence: account.sequence || "0",
        fee: tx.fee,
        msgs: tx.msg,
        memo: tx.memo
      };

      // Sign transaction
      const signBytes = Buffer.from(JSON.stringify(signDoc));
      const hash = ethers.utils.keccak256(signBytes);
      const signature = await wallet.signMessage(ethers.utils.arrayify(hash));

      // Add signature to transaction
      tx.signatures = [{
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: Buffer.from(wallet.publicKey.slice(2), 'hex').toString('base64')
        },
        signature: Buffer.from(signature.slice(2), 'hex').toString('base64')
      }];

      // Broadcast transaction
      const broadcastResponse = await axios.post(
        `${this.restUrl}/cosmos/tx/v1beta1/txs`,
        {
          tx: tx,
          mode: "BROADCAST_MODE_SYNC"
        }
      );

      return {
        success: true,
        txHash: broadcastResponse.data.tx_response.txhash,
        from: senderUccAddress,
        to: uccRecipient,
        amount: `${uccAmount} UCC`
      } as TransactionStatus;

    } catch (error) {
      console.error('Transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as TransactionStatus;
    }
  }

  async checkTransaction(txHash: string): Promise<TransactionStatus['finalStatus'] | undefined> {
    try {
      const response = await axios.get(
        `${this.restUrl}/cosmos/tx/v1beta1/txs/${txHash}`
      );
      return response.data;
    } catch (error) {
      console.error('Error checking transaction:', error);
      return undefined;
    }
  }
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [address, setAddress] = useState('');
  const [ethAddress, setEthAddress] = useState('');
  const [balance, setBalance] = useState<string>('0');
  const [qr, setQr] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null);

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

  const handleSend = async () => {
    if (!to || !amount) {
      toast.error("Please fill in all fields before sending.");
      return;
    }

    try {
      const amountNumber = parseFloat(amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        toast.error("Please enter a valid amount greater than 0");
        return;
      }

      const walletInfo = storageUtils.getWallet();
      if (!walletInfo?.privateKey) {
        throw new Error("Wallet not found or private key missing");
      }

      toast.loading("Sending transaction...");

      const uccManager = new UCCTransactionManager();
      const result = await uccManager.sendUCC(
        walletInfo.privateKey,
        to,
        amountNumber
      );

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      toast.success(`Transaction sent! Hash: ${result.txHash}`);
      setTransactionStatus({
        success: true,
        txHash: result.txHash
      });

      // Update balance after transaction
      await fetchBalance(address);
      
      // Clear form
      setTo('');
      setAmount('');

    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send transaction');
      setTransactionStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send transaction'
      });
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

      {/* <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Send Tokens</h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Recipient Address (ucc1... or 0x...)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-sm text-gray-500">
              {to.toLowerCase().startsWith('0x') ? 'Ethereum Address Detected' : 
               to.toLowerCase().startsWith('ucc1') ? 'UCC Address Detected' : 
               'Enter UCC or Ethereum address'}
            </p>
          </div>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
          <button
            onClick={handleSend}
            className="bg-slate-900 text-white font-semibold py-2 rounded-md hover:bg-black duration-200 w-full disabled:bg-gray-400"
          >
            Send
          </button>
        </div>

        {transactionStatus && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="font-semibold mb-2">Transaction Status:</h4>
            <div className="text-sm">
              <p>Status: {transactionStatus.success ? 'Success' : 'Failed'}</p>
              {transactionStatus.txHash && <p>Hash: {transactionStatus.txHash}</p>}
              {transactionStatus.finalStatus && (
                <p>Final Status: {JSON.stringify(transactionStatus.finalStatus.tx_response.code === 0 ? 'Confirmed' : 'Failed')}</p>
              )}
            </div>
          </div>
        )}
      </div> */}
    </div>
  );
};

export default Dashboard; 