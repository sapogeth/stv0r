import type { SuiObjectResponse, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

// Правильный Package ID из вывода развертывания
const PACKAGE_ID = '0x428b448fd75b44248ef911bc41e0353f2402af146110422c4a8a4f6eb4658582';

// Функция для добавления задержки
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useVoting = () => {
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const account = useCurrentAccount();

    const initVoting = async (): Promise<string | null> => {
        if (!account) throw new Error('No account connected');
        
        // Добавляем небольшую задержку перед запросом
        await delay(1000);
        
        const txb = new Transaction();
        txb.moveCall({
            target: `${PACKAGE_ID}::voting::init_voting`,
            arguments: [],
        });
        
        return new Promise((resolve, reject) => {
            signAndExecute(
                { transaction: txb },
                {
                    onSuccess: async (result: SuiTransactionBlockResponse) => {
                        console.log('Init voting success:', result);
                        
                        try {
                            // Ждем немного, чтобы транзакция была обработана
                            await delay(2000);
                            
                            // Получаем все объекты, принадлежащие пользователю
                            const ownedObjects = await client.getOwnedObjects({
                                owner: account.address,
                                filter: {
                                    StructType: `${PACKAGE_ID}::voting::Voting`
                                },
                                options: {
                                    showContent: true,
                                    showType: true
                                }
                            });
                            
                            console.log('Owned voting objects:', ownedObjects);
                            
                            if (ownedObjects.data && ownedObjects.data.length > 0) {
                                // Берем последний созданный объект (самый новый)
                                const latestVoting = ownedObjects.data[ownedObjects.data.length - 1];
                                const objectId = latestVoting.data?.objectId;
                                
                                if (objectId) {
                                    console.log('Found Object ID:', objectId);
                                    resolve(objectId);
                                    return;
                                }
                            }
                            
                            console.log('No voting objects found for user');
                            resolve(null);
                            
                        } catch (error) {
                            console.error('Error getting owned objects:', error);
                            resolve(null);
                        }
                    },
                    onError: (error) => {
                        console.error('Init voting error:', error);
                        
                        // Специальная обработка ошибки 429
                        if (error.message && error.message.includes('429')) {
                            reject(new Error('Rate limit exceeded. Please wait a few minutes and try again. Enoki API has limits: Public keys (2 req/sec), Private keys (1000 req/sec).'));
                        } else {
                            reject(error);
                        }
                    }
                }
            );
        });
    };

    const vote = async (objectId: string, optionIndex: number) => {
        if (!account) throw new Error('No account connected');
        if (!objectId) throw new Error('Object ID is required');
        
        // Добавляем небольшую задержку перед запросом
        await delay(1000);
        
        const txb = new Transaction();
        txb.moveCall({
            target: `${PACKAGE_ID}::voting::vote`,
            arguments: [txb.object(objectId), txb.pure.u64(BigInt(optionIndex))],
        });
        
        return new Promise((resolve, reject) => {
            signAndExecute(
                { transaction: txb },
                {
                    onSuccess: (result) => {
                        console.log('Vote success:', result);
                        resolve(result);
                    },
                    onError: (error) => {
                        console.error('Vote error:', error);
                        
                        // Специальная обработка ошибки 429
                        if (error.message && error.message.includes('429')) {
                            reject(new Error('Rate limit exceeded. Please wait a few minutes and try again.'));
                        } else {
                            reject(error);
                        }
                    }
                }
            );
        });
    };

    const endVoting = async (objectId: string) => {
        if (!account) throw new Error('No account connected');
        if (!objectId) throw new Error('Object ID is required');
        
        // Добавляем небольшую задержку перед запросом
        await delay(1000);
        
        const txb = new Transaction();
        txb.moveCall({
            target: `${PACKAGE_ID}::voting::end_voting`,
            arguments: [txb.object(objectId)],
        });
        
        return new Promise((resolve, reject) => {
            signAndExecute(
                { transaction: txb },
                {
                    onSuccess: (result) => {
                        console.log('End voting success:', result);
                        resolve(result);
                    },
                    onError: (error) => {
                        console.error('End voting error:', error);
                        
                        // Специальная обработка ошибки 429
                        if (error.message && error.message.includes('429')) {
                            reject(new Error('Rate limit exceeded. Please wait a few minutes and try again.'));
                        } else {
                            reject(error);
                        }
                    }
                }
            );
        });
    };

    const getResults = async (objectId: string): Promise<{ options: string[]; votes: number[] }> => {
        if (!objectId) {
            console.log('No object ID provided, returning demo data');
            return { 
                options: ['Yes', 'No'], 
                votes: [0, 0] 
            };
        }

        try {
            // Добавляем небольшую задержку перед запросом к Sui RPC
            await delay(500);
            
            const obj = await client.getObject({ id: objectId, options: { showContent: true } });
            console.log('Sui Object Response:', obj);
            
            // Проверяем, что объект существует
            if (!obj.data) {
                console.log('Object not found or no data');
                return { options: ['Yes', 'No'], votes: [0, 0] };
            }

            // Проверяем, что объект имеет содержимое
            if (!obj.data.content) {
                console.log('Object has no content');
                return { options: ['Yes', 'No'], votes: [0, 0] };
            }

            // Проверяем тип объекта
            if (obj.data.content.dataType !== 'moveObject') {
                console.log('Object is not a Move object, dataType:', obj.data.content.dataType);
                return { options: ['Yes', 'No'], votes: [0, 0] };
            }

            // Получаем поля объекта
            const fields = obj.data.content.fields as any;
            console.log('Object fields:', fields);

            // Извлекаем данные голосования согласно структуре смарт-контракта
            if (fields.options && fields.votes) {
                // Конвертируем vector<u8> в строки для options
                const options = fields.options.map((option: number[]) => {
                    return String.fromCharCode(...option);
                });
                
                // votes уже должны быть числами
                const votes = fields.votes.map((vote: string) => parseInt(vote, 10));
                
                return { options, votes };
            }

            // Если структура отличается, выводим доступные поля для отладки
            console.log('Available fields:', Object.keys(fields));
            return { options: ['Yes', 'No'], votes: [0, 0] };

        } catch (error) {
            console.error('Error in getResults:', error);
            return { options: ['Yes', 'No'], votes: [0, 0] };
        }
    };

    return { initVoting, vote, endVoting, getResults };
};

