## Stv0r: Decentralized Nickname Management and Trading Platform on Sui

## Overview

**stv0r** is an innovative decentralized platform built on the Sui blockchain, offering users the unique ability to own, manage, and trade digital nicknames as Non-Fungible Tokens (NFTs). The project leverages advanced Sui technologies such as zkLogin for seamless authentication and Sui Kiosk for creating a dynamic and secure trading environment.

## Key Features

*   **NFT Nicknames**: Each nickname is represented as a unique NFT, ensuring true ownership and tradability.
*   **zkLogin Integration**: Simplified and secure authentication using familiar Web2 logins (Google, Facebook, etc.) without the need for private key management. This significantly lowers the entry barrier for new users into the Web3 space.
*   **Sui Kiosk Marketplace**: An integrated decentralized marketplace, utilizing the Sui Kiosk standard, allows users to list their nickname NFTs for sale, purchase them from other users, and manage their digital assets in a secure and transparent environment.
*   **Move Contracts**: The platform's logic is implemented in the Move language, ensuring high performance, security, and predictable execution of smart contracts.
*   **Nickname Ownership Management**: Users can easily manage their nicknames, including transferring them to other users.
*   **Sponsored Transactions (via Enoki)**: Integration with Enoki by Mysten Labs enables transaction sponsorship, eliminating the need for end-users to pay gas fees, making interaction with the platform even smoother and more accessible.

## Technical Stack

*   **Blockchain**: Sui
*   **Smart Contract Language**: Move
*   **Frontend**: React, TypeScript, Vite
*   **Sui Libraries**: `@mysten/dapp-kit`, `@mysten/enoki`, `@mysten/kiosk`, `@mysten/sui`, `@mysten/sui.js`, `@mysten/walrus`
*   **Authentication**: zkLogin (via Enoki)
*   **State Management**: `@tanstack/react-query`
*   **Routing**: `react-router-dom`

## Project Architecture

The stv0r project consists of two main parts:

1.  **Move Smart Contracts**: Located in the `move_contracts/nickname_nft` directory. This defines the logic for creating, managing, and transferring NicknameNFTs, as well as a registry to ensure nickname uniqueness and administrative rights.
    *   `nickname_nft.move`: The core contract defining the `NicknameNFT`, `NicknameRegistry`, and `AdminCap` structures, along with functions for minting, transferring, and querying nickname information.

2.  **Frontend Application**: Developed using React and TypeScript, located in the `src` directory. It provides the user interface for interacting with smart contracts and platform features.
    *   **Components**: Includes `Login`, `Register`, `Marketplace`, `NicknameManager`, `UserProfile`, `ChatInterface`, and others, providing full platform functionality.
    *   **Services**: The `src/services` directory contains logic for interacting with the Sui blockchain, including `kioskService.ts`, `nftService.ts`, `walrusService.ts`, and others, abstracting blockchain interaction details.
    *   **zkLogin and Enoki Integration**: Implemented through `RegisterEnokiWallets` and `LoginForm` components, ensuring seamless login and wallet management.

## Getting Started

To get stv0r up and running on your local machine, follow these steps:

### Prerequisites

*   Node.js (version 18 or higher)
*   npm or yarn
*   Sui CLI installed (for deploying Move contracts)

### Clone the repository

```bash
git clone https://github.com/sapogeth/stv0r.git
cd stv0r
```

### Install Frontend Dependencies

```bash
npm install
# or
yarn install
```

### Deploy Move Contracts

Navigate to the contract directory and publish it to the Sui network (e.g., `testnet` or `devnet`):

```bash
cd move_contracts/nickname_nft
sui move build
sui client publish --gas-budget 10000000
```

After publishing the contract, you will receive a `packageId` and other important object IDs. You will need to update these in the frontend configuration file (e.g., `src/config/contract.ts` or `src/config/contracts.ts`).

### Run the Frontend

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173` (or another port specified by Vite).

## Usage

1.  **Register/Login**: Use zkLogin to sign in via Google or other supported providers.
2.  **Nickname Management**: After logging in, you can mint new nicknames, view your existing NFTs, and manage them.
3.  **Marketplace**: Visit the marketplace section to list your nicknames for sale or purchase nicknames from other users.

## Contributing

We welcome contributions to stv0r. If you have ideas, suggestions, or want to report a bug, please create an Issue or Pull Request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## References

*   [Sui Documentation](https://docs.sui.io/)
*   [zkLogin Documentation](https://docs.sui.io/concepts/cryptography/zklogin)
*   [Enoki by Mysten Labs](https://docs.enoki.mystenlabs.com/)
*   [Sui Move Intro Course](https://github.com/sui-foundation/sui-move-intro-course)
*   [Sui Kiosk Standard](https://docs.sui.io/standards/kiosk)
*   [Walrus Docs](https://github.com/MystenLabs/walrus-docs)
*   [Seal Docs](https://github.com/MystenLabs/seal)


