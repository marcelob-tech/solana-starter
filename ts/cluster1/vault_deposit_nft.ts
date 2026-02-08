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
import {
  Wallet,
  AnchorProvider,
} from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import wallet from "../turbin3-wallet.json";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Commitment
const commitment: Commitment = "finalized";

// Create a devnet connection
const connection = new Connection("https://api.devnet.solana.com");

// Create our anchor provider
const provider = new AnchorProvider(connection, new Wallet(keypair), {
  commitment,
});

// Create our program
const programId = new PublicKey("26fuYGrUBSa5wjzeUNu42MaQQzraX4kfchtTM9NTUKbM");

// Create a random keypair
const vaultState = new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG");

// Create the PDA for our enrollment account
const [vaultAuth] = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), vaultState.toBuffer()],
  programId,
);

// Create the vault key
// const vault = ???
const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultAuth.toBuffer()],
  programId,
);

// Mint address
const mint = new PublicKey("DPSMu4DeRwdjR7mTpKxQp7jxXFAZLf4FxdHsQByFHNFk");

// Execute our deposit transaction
(async () => {
  try {
    const _ = provider;
    console.log("owner:", keypair.publicKey.toBase58());
    console.log("vaultAuth:", vaultAuth.toBase58());
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

    const ownerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey,
    );

    const vaultAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      vaultAuth,
      true,
    );

    console.log("ownerAta:", ownerAta.address.toBase58());
    console.log("vaultAta:", vaultAta.address.toBase58());

    const data = Buffer.from([5]);

    const ix = new TransactionInstruction({
      programId,
      data,
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: ownerAta.address, isSigner: false, isWritable: true },
        { pubkey: vaultState, isSigner: false, isWritable: true },
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
    console.log(`Deposit success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
