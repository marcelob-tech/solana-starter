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
import wallet from "../turbin3-wallet.json"
/// 3njzSa5GMB7nPyP4xwKdmMS9KMhc7DF3yjHhcFG5YTSy

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Commitment
const commitment: Commitment = "confirmed";

// Create a devnet connection
const connection = new Connection("https://api.devnet.solana.com");

const programId = new PublicKey("26fuYGrUBSa5wjzeUNu42MaQQzraX4kfchtTM9NTUKbM");

// Create a random keypair
const vaultState = Keypair.generate();
console.log(`Vault public key: ${vaultState.publicKey.toBase58()}`);

// Create the PDA for our enrollment account
console.log(`Vault state public key: ${vaultState.publicKey.toBase58()}`);

// Seeds are "auth", vaultState
const [vaultAuth] = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), vaultState.publicKey.toBuffer()],
  programId,
);

// Create the vault key
console.log(`Vault auth public key: ${vaultAuth.toBase58()}`);

// Seeds are "vault", vaultAuth
const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultAuth.toBuffer()],
  programId,
);

// Borsh encoding for:
// enum WbaVaultInstruction { Initialize, Deposit{u64}, Withdraw{u64}, ... }
// => Initialize discriminant = 0u8
const ixData = Buffer.from([0]);

// Execute our enrollment transaction
(async () => {
  try {
    const keys = [
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultState.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultAuth, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const ix = new TransactionInstruction({
      programId,
      keys,
      data: ixData,
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = keypair.publicKey;

    const signature = await sendAndConfirmTransaction(connection, tx, [keypair, vaultState], {
      commitment,
    });

    console.log(
      `Init success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
