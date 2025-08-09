import { useEffect } from "react";
import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";

export default function RegisterEnokiWallets() {
    const { client, network } = useSuiClientContext();

    useEffect(() => {
        if (!isEnokiNetwork(network)) return;

        const { unregister } = registerEnokiWallets({
            // Your public Enoki API key
            apiKey: import.meta.env.VITE_ENOKI_API_KEY,
            
            // Provider configuration
            providers: {
                google: {
                    // Use your Client ID from the Google Cloud Console
                    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                },
                facebook: {
                    // Use your Client ID from Facebook Developer
                    clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID,
                },
                // If other providers are needed, they can be added here
            },
            
            client,
            network,

            // ✅ CRITICAL FIX
            // Explicitly specify the redirect URL.
            // This resolves the `redirect_uri_mismatch` error.
            // Important: this URL must exactly match the one in the Google Cloud Console.
            redirectUrl: import.meta.env.VITE_REDIRECT_URI,
        });

        return unregister;
    }, [client, network]);

    return null;
}