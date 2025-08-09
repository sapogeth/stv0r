import React from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";

const LogoutButton = () => {
    const currentAccount = useCurrentAccount();
    const disconnectWallet = useDisconnectWallet();
    const navigate = useNavigate();

    const handleLogout = () => {
        disconnectWallet.mutate();
        navigate('/login');
    }

    if(!currentAccount) return null;
    return (
        <button onClick = {handleLogout}>Logout</button>
    )
}

export default LogoutButton