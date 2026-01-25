# solana-starter

## Overview

Starter project for Solana exercises.

## Setup

### TypeScript

```bash
cd ts
npm install
```

### Wallet

These scripts expect a local wallet file (do not commit it):


The wallet file must be a JSON array of numbers (secret key bytes), compatible with:

```ts
Keypair.fromSecretKey(new Uint8Array(wallet));
```

## Token

- **Init SPL (devnet)**: [mint transaction](https://explorer.solana.com/tx/4SEKbUdinoRnedoBLp8818rLfvCaKpr1UAarvPPGehJEsmyC2xpmWQgjnajLpfSA7ZDYtWRv3fdzbSmzj4z4J28L?cluster=devnet)
- **Minting (devnet)**: [minting BOT3](https://explorer.solana.com/tx/2FXrq54YGVpvWE7hxBx6WdM3q6d4tQm4HeKgJgPfn5khBaipMvgCnwy9WPQBTiuvN7xfcoFRubec1GpsWDyBFmj2?cluster=devnet)
- **Token Transfer (devnet)**: [Token transfer](https://explorer.solana.com/tx/29D6kAwbuctthxK5CmD5MAH38YqfkFwF3Cx95S86hNhp2eLsBHRfYHZN7axrAowS3B1MmPEPELVD8gVdr9vgULmW?cluster=devnet)
- **Symbol**: BOT3





### Screenshot

![Token Screenshot](screenshot/token1.png)

![Token Screenshot](screenshot/token2.png)

![Token Screenshot](screenshot/token3.png)

![Token Screenshot](screenshot/token4.png)

![Token Screenshot](screenshot/token5.png)

![Token Screenshot](screenshot/token6.png)

