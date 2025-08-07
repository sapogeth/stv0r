import React, { useEffect } from "react";
import { useConnectWallet, useWallets, useCurrentAccount } from '@mysten/dapp-kit';
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from '@mysten/enoki';
import { useNavigate } from "react-router-dom";
import '../stvor.css';

const LoginForm = () => {
    const { mutate: connect } = useConnectWallet();
    const wallets = useWallets().filter(isEnokiWallet);
    const walletsByProvider = wallets.reduce(
        (map, wallet) => map.set(wallet.provider, wallet),
        new Map<AuthProvider, EnokiWallet>(),
    );
    const currentAccount = useCurrentAccount();
    const navigate = useNavigate();
 
    useEffect(() => {
        if (currentAccount) {
            navigate('/');
        }
    }, [currentAccount, navigate]);

    const googleWallet = walletsByProvider.get('google');
    // Я убрал facebookWallet, так как ты попросил пока его не использовать

    return (
        <div className="login-page-stvor">
            <header className="login-header-stvor">
                <h1 className="logo-stvor">STVOR</h1>
            </header>
            <div className="login-main-stvor">
                <div className="login-form-container-stvor">
                    <div className="form-inner-stvor">
                        <h2 className="form-title-stvor">Welcome!</h2>
                        <div className="button-group-stvor">
                            {googleWallet ? (
                                <button className="btn-social-stvor" onClick={() => connect({ wallet: googleWallet })}>
                                    <img src="/icons/download.png" alt="Google" className="social-icon-stvor" />
                                    <span>Sign in with Google</span>
                                </button>
                            ) : null}
                            {/* Кнопка для Facebook пока закомментирована */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;