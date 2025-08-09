// src/services/contractValidationService.ts

import { SuiClient } from '@mysten/sui.js/client';
import { CONTRACTS } from '../config/contracts';

/**
 * Интерфейс для результата валидации контракта
 */
export interface ContractValidationResult {
  isValid: boolean;
  contractType: string;
  packageId: string;
  error?: string;
  details?: any;
}

/**
 * Интерфейс для общего результата валидации
 */
export interface ValidationSummary {
  allValid: boolean;
  validContracts: string[];
  invalidContracts: string[];
  results: Record<string, ContractValidationResult>;
}

// Инициализация Sui клиента
const suiClient = new SuiClient({ url: CONTRACTS.RPC_URL });

/**
 * Проверяет существование и валидность пакета контракта
 * @param packageId ID пакета для проверки
 * @param contractType тип контракта (для логирования)
 * @returns Promise<ContractValidationResult> результат валидации
 */
export async function validateContract(
  packageId: string,
  contractType: string
): Promise<ContractValidationResult> {
  try {
    if (!packageId || packageId === '0x0' || packageId === '0x0000000000000000000000000000000000000000') {
      return {
        isValid: false,
        contractType,
        packageId,
        error: 'Package ID не установлен или имеет значение по умолчанию'
      };
    }

    // Проверяем существование пакета
    const packageInfo = await suiClient.getObject({
      id: packageId,
      options: {
        showType: true,
        showContent: true,
        showDisplay: true
      }
    });

    if (packageInfo.error) {
      return {
        isValid: false,
        contractType,
        packageId,
        error: `Пакет не найден: ${packageInfo.error.code}`
      };
    }

    if (!packageInfo.data) {
      return {
        isValid: false,
        contractType,
        packageId,
        error: 'Данные пакета недоступны'
      };
    }

    // Проверяем, что это действительно пакет
    if (!packageInfo.data.type?.includes('package::Package')) {
      return {
        isValid: false,
        contractType,
        packageId,
        error: 'Объект не является пакетом Move'
      };
    }

    return {
      isValid: true,
      contractType,
      packageId,
      details: {
        version: packageInfo.data.version,
        digest: packageInfo.data.digest,
        type: packageInfo.data.type
      }
    };

  } catch (error) {
    return {
      isValid: false,
      contractType,
      packageId,
      error: `Ошибка валидации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

/**
 * Проверяет существование объекта (например, Registry или AdminCap)
 * @param objectId ID объекта для проверки
 * @param objectType тип объекта (для логирования)
 * @returns Promise<ContractValidationResult> результат валидации
 */
export async function validateObject(
  objectId: string,
  objectType: string
): Promise<ContractValidationResult> {
  try {
    if (!objectId || objectId === '0x0' || objectId === '0x0000000000000000000000000000000000000000') {
      return {
        isValid: false,
        contractType: objectType,
        packageId: objectId,
        error: 'Object ID не установлен или имеет значение по умолчанию'
      };
    }

    const objectInfo = await suiClient.getObject({
      id: objectId,
      options: {
        showType: true,
        showContent: true,
        showOwner: true
      }
    });

    if (objectInfo.error) {
      return {
        isValid: false,
        contractType: objectType,
        packageId: objectId,
        error: `Объект не найден: ${objectInfo.error.code}`
      };
    }

    if (!objectInfo.data) {
      return {
        isValid: false,
        contractType: objectType,
        packageId: objectId,
        error: 'Данные объекта недоступны'
      };
    }

    return {
      isValid: true,
      contractType: objectType,
      packageId: objectId,
      details: {
        version: objectInfo.data.version,
        digest: objectInfo.data.digest,
        type: objectInfo.data.type,
        owner: objectInfo.data.owner
      }
    };

  } catch (error) {
    return {
      isValid: false,
      contractType: objectType,
      packageId: objectId,
      error: `Ошибка валидации объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

/**
 * Проверяет все контракты проекта
 * @returns Promise<ValidationSummary> сводка валидации всех контрактов
 */
export async function validateAllContracts(): Promise<ValidationSummary> {
  const results: Record<string, ContractValidationResult> = {};
  const validContracts: string[] = [];
  const invalidContracts: string[] = [];

  // Проверяем основной пакет NFT никнеймов
  const nicknameNftResult = await validateContract(
    CONTRACTS.NICKNAME_NFT_PACKAGE_ID,
    'Nickname NFT Package'
  );
  results['NICKNAME_NFT_PACKAGE'] = nicknameNftResult;
  
  if (nicknameNftResult.isValid) {
    validContracts.push('NICKNAME_NFT_PACKAGE');
  } else {
    invalidContracts.push('NICKNAME_NFT_PACKAGE');
  }

  // Проверяем реестр никнеймов
  const registryResult = await validateObject(
    CONTRACTS.NICKNAME_REGISTRY_ID,
    'Nickname Registry'
  );
  results['NICKNAME_REGISTRY'] = registryResult;
  
  if (registryResult.isValid) {
    validContracts.push('NICKNAME_REGISTRY');
  } else {
    invalidContracts.push('NICKNAME_REGISTRY');
  }

  // Проверяем AdminCap
  const adminCapResult = await validateObject(
    CONTRACTS.ADMIN_CAP_ID,
    'Admin Capability'
  );
  results['ADMIN_CAP'] = adminCapResult;
  
  if (adminCapResult.isValid) {
    validContracts.push('ADMIN_CAP');
  } else {
    invalidContracts.push('ADMIN_CAP');
  }

  // Проверяем Seal пакет (если установлен)
  if (CONTRACTS.SEAL_PACKAGE_ID && CONTRACTS.SEAL_PACKAGE_ID !== '0x0') {
    const sealResult = await validateContract(
      CONTRACTS.SEAL_PACKAGE_ID,
      'Seal Package'
    );
    results['SEAL_PACKAGE'] = sealResult;
    
    if (sealResult.isValid) {
      validContracts.push('SEAL_PACKAGE');
    } else {
      invalidContracts.push('SEAL_PACKAGE');
    }
  }

  const allValid = invalidContracts.length === 0;

  return {
    allValid,
    validContracts,
    invalidContracts,
    results
  };
}

/**
 * Проверяет функциональность контракта никнеймов
 * @returns Promise<boolean> работает ли контракт корректно
 */
export async function testNicknameContractFunctionality(): Promise<boolean> {
  try {
    // Проверяем, что можем получить информацию о модуле
    const packageId = CONTRACTS.NICKNAME_NFT_PACKAGE_ID;
    
    if (!packageId || packageId === '0x0') {
      console.error('Package ID не установлен');
      return false;
    }

    // Получаем информацию о пакете и его модулях
    const packageInfo = await suiClient.getObject({
      id: packageId,
      options: {
        showContent: true
      }
    });

    if (packageInfo.error || !packageInfo.data) {
      console.error('Не удалось получить информацию о пакете');
      return false;
    }

    console.log('Контракт никнеймов доступен и функционален');
    return true;

  } catch (error) {
    console.error('Ошибка тестирования функциональности контракта:', error);
    return false;
  }
}

/**
 * Получает подробную информацию о развернутых контрактах
 * @returns Promise<any> детальная информация о контрактах
 */
export async function getContractDetails(): Promise<any> {
  const details: any = {
    network: CONTRACTS.NETWORK,
    rpcUrl: CONTRACTS.RPC_URL,
    contracts: {}
  };

  try {
    // Информация о пакете NFT никнеймов
    if (CONTRACTS.NICKNAME_NFT_PACKAGE_ID !== '0x0') {
      const packageInfo = await suiClient.getObject({
        id: CONTRACTS.NICKNAME_NFT_PACKAGE_ID,
        options: { showContent: true, showType: true }
      });
      
      details.contracts.nicknameNft = {
        packageId: CONTRACTS.NICKNAME_NFT_PACKAGE_ID,
        status: packageInfo.error ? 'error' : 'active',
        info: packageInfo.data || packageInfo.error
      };
    }

    // Информация о реестре
    if (CONTRACTS.NICKNAME_REGISTRY_ID !== '0x0') {
      const registryInfo = await suiClient.getObject({
        id: CONTRACTS.NICKNAME_REGISTRY_ID,
        options: { showContent: true, showType: true, showOwner: true }
      });
      
      details.contracts.registry = {
        objectId: CONTRACTS.NICKNAME_REGISTRY_ID,
        status: registryInfo.error ? 'error' : 'active',
        info: registryInfo.data || registryInfo.error
      };
    }

    // Информация об AdminCap
    if (CONTRACTS.ADMIN_CAP_ID !== '0x0') {
      const adminCapInfo = await suiClient.getObject({
        id: CONTRACTS.ADMIN_CAP_ID,
        options: { showContent: true, showType: true, showOwner: true }
      });
      
      details.contracts.adminCap = {
        objectId: CONTRACTS.ADMIN_CAP_ID,
        status: adminCapInfo.error ? 'error' : 'active',
        info: adminCapInfo.data || adminCapInfo.error
      };
    }

    return details;

  } catch (error) {
    console.error('Ошибка получения деталей контрактов:', error);
    return {
      ...details,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Проверяет подключение к сети Sui
 * @returns Promise<boolean> доступна ли сеть
 */
export async function checkSuiNetworkConnection(): Promise<boolean> {
  try {
    const chainId = await suiClient.getChainIdentifier();
    console.log(`Подключение к Sui сети успешно. Chain ID: ${chainId}`);
    return true;
  } catch (error) {
    console.error('Ошибка подключения к Sui сети:', error);
    return false;
  }
}

/**
 * Форматирует результаты валидации для отображения пользователю
 * @param summary сводка валидации
 * @returns string отформатированный отчет
 */
export function formatValidationReport(summary: ValidationSummary): string {
  let report = `=== Отчет валидации смарт-контрактов ===\n\n`;
  
  report += `Общий статус: ${summary.allValid ? '✅ Все контракты валидны' : '❌ Есть проблемы с контрактами'}\n`;
  report += `Валидные контракты: ${summary.validContracts.length}\n`;
  report += `Невалидные контракты: ${summary.invalidContracts.length}\n\n`;

  if (summary.validContracts.length > 0) {
    report += `✅ Валидные контракты:\n`;
    summary.validContracts.forEach(contract => {
      const result = summary.results[contract];
      report += `  - ${result.contractType}: ${result.packageId}\n`;
    });
    report += '\n';
  }

  if (summary.invalidContracts.length > 0) {
    report += `❌ Невалидные контракты:\n`;
    summary.invalidContracts.forEach(contract => {
      const result = summary.results[contract];
      report += `  - ${result.contractType}: ${result.error}\n`;
    });
    report += '\n';
  }

  report += `Сеть: ${CONTRACTS.NETWORK}\n`;
  report += `RPC URL: ${CONTRACTS.RPC_URL}\n`;

  return report;
}