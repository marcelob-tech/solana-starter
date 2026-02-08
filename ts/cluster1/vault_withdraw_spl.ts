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
const vaultState = new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG");

// SPL Mint address (set this to the token you deposited)
const mint = new PublicKey("GKx8cKAqVA57oMd87YUtUQtLefDxHfVW2g23jR9cDGbS");

(async () => {
  try {
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

    const amount = 30_000n;
    const data = Buffer.alloc(1 + 8);
    data.writeUInt8(4, 0); // WithdrawSpl discriminant
    data.writeBigUInt64LE(amount, 1);

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
      `Withdraw SPL success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
