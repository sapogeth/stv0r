import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
  useCurrentAccount,
} from '@mysten/dapp-kit';
import './App.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterEnokiWallets from './components/RegisterEnokiWallets';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import LoginForm from './components/LoginForm';
import Register from './components/Register';
import { SetupPassword } from './components/SetupPassword';
import { ProtectedPage } from './components/ProtectedPage';
import React from 'react';

const { networkConfig } = createNetworkConfig({
  testnet: { url: 'http://localhost:5173/sui-api' },
  mainnet: { url: 'http://localhost:5173/sui-api' },
});

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const [hasChecked, setHasChecked] = React.useState(false);

  React.useEffect(() => {
    if (account !== undefined) {
      setHasChecked(true);
    }
  }, [account]);

  if (!hasChecked) {
    return null;
  }

  return account ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <RegisterEnokiWallets />
        <WalletProvider autoConnect>
          <BrowserRouter basename="/stv0r/">
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Home />} />
              <Route path="/setup" element={<AuthGuard><SetupPassword /></AuthGuard>} />
              <Route path="/marketplace" element={<AuthGuard><ProtectedPage /></AuthGuard>} />
            </Routes>
          </BrowserRouter>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;