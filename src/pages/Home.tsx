import React from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

const Home = () => {
    const currentAccount = useCurrentAccount();
    if(!currentAccount){
        return (
            <div>
                <h1>You are not logged in</h1>
                <Link to="/login">Login</Link>
            </div>
        )
    }
    return (
        <div>
            <h1>Welcome, {currentAccount.address}</h1>
            <p>You are logged in</p>

            <LogoutButton />
        </div>
    )
}

export default Home