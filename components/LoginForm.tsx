import React, { useEffect, useState } from "react";
import { useConnectWallet, useWallets, useCurrentAccount } from '@mysten/dapp-kit';
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from '@mysten/enoki';
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from 'framer-motion';
import { X, Chrome, Facebook, Twitch } from 'lucide-react';
import '../stvor.css'; // Assuming this file contains basic styles

const LoginForm = () => {
    const { mutate: connect, data: connectData, error: connectError, isSuccess } = useConnectWallet();
    const wallets = useWallets().filter(isEnokiWallet);
    const walletsByProvider = wallets.reduce(
        (map, wallet) => map.set(wallet.provider, wallet),
        new Map<AuthProvider, EnokiWallet>(),
    );
    const currentAccount = useCurrentAccount();
    const navigate = useNavigate();
    const [displayError, setDisplayError] = useState<string | null>(null);
    const [showProviderModal, setShowProviderModal] = useState(false);

    useEffect(() => {
        if (currentAccount) {
            navigate('/');
        } else if (isSuccess && connectData) {
            console.log('Connect success, redirecting:', connectData);
            window.location.replace('/');
        } else if (connectError) {
            console.error('Connect error:', connectError);
            if (connectError.message.includes('Popup closed')) {
                setDisplayError('Login cancelled. Popup was closed.');
            } else {
                setDisplayError(`Error: ${connectError.message}`);
            }
            setTimeout(() => setDisplayError(null), 5000);
        }
    }, [currentAccount, navigate, isSuccess, connectData, connectError]);

    const googleWallet = walletsByProvider.get('google');
    const facebookWallet = walletsByProvider.get('facebook');
    const twitchWallet = walletsByProvider.get('twitch');

    const handleLoginClick = () => {
        setShowProviderModal(true);
    };

    const handleProviderLogin = (provider: AuthProvider) => {
        let walletToConnect;
        switch (provider) {
            case 'google':
                walletToConnect = googleWallet;
                break;
            case 'facebook':
                walletToConnect = facebookWallet;
                break;
            case 'twitch':
                walletToConnect = twitchWallet;
                break;
            default:
                setDisplayError(`Unsupported provider: ${provider}`);
                return;
        }

        if (walletToConnect) {
            connect({
                wallet: walletToConnect,
                redirectUrl: import.meta.env.VITE_REDIRECT_URI,
            });
        } else {
            setDisplayError(`No ${provider} wallet available. Check configuration.`);
        }
        setShowProviderModal(false);
    };



    const closeModal = () => {
        setShowProviderModal(false);
    };

    return (
        <div className="login-container">
            <motion.div 
                className="login-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <motion.h1 
                    className="logo"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    STVOR
                </motion.h1>
                
                <motion.div 
                    className="buttons"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <motion.button 
                        className="btn login-btn"
                        onClick={handleLoginClick}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                        Log In
                    </motion.button>
                    

                </motion.div>

                {displayError && (
                    <motion.div 
                        className="error-message"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {displayError}
                    </motion.div>
                )}
            </motion.div>

            <AnimatePresence>
                {showProviderModal && (
                    <motion.div 
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                    >
                        <motion.div 
                            className="modal-content"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Choose Login Method</h2>
                                <button className="close-btn" onClick={closeModal}>
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="provider-buttons">
                                <motion.button 
                                    className="provider-btn google-btn"
                                    onClick={() => handleProviderLogin('google')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Chrome size={20} />
                                    Continue with Google
                                </motion.button>
                                
                                <motion.button 
                                    className="provider-btn facebook-btn"
                                    onClick={() => handleProviderLogin('facebook')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Facebook size={20} />
                                    Continue with Facebook
                                </motion.button>

                                {twitchWallet && (
                                    <motion.button 
                                        className="provider-btn twitch-btn"
                                        onClick={() => handleProviderLogin('twitch')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Twitch size={20} />
                                        Continue with Twitch
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LoginForm;