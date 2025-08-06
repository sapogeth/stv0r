import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { KioskClient } from '@mysten/kiosk';
import '../stvor.css';

const KioskComponent = () => {
    const currentAccount = useCurrentAccount();
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [kioskId, setKioskId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const kioskClient = new KioskClient({
        client,
        network: 'testnet' as any,
    });

    useEffect(() => {
        const fetchKiosk = async () => {
            if (!currentAccount || !kioskClient) return;
            setIsLoading(true);
            try {
                const { kioskIds } = await kioskClient.getOwnedKiosks({ address: currentAccount.address });
                if (kioskIds && kioskIds.length > 0) {
                    setKioskId(kioskIds[0]);
                }
            } catch (err) {
                console.error("Failed to fetch Kiosk", err);
                setError("Failed to fetch Kiosk: " + (err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchKiosk();
    }, [currentAccount, kioskClient]);

    const handleCreateKiosk = async () => {
        if (!currentAccount || !client) {
            setError("No account or client available.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const tx = new Transaction();
            const [kiosk, kioskCap] = tx.moveCall({
                target: '0x2::kiosk::new',
                arguments: [],
            });

            // Корректная логика: передаём оба объекта пользователю
            tx.transferObjects([kiosk, kioskCap], currentAccount.address);
            
            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: async (result) => {
                        console.log("Kiosk creation transaction successful!", result);
                        const { kioskIds } = await kioskClient.getOwnedKiosks({ address: currentAccount.address });
                        if (kioskIds && kioskIds.length > 0) {
                            setKioskId(kioskIds[0]);
                        }
                    },
                    onError: (err) => {
                        console.error("Failed to create Kiosk", err);
                        setError("Failed to create Kiosk: " + (err as Error).message);
                    }
                }
            );
        } catch (err) {
            console.error(err);
            setError("An error occurred while creating Kiosk.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentAccount) {
        return null;
    }

    if (isLoading) {
        return <p>Checking for Kiosk...</p>;
    }

    if (error) {
        return <p className="kiosk-error">Error: {error}</p>;
    }

    if (kioskId) {
        return (
            <div className="kiosk-info">
                <p>Ваш киоск успешно создан!</p>
                <p>Kiosk ID:</p>
                <p><strong>{kioskId}</strong></p>
                <p>Здесь будет отображаться ваш маркетплейс.</p>
            </div>
        );
    }
    
    return (
        <div>
            <p>У вас еще нет киоска. Создайте его, чтобы выставлять и торговать предметами.</p>
            <button className="kiosk-button" onClick={handleCreateKiosk}>Создать Kiosk</button>
        </div>
    );
};

export default KioskComponent;