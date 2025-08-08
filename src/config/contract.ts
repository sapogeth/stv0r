// src/config/contracts.ts

export const CONTRACTS = {
  // Эти ID нужно будет обновить после развертывания контрактов
  NICKNAME_NFT_PACKAGE_ID: '0x0', // Заменить после развертывания
  NICKNAME_REGISTRY_ID: '0x0', // Заменить после развертывания
  ADMIN_CAP_ID: '0x0', // Заменить после развертывания
  
  // Стандартные Sui контракты
  SUI_FRAMEWORK_PACKAGE_ID: '0x2',
  KIOSK_PACKAGE_ID: '0x2',
  
  // Walrus конфигурация
  WALRUS_PUBLISHER_URL: 'https://publisher-devnet.walrus.space',
  WALRUS_AGGREGATOR_URL: 'https://aggregator-devnet.walrus.space',
  
  // Seal конфигурация (заменить после развертывания)
  SEAL_PACKAGE_ID: '0x0',
  
  // Сеть
  NETWORK: 'testnet' as const,
  RPC_URL: 'https://fullnode.testnet.sui.io:443',
  
  // Цены
  MINT_PRICE: 100_000_000, // 0.1 SUI в MIST
  TRANSACTION_SPONSORSHIP_LIMIT: 5, // Количество бесплатных транзакций

  // Проверка, развернуты ли контракты
  areContractsDeployed(): boolean {
    return this.NICKNAME_NFT_PACKAGE_ID !== '0x0' && 
           this.NICKNAME_REGISTRY_ID !== '0x0';
  }
};

export const NICKNAME_NFT_TYPE = `${CONTRACTS.NICKNAME_NFT_PACKAGE_ID}::nickname_nft::NicknameNFT`;

// Функция для обновления ID контрактов после развертывания
export function updateContractIds(updates: Partial<typeof CONTRACTS>) {
  Object.assign(CONTRACTS, updates);
}

// Валидация конфигурации
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

// Проверка, развернуты ли контракты
export function areContractsDeployed(): boolean {
  return CONTRACTS.NICKNAME_NFT_PACKAGE_ID !== '0x0' && 
         CONTRACTS.NICKNAME_REGISTRY_ID !== '0x0';
}

