// src/config/contracts.ts

export const CONTRACTS = {
  // These IDs will need to be updated after deploying the contracts
  NICKNAME_NFT_PACKAGE_ID: '0x0', // Replace after deployment
  NICKNAME_REGISTRY_ID: '0x0', // Replace after deployment
  ADMIN_CAP_ID: '0x0', // Replace after deployment
  
  // Standard Sui contracts
  SUI_FRAMEWORK_PACKAGE_ID: '0x2',
  KIOSK_PACKAGE_ID: '0x2',
  
  // Walrus configuration
  WALRUS_PUBLISHER_URL: 'https://publisher-devnet.walrus.space',
  WALRUS_AGGREGATOR_URL: 'https://aggregator-devnet.walrus.space',
  
  // Seal configuration (replace after deployment)
  SEAL_PACKAGE_ID: '0x0',
  
  // Network
  NETWORK: 'testnet' as const,
  RPC_URL: 'https://fullnode.testnet.sui.io:443',
  
  // Prices
  MINT_PRICE: 100_000_000, // 0.1 SUI in MIST
  TRANSACTION_SPONSORSHIP_LIMIT: 5, // Number of free transactions

  // Check if contracts are deployed
  areContractsDeployed(): boolean {
    return this.NICKNAME_NFT_PACKAGE_ID !== '0x0' && 
           this.NICKNAME_REGISTRY_ID !== '0x0';
  },
  
  // ✨ Here's the corrected part: calculate the type after defining CONTRACTS
  getNicknameNFTType(): string {
    return `${this.NICKNAME_NFT_PACKAGE_ID}::nickname_nft::NicknameNFT`;
  }
};

// Function to update contract IDs after deployment
export function updateContractIds(updates: Partial<typeof CONTRACTS>) {
  Object.assign(CONTRACTS, updates);
}

// Configuration validation
export function validateContractConfig(): boolean {
  const requiredFields = [
    'NICKNAME_NFT_PACKAGE_ID',
    'NICKNAME_REGISTRY_ID',
    'ADMIN_CAP_ID'
  ];
  
  for (const field of requiredFields) {
    if (CONTRACTS[field as keyof typeof CONTRACTS] === '0x0') {
      console.warn(`Contract ID not set: ${field}`);
      return false;
    }
  }
  
  return true;
}