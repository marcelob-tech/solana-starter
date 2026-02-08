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

## NFT


Succesfully Minted! Check out your TX here:
https://explorer.solana.com/tx/5CuKEPrFx9vzFChX7wAbfzYexwcZYvS634Z9xb8XrwuwdZ4AZ4ZfA1TzeyFfU3RpV4jPdyzvYBafgr2bbb84Vpv2?cluster=devnet
Mint Address:  7Uc5M382jvc6FsPpNQwFc6AVriD56seNcgtqxJ7pb5wM

Your metadata URI:  https://gateway.irys.xyz/G4QsXCYey9vC5VfccUMv1Q7jEEUeyP6AHWWzGXZVabRG

Succesfully Minted! Check out your TX here:
https://explorer.solana.com/tx/3G7ucXNExEz61ihCGbX5Qhsh2xyeC25oLYekGJ6LYgUbNZH8fN1BfLhXG9PdWYv9cQuUtsSAC2CH8k9zysAESAJQ?cluster=devnet
Mint Address:  GzjBDEovjXhxzP3sDJrySA5W8thkPF9TVEc1fwyCwm4r

Your metadata URI:  https://gateway.irys.xyz/A7twE8o1BaHTDUeFLpCgB68J38m22m4wE1eBTC5bdCw5

Succesfully Minted! Check out your TX here:
https://explorer.solana.com/tx/451qoMWYW52dUiTZkZen11hqwrebfX991qQk4ETnXXTdHZjxeVSjqSr3Z4go6qaBnCL6S5xi5mmrBHRniibpMhBL?cluster=devnet
Mint Address:  5s4Czt5oPFL7f3kUbPCSZtistbHXiVNjMdgDZq2a8z7B


![NFT Screenshot](image.png)

![NFT Screenshot](image-1.png)

The problem is that was so manual, i create a function that implment a mint NFT workflow, but it could be better it could be a list of images and metadata uri, for now i'm using the same image for my NFTs

```bash
npx ts-node nft_workflow.ts 3 https://gateway.irys.xyz/Bge7FE42NX6pemFpU95RazhWJpt4XgM6dLXZGk5kHFHf
```


 Starting workflow to mint 3 NFT(s)

Using provided image URI: https://gateway.irys.xyz/Bge7FE42NX6pemFpU95RazhWJpt4XgM6dLXZGk5kHFHf

--- NFT 1/3 ---
Uploading metadata for NFT #3...
Metadata URI: https://gateway.irys.xyz/5Kz6SRWDaj86UvrhMqb4sG4nfJRGUuKfiSG3Cqqanhmm
🔨 Minting NFT #3...
Succesfully Minted! TX: https://explorer.solana.com/tx/3EyAW9ERKBbDGRVvp9yZXC48FgJ7APSTa5JiZrEVhJKpTgp3HH8ofUJhKUHtduRXiEHeQVR74DVWta6bgarj2LrU?cluster=devnet
   Mint Address: Hr859vujkUYxMp4xg4Tk6Q1qopX4B15MtzPbujpg6gct

--- NFT 2/3 ---
Uploading metadata for NFT #4...
Metadata URI: https://gateway.irys.xyz/9QW963UUdY6NqawAiPhSYtUC33pBKSYfHefNBTVXkUc4
🔨 Minting NFT #4...
Succesfully Minted! TX: https://explorer.solana.com/tx/3bcEuTxsTVD92ak5Jt3ARnEQbUoqzyorkoUzXbo2WGnnLvbc9VGou3Krs12FuLw3kESf9x4tpNjMY7nmppJHdUpP?cluster=devnet
   Mint Address: BCg4a5Khao1Y2XDzUpTTX9jpfzKsBVWjNmTMYFkbqAwz

--- NFT 3/3 ---
Uploading metadata for NFT #5...
Metadata URI: https://gateway.irys.xyz/68BFKkn6BitaDyZ1hmCVoFwEqxpoq6p9ezA3dWUypHdK
🔨 Minting NFT #5...
Succesfully Minted! TX: https://explorer.solana.com/tx/3rhQGQ56hsrocLgLP3hUT5c2ENGHZZPBDpTvFSqAEBDULEbXtZgEKWFRNHTQmw7dia2EB5CfFeWDR7d5yeH8vhGH?cluster=devnet
   Mint Address: 7v87mB8AaUWSFogAiCHviNykc9Mv5iWLAdjb5Wbd5P5t

🎉 Successfully minted 3 NFT(s)!

Summary:
  #3: Hr859vujkUYxMp4xg4Tk6Q1qopX4B15MtzPbujpg6gct
  #4: BCg4a5Khao1Y2XDzUpTTX9jpfzKsBVWjNmTMYFkbqAwz
  #5: 7v87mB8AaUWSFogAiCHviNykc9Mv5iWLAdjb5Wbd5P5t




---
Vault unit tests :

![alt text](image-2.png)