import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
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

const RPC_ENDPOINT = "https://api.devnet.solana.com";

const DEFAULT_PROGRAM_ID = new PublicKey(
  "26fuYGrUBSa5wjzeUNu42MaQQzraX4kfchtTM9NTUKbM",
);

const DEFAULT_VAULT_STATE = new PublicKey(
  "9HwjRzkGd5VuxtCtRcyVt4NJiVkqBVkS5tZMTkBuB4zK",
);

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

function deriveVaultAuth(programId: PublicKey, vaultState: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("auth"), vaultState.toBuffer()],
    programId,
  )[0];
}

function deriveVaultPda(programId: PublicKey, vaultAuth: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultAuth.toBuffer()],
    programId,
  )[0];
}

function deriveMetadataPdas(mint: PublicKey): {
  metadataProgram: PublicKey;
  metadataAccount: PublicKey;
  masterEdition: PublicKey;
} {
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

  return { metadataProgram, metadataAccount, masterEdition };
}

async function inspectVault(
  connection: Connection,
  programId: PublicKey,
  vaultState: PublicKey,
) {
  const vaultAuth = deriveVaultAuth(programId, vaultState);
  const vaultPda = deriveVaultPda(programId, vaultAuth);

  const vaultLamports = await connection.getBalance(vaultPda);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(vaultAuth, {
    programId: TOKEN_PROGRAM_ID,
  });

  console.log("vaultState:", vaultState.toBase58());
  console.log("owner:", keypair.publicKey.toBase58());
  console.log("vaultAuth:", vaultAuth.toBase58());
  console.log("vaultPda:", vaultPda.toBase58());
  console.log("vault SOL:", vaultLamports / 1e9);

  console.log("\nToken accounts owned by vaultAuth:");
  if (tokenAccounts.value.length === 0) {
    console.log("(none)");
  } else {
    for (const { pubkey, account } of tokenAccounts.value) {
      const parsed: any = account.data.parsed;
      const info = parsed?.info;
      const mint = info?.mint as string | undefined;
      const tokenAmount = info?.tokenAmount;
      console.log("---");
      console.log("tokenAccount:", pubkey.toBase58());
      console.log("mint:", mint);
      console.log(
        "amount:",
        tokenAmount?.uiAmountString ?? tokenAmount?.amount,
        "decimals:",
        tokenAmount?.decimals,
      );
    }
  }

  return { vaultAuth, vaultPda, vaultLamports, tokenAccounts };
}

async function sendTx(connection: Connection, ix: TransactionInstruction) {
  const tx = new Transaction().add(ix);
  return await sendAndConfirmTransaction(connection, tx, [keypair], {
    commitment: "confirmed",
  });
}

async function withdrawSolIfAny(
  connection: Connection,
  programId: PublicKey,
  vaultState: PublicKey,
  vaultAuth: PublicKey,
  vaultPda: PublicKey,
  vaultLamports: number,
  cleanAll: boolean,
) {
  const withdrawAmount = BigInt(Math.max(0, cleanAll ? vaultLamports : vaultLamports - 890_880));
  if (withdrawAmount === 0n) {
    return;
  }

  const data = Buffer.alloc(1 + 8);
  data.writeUInt8(2, 0);
  data.writeBigUInt64LE(withdrawAmount, 1);

  const ix = new TransactionInstruction({
    programId,
    data,
    keys: [
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultState, isSigner: false, isWritable: false },
      { pubkey: vaultAuth, isSigner: false, isWritable: false },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });

  const sig = await sendTx(connection, ix);
  console.log(
    `Withdraw SOL success: https://explorer.solana.com/tx/${sig}?cluster=devnet`,
  );
}

async function withdrawSpl(
  connection: Connection,
  programId: PublicKey,
  vaultState: PublicKey,
  vaultAuth: PublicKey,
  mint: PublicKey,
  amount: bigint,
) {
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

  const data = Buffer.alloc(1 + 8);
  data.writeUInt8(4, 0);
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

  const sig = await sendTx(connection, ix);
  console.log(
    `Withdraw SPL success (${mint.toBase58()}): https://explorer.solana.com/tx/${sig}?cluster=devnet`,
  );
}

async function withdrawNft(
  connection: Connection,
  programId: PublicKey,
  vaultState: PublicKey,
  vaultAuth: PublicKey,
  mint: PublicKey,
) {
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

  const { metadataProgram, metadataAccount, masterEdition } = deriveMetadataPdas(mint);

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

  const sig = await sendTx(connection, ix);
  console.log(
    `Withdraw NFT success (${mint.toBase58()}): https://explorer.solana.com/tx/${sig}?cluster=devnet`,
  );
}

async function closeVaultState(
  connection: Connection,
  programId: PublicKey,
  vaultState: PublicKey,
  closeDestination: PublicKey,
) {
  const data = Buffer.from([7]);

  const ix = new TransactionInstruction({
    programId,
    data,
    keys: [
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: closeDestination, isSigner: false, isWritable: true },
      { pubkey: vaultState, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });

  const sig = await sendTx(connection, ix);
  console.log(
    `Close vaultState success: https://explorer.solana.com/tx/${sig}?cluster=devnet`,
  );
}

(async () => {
  const programId = DEFAULT_PROGRAM_ID;
  const vaultState = process.argv[2]
    ? new PublicKey(process.argv[2])
    : DEFAULT_VAULT_STATE;

  const mode = (process.argv[3] || "close") as
    | "inspect"
    | "withdraw"
    | "close";

  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  if (mode === "inspect") {
    await inspectVault(connection, programId, vaultState);
    return;
  }

  const before = await inspectVault(connection, programId, vaultState);

  if (mode === "withdraw" || mode === "close") {
    for (const { account } of before.tokenAccounts.value) {
      const parsed: any = account.data.parsed;
      const info = parsed?.info;
      const mintStr = info?.mint as string | undefined;
      const tokenAmount = info?.tokenAmount;
      const rawAmountStr = tokenAmount?.amount as string | undefined;
      const decimals = tokenAmount?.decimals as number | undefined;

      if (!mintStr || !rawAmountStr || typeof decimals !== "number") {
        continue;
      }

      const mint = new PublicKey(mintStr);
      const rawAmount = BigInt(rawAmountStr);

      if (rawAmount === 0n) {
        continue;
      }

      if (decimals === 0 && rawAmount === 1n) {
        await withdrawNft(connection, programId, vaultState, before.vaultAuth, mint);
      } else {
        await withdrawSpl(connection, programId, vaultState, before.vaultAuth, mint, rawAmount);
      }
    }

    await withdrawSolIfAny(
      connection,
      programId,
      vaultState,
      before.vaultAuth,
      before.vaultPda,
      before.vaultLamports,
      mode === "close",
    );
  }

  if (mode === "withdraw") {
    await inspectVault(connection, programId, vaultState);
    return;
  }

  const after = await inspectVault(connection, programId, vaultState);
  const nonZeroTokenAccounts = after.tokenAccounts.value.filter(({ account }) => {
    const parsed: any = account.data.parsed;
    const info = parsed?.info;
    const tokenAmount = info?.tokenAmount;
    const rawAmountStr = tokenAmount?.amount as string | undefined;
    if (!rawAmountStr) {
      return false;
    }
    try {
      return BigInt(rawAmountStr) > 0n;
    } catch {
      return false;
    }
  });

  if (nonZeroTokenAccounts.length > 0) {
    console.error(
      "Vault still has non-zero token balances; refusing to close vaultState",
    );
    return;
  }

  await closeVaultState(connection, programId, vaultState, keypair.publicKey);
})();
