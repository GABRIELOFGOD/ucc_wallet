import { ethers } from 'ethers';
import { bech32 } from 'bech32';

export interface WalletInfo {
  privateKey: string;
  ethAddress: string;
  uccAddress: string;
  mnemonic?: string;
}

export const walletUtils = {
  generateWallet: (): WalletInfo => {
    const wallet = ethers.Wallet.createRandom();
    const ethAddress = wallet.address;
    
    // Convert to UCC address
    const addressBuffer = Buffer.from(ethAddress.slice(2), 'hex');
    const words = bech32.toWords(addressBuffer);
    const uccAddress = bech32.encode('ucc', words);
    
    return {
      privateKey: wallet.privateKey,
      ethAddress: ethAddress,
      uccAddress: uccAddress,
      mnemonic: wallet.mnemonic?.phrase
    };
  },

  importFromPrivateKey: (privateKey: string): WalletInfo => {
    const wallet = new ethers.Wallet(privateKey);
    const ethAddress = wallet.address;
    
    const addressBuffer = Buffer.from(ethAddress.slice(2), 'hex');
    const words = bech32.toWords(addressBuffer);
    const uccAddress = bech32.encode('ucc', words);
    
    return {
      privateKey: wallet.privateKey,
      ethAddress: ethAddress,
      uccAddress: uccAddress
    };
  },

  importFromMnemonic: (mnemonic: string): WalletInfo => {
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    const ethAddress = wallet.address;
    
    const addressBuffer = Buffer.from(ethAddress.slice(2), 'hex');
    const words = bech32.toWords(addressBuffer);
    const uccAddress = bech32.encode('ucc', words);
    
    return {
      privateKey: wallet.privateKey,
      ethAddress: ethAddress,
      uccAddress: uccAddress,
      mnemonic: mnemonic
    };
  }
}; 