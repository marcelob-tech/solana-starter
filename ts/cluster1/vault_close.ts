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

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Commitment
const commitment: Commitment = "confirmed";

// Create a devnet connection
const connection = new Connection("https://api.devnet.solana.com");

const programId = new PublicKey("26fuYGrUBSa5wjzeUNu42MaQQzraX4kfchtTM9NTUKbM");
const vaultState = new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG");

// Where to receive the reclaimed lamports from vaultState.
// Usually the owner wallet.
const closeVaultState = keypair.publicKey;

(async () => {
  try {
    // CloseAccount discriminant = 7u8 (see Rust enum order)
    const data = Buffer.from([7]);

    const ix = new TransactionInstruction({
      programId,
      data,
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: closeVaultState, isSigner: false, isWritable: true },
        { pubkey: vaultState, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
      commitment,
    });
    console.log(
      `Close success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
