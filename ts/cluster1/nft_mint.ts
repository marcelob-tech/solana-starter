import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity, generateSigner, percentAmount, publicKey } from "@metaplex-foundation/umi"
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

import wallet from "../turbin3-wallet.json"
import base58 from "bs58";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const umi = createUmi(RPC_ENDPOINT);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(myKeypairSigner));
umi.use(mplTokenMetadata())

const mint = generateSigner(umi);

const counterPath = path.join(__dirname, "nft_counter.json");

async function readCounter(): Promise<number> {
    try {
        const raw = await readFile(counterPath, "utf-8");
        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            "value" in parsed &&
            typeof (parsed as any).value === "number" &&
            Number.isFinite((parsed as any).value)
        ) {
            return (parsed as any).value;
        }
        return 1;
    } catch {
        return 1;
    }
}

async function writeCounter(nextValue: number): Promise<void> {
    await writeFile(counterPath, JSON.stringify({ value: nextValue }), "utf-8");
}

(async () => {
    const contador = await readCounter();
    
    // URI do metadata
    const metadataUri = "https://gateway.irys.xyz/A7twE8o1BaHTDUeFLpCgB68J38m22m4wE1eBTC5bdCw5";

    // Mint do NFT com a URI do metadata já hospedado
    let tx = await createNft(umi, {
        mint,
        name: `Mustashoo #${contador}`,
        symbol: "MUST",
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(3),
        isMutable: false,
    });
    let result = await tx.sendAndConfirm(umi);
    const signature = base58.encode(result.signature);

    await writeCounter(contador + 1);
    
    console.log(`Succesfully Minted! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`)
    console.log("Mint Address: ", mint.publicKey);
})();