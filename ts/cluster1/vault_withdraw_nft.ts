import {
  Connection,
  Keypair,
  SystemProgram,
  PublicKey,
  Commitment,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import wallet from "../turbin3-wallet.json";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Commitment
const commitment: Commitment = "finalized";

// Create a devnet connection
const connection = new Connection("https://api.devnet.solana.com");

const programId = new PublicKey("26fuYGrUBSa5wjzeUNu42MaQQzraX4kfchtTM9NTUKbM");

// Create a random keypair
const vaultState = new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG");


// Create the PDA for our enrollment account
// Seeds are "auth", vaultState
// const vaultAuth = ???

// Create the vault key
// Seeds are "vault", vaultAuth
// const vault = ???

// Mint address
const mint = new PublicKey("DPSMu4DeRwdjR7mTpKxQp7jxXFAZLf4FxdHsQByFHNFk");

// Execute our enrollment transaction
(async () => {
  try {
    const metadataProgram = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    );
    const metadataAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), metadataProgram.toBuffer(), mint.toBuffer()],
      metadataProgram,
    )[0];
    const masterEdition = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        metadataProgram.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      metadataProgram,
    )[0];

    // Create the PDA for our enrollment account
    const [vaultAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("auth"), vaultState.toBuffer()],
      programId,
    );

    const vaultAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      vaultAuth,
      true,
    );

    const ownerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey,
      false,
    );

    // WithdrawNft discriminant = 6u8 (see Rust enum order)
    const data = Buffer.from([6]);

    const ix = new TransactionInstruction({
      programId,
      data,
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: ownerAta.address, isSigner: false, isWritable: true },
        { pubkey: vaultState, isSigner: false, isWritable: false },
        { pubkey: vaultAuth, isSigner: false, isWritable: false },
        { pubkey: vaultAta.address, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: metadataAccount, isSigner: false, isWritable: false },
        { pubkey: masterEdition, isSigner: false, isWritable: false },
        { pubkey: metadataProgram, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
      commitment,
    });

    console.log(
      `Withdraw NFT success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
