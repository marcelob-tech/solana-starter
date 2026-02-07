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
const vaultState = new PublicKey("FZu7gTVjTd8Be9t8d5td2difYMztCgb6MymTvKDCZLDN");

// Create the PDA for our enrollment account
// const vaultAuth = ???
const [vaultAuth] = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), vaultState.toBuffer()],
  programId,
);

// Create the vault key
const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultAuth.toBuffer()],
  programId,
);

// Execute our enrollment transaction
(async () => {
  try {
    const amountLamports = 70_000_000n;

    const data = Buffer.alloc(1 + 8);
    data.writeUInt8(1, 0);
    data.writeBigUInt64LE(amountLamports, 1);

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultState, isSigner: false, isWritable: true },
        { pubkey: vaultAuth, isSigner: false, isWritable: false },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
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
