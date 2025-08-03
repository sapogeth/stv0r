import React from "react";
import { useConnectWallet, useCurrentAccount, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from '@mysten/enoki';


const Login = () => {
    const currentAccount = useCurrentAccount();
	const { mutate: connect } = useConnectWallet();
 
	const wallets = useWallets().filter(isEnokiWallet);
	const walletsByProvider = wallets.reduce(
		(map, wallet) => map.set(wallet.provider, wallet),
		new Map<AuthProvider, EnokiWallet>(),
	);
 
	const googleWallet = walletsByProvider.get('google');
	const facebookWallet = walletsByProvider.get('facebook');
 
	if (currentAccount) {
		return <div>Current address: {currentAccount.address}</div>;
	}
 
	return (
		<>
		<meta charSet="UTF-8" />
  		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
  		<title>Academic Secure Chat</title>
  		<link rel="stylesheet" href="stvor.css" />
  		<link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@300;400;700&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet"/>
		<div className="container">
    	{/* Экран приветствия */}
    	<div id="welcomeScreen" className="welcome-screen">
      		<div className="welcome-card">
        		<div className="academic-header">
          			<div className="university-logo">📚</div>
          				<h1>Academic Secure Chat</h1>
          				<p className="academic-subtitle">
            			Защищённая коммуникация для научного сообщества
          				</p>
        			</div>
        			<div id="authForms">
          				<div id="loginForm">
            				<h2 className="form-title">Вход в систему</h2>
              				<div className="button-group">
								{googleWallet ? (<button className="btn-academic" onClick={() => { connect({ wallet: googleWallet }); }}>Sign in with Google</button>) : null}
								{facebookWallet ? (<button className="btn-academic" onClick={() => { connect({ wallet: facebookWallet }); }}>Sign in with Facebook</button> ) : null}
              				</div>
            			</div>
          			</div>
        		</div>
      		</div>
    	</div>
    	{/* Основной интерфейс (показывается после входа) */}
    	<div id="mainApp" style={{ display: "none" }}>
      		<header className="academic-header">
        		<div className="header-content">
          			<div className="user-info">
            			<div className="user-avatar">👤</div>
            				<div>
              					<h1>Academic Secure Chat</h1>
             					<p className="subtitle"> Вы вошли как: <span id="currentUserDisplay" /></p>
            				</div>
          				</div>
        			</div>
        			<nav className="academic-nav">
          				<button className="nav-btn active" data-target="chatSection">Чаты</button>
          				<button className="nav-btn" data-target="encryptSection">Шифрование</button>
          				<button className="nav-btn" data-target="contactsSection">Контакты</button>
        			</nav>
      		</header>
      
      
      
    </div>
		</>
	);
}

export default Login