import { useEffect } from "react";
import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";

export default function RegisterEnokiWallets() {
    const { client, network } = useSuiClientContext();

    useEffect(() => {
        if (!isEnokiNetwork(network)) return;

        const { unregister } = registerEnokiWallets({
            // Ваш публичный API ключ Enoki
            apiKey: import.meta.env.VITE_ENOKI_API_KEY,
            
            // Настройка провайдеров
            providers: {
                google: {
                    // Используем ваш Client ID из Google Cloud Console
                    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                },
                facebook: {
                    // Используем ваш Client ID из Facebook Developer
                    clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID,
                },
                // Если нужны другие провайдеры, их можно добавить здесь
            },
            
            client,
            network,

            // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ
            // Явно указываем URL для перенаправления.
            // Это решает ошибку `redirect_uri_mismatch`
            // Важно: этот URL должен точно совпадать с тем, что в Google Cloud Console.
            redirectUrl: import.meta.env.VITE_REDIRECT_URI,
        });

        return unregister;
    }, [client, network]);

    return null;
}