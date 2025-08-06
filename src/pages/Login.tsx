import React from "react";
import { useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from '@mysten/enoki';
import '../stvor.css';

const Login = () => {
    const { mutate: connect } = useConnectWallet();

    const wallets = useWallets().filter(isEnokiWallet);
    const walletsByProvider = wallets.reduce(
        (map, wallet) => map.set(wallet.provider, wallet),
        new Map<AuthProvider, EnokiWallet>(),
    );
 
    const googleWallet = walletsByProvider.get('google');
 
    return (
        <div className="login-page">
            <header className="login-header">
                <div className="header-content">
                    <h1>Academic Secure Chat</h1>
                    <p className="subtitle">Защищённая коммуникация для научного сообщества</p>
                </div>
            </header>
            <div className="login-main">
                <div className="login-form-container">
                    <div className="form-inner">
                        <h2 className="form-title">Вход в систему</h2>
                        <div className="button-group">
                            {googleWallet ? (
                                <button className="btn-academic" onClick={() => connect({ wallet: googleWallet })}>
                                    Sign in with Google
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;