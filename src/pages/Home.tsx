import React from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import LogoutButton from '../components/LogoutButton';
import KioskComponent from '../components/KioskComponent';
import Login from './Login';
import '../stvor.css';

const Home = () => {
    const currentAccount = useCurrentAccount();

    if (!currentAccount) {
        return <Login />;
    }

    return (
        <div className="chat-container">
            <div className="chat-sidebar">
                <h1 className="chat-header">Academic Secure Chat</h1>
                <div className="chat-sidebar-account">
                    <p>Logged in as:</p>
                    <p><strong>{currentAccount.address}</strong></p>
                </div>
                <LogoutButton />
            </div>
            <div className="chat-main">
                <div className="kiosk-section">
                    <h2>Sui Kiosk</h2>
                    <KioskComponent />
                </div>
            </div>
        </div>
    );
};

export default Home;