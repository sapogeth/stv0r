import { useEffect } from "react";
import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";

export default function RegisterEnokiWallets() {
    const { client, network } = useSuiClientContext();
 
    useEffect(() => {
        if (!isEnokiNetwork(network)) return;
 
        const { unregister } = registerEnokiWallets({
            apiKey: import.meta.env.VITE_ENOKI_API_KEY,
            providers: {
                google: {
                    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                },
                facebook: {
                    clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID,
                },
                twitch: {
                    clientId: 'YOUR_TWITCH_CLIENT_ID', // Замените на ваш Client ID Twitch, если используете
                },
            },
            client,
            network,
            // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Явно указываем redirectUrl
            redirectUrl: import.meta.env.VITE_REDIRECT_URI,
        });
 
        return unregister;
    }, [client, network]);
 
    return null;
}