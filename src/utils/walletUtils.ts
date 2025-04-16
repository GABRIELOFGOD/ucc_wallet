import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { ethers } from 'ethers';
import { bech32 } from 'bech32';
import * as bip39 from 'bip39';

export interface WalletInfo {
  cosmosAddress: string;    // UCC prefixed address
  ethAddress: string;       // 0x prefixed address
  privateKey: string;
  mnemonic: string;
}

export const walletUtils = {
  generateWallet: async (): Promise<WalletInfo> => {
    // Generate mnemonic using BIP39
    const mnemonic = bip39.generateMnemonic(256); // Using 256 bits for extra security
    
    // Create Cosmos wallet
    const cosmosWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'UCC',
      hdPaths: [ethers.utils.defaultPath] // Using Ethereum HD path for compatibility
    });
    const [cosmosAccount] = await cosmosWallet.getAccounts();
    
    // Create Ethereum wallet from same mnemonic
    const ethWallet = ethers.Wallet.fromMnemonic(mnemonic);
    
    return {
      cosmosAddress: cosmosAccount.address,
      ethAddress: ethWallet.address,
      privateKey: ethWallet.privateKey,
      mnemonic: mnemonic
    };
  },

  importFromMnemonic: async (mnemonic: string): Promise<WalletInfo> => {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const cosmosWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'UCC',
      hdPaths: [ethers.utils.defaultPath]
    });
    const [cosmosAccount] = await cosmosWallet.getAccounts();
    
    const ethWallet = ethers.Wallet.fromMnemonic(mnemonic);
    
    return {
      cosmosAddress: cosmosAccount.address,
      ethAddress: ethWallet.address,
      privateKey: ethWallet.privateKey,
      mnemonic: mnemonic
    };
  },

  // Convert Ethereum address to UCC address
  ethToUccAddress: (ethAddress: string): string => {
    const addressBuffer = Buffer.from(ethAddress.slice(2), 'hex');
    const words = bech32.toWords(addressBuffer);
    return bech32.encode('ucc', words);
  },

  // Convert UCC address to Ethereum address
  uccToEthAddress: (uccAddress: string): string => {
    const { words } = bech32.decode(uccAddress);
    const addressBytes = Buffer.from(bech32.fromWords(words));
    return '0x' + addressBytes.toString('hex');
  }
}; 