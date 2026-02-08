import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const programId = new PublicKey("26fuYGrUBSa5wjzeUNu42MaQQzraX4kfchtTM9NTUKbM");
const vaultState = new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG");

const [vaultAuth] = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), vaultState.toBuffer()],
  programId,
);

const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultAuth.toBuffer()],
  programId,
);

(async () => {
  const vaultLamports = await connection.getBalance(vault);
  console.log("vaultState:", vaultState.toBase58());
  console.log("vaultAuth:", vaultAuth.toBase58());
  console.log("vaultPda:", vault.toBase58());
  console.log("vault SOL:", vaultLamports / 1e9);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(vaultAuth, {
    programId: TOKEN_PROGRAM_ID,
  });

  console.log("\nToken accounts owned by vaultAuth:");
  if (tokenAccounts.value.length === 0) {
    console.log("(none)");
    return;
  }

  for (const { pubkey, account } of tokenAccounts.value) {
    const parsed: any = account.data.parsed;
    const info = parsed?.info;
    const mint = info?.mint;
    const owner = info?.owner;
    const tokenAmount = info?.tokenAmount;

    console.log("---");
    console.log("tokenAccount:", pubkey.toBase58());
    console.log("mint:", mint);
    console.log("owner:", owner);
    console.log(
      "amount:",
      tokenAmount?.uiAmountString ?? tokenAmount?.amount,
      "decimals:",
      tokenAmount?.decimals,
    );
  }
})();
