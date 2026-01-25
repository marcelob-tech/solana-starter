import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "../turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 1_000_000n;

// Mint address
// const mint = new PublicKey("Hj7fY1Y2XxEZShvmNTBrDbyWEECBfgZwjKHDvCraKnkE");
// const mint = new PublicKey("BGqcSPU55Wsbe9yg3NoZCHEVG1wvDUpXm6p9FMrGrsfx");
// const mint = new PublicKey("2Wsezgj1vJihCzAq2k8pGBeHcrMVwKkRa9FSnzNFBkLv");

const mint = new PublicKey("GKx8cKAqVA57oMd87YUtUQtLefDxHfVW2g23jR9cDGbS");

(async () => {
    try {
        // Create an ATA
        const ataAddress = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
        console.log(`Your ata is: ${ataAddress.address.toBase58()}`);

        // Mint to ATA
        const mintTx = await mintTo(connection, keypair, mint, ataAddress.address, keypair.publicKey, 8888887);
        console.log(`Your mint tx: ${mintTx}`);
    } catch (error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
