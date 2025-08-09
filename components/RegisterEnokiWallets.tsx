import { useEffect } from "react";
import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";

export default function RegisterEnokiWallets() {
    const { client, network } = useSuiClientContext();

    useEffect(() => {
        if (!isEnokiNetwork(network)) return;

        console.log('Registering Enoki wallets with network:', network);
        console.log('Redirect URI:', import.meta.env.VITE_REDIRECT_URI);

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
                    clientId: import.meta.env.VITE_TWITCH_CLIENT_ID,
                },
            },
            client,
            network,
            redirectUrl: import.meta.env.VITE_REDIRECT_URI,
            // Attempt to disable the popup (if supported)
            usePopup: false, // Check Enoki documentation
        });

        return unregister;
    }, [client, network]);

    return null;
}