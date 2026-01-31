import wallet from "../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity, generateSigner, percentAmount } from "@metaplex-foundation/umi"
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile, writeFile } from "fs/promises"
import path from "path"
import base58 from "bs58";

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const umi = createUmi(RPC_ENDPOINT);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));
umi.use(mplTokenMetadata());

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

// 1. Upload image and return URI
async function uploadImage(imagePath: string): Promise<string> {
    console.log("📤 Uploading image...");
    const image = await readFile(path.join(__dirname, imagePath));
    const genericFile = createGenericFile(image, path.basename(imagePath), {
        contentType: "image/png",
    });
    const [imageUri] = await umi.uploader.upload([genericFile]);
    console.log("Image URI:", imageUri);
    return imageUri;
}

// 2. Create and upload metadata, return metadata URI
async function uploadMetadata(imageUri: string, nftNumber: number): Promise<string> {
    console.log(`Uploading metadata for NFT #${nftNumber}...`);
    const metadata = {
        name: `Mustashoo #${nftNumber}`,
        symbol: "MUST",
        description: "The Mustashoos is a collection of 1,000 unique Mustachoo NFTs.",
        image: imageUri,
        attributes: [
            { trait_type: "Mustache", value: "Mustache" },
            { trait_type: "Collection", value: "The Mustashoos" },
            { trait_type: "Max Supply", value: "1000" },
        ],
        properties: {
            files: [{ type: "image/png", uri: imageUri }]
        },
    };

    const metadataJson = JSON.stringify(metadata);
    const metadataFile = createGenericFile(
        new TextEncoder().encode(metadataJson),
        `metadata-${nftNumber}.json`,
        { contentType: "application/json" }
    );
    const [metadataUri] = await umi.uploader.upload([metadataFile]);
    console.log("Metadata URI:", metadataUri);
    return metadataUri;
}

// 3. Mint NFT with metadata URI
async function mintNft(metadataUri: string, nftNumber: number): Promise<string> {
    console.log(`🔨 Minting NFT #${nftNumber}...`);
    const mint = generateSigner(umi);
    
    let tx = await createNft(umi, {
        mint,
        name: `Mustashoo #${nftNumber}`,
        symbol: "MUST",
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(3),
        isMutable: false,
    });
    
    let result = await tx.sendAndConfirm(umi);
    const signature = base58.encode(result.signature);
    
    console.log(`Succesfully Minted! TX: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log(`   Mint Address: ${mint.publicKey}`);
    
    return mint.publicKey.toString();
}

// Workflow: Mint N NFTs
async function mintMultipleNfts(count: number, imagePath?: string, imageUri?: string) {
    console.log(`\n Starting workflow to mint ${count} NFT(s)\n`);
    
    // Upload image or use provided URI
    let finalImageUri: string;
    if (imageUri) {
        console.log("Using provided image URI:", imageUri);
        finalImageUri = imageUri;
    } else if (imagePath) {
        finalImageUri = await uploadImage(imagePath);
    } else {
        throw new Error("Either imagePath or imageUri must be provided");
    }
    
    const mintedNfts: Array<{ number: number; mint: string; metadataUri: string }> = [];
    
    for (let i = 0; i < count; i++) {
        console.log(`\n--- NFT ${i + 1}/${count} ---`);
        
        const contador = await readCounter();
        
        // Upload metadata for this specific NFT
        const metadataUri = await uploadMetadata(finalImageUri, contador);
        
        // Mint NFT
        const mintAddress = await mintNft(metadataUri, contador);
        
        // Save result
        mintedNfts.push({
            number: contador,
            mint: mintAddress,
            metadataUri: metadataUri
        });
        
        // Increment counter
        await writeCounter(contador + 1);
        
        // Small delay between mints to avoid rate limits
        if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log(`\n🎉 Successfully minted ${count} NFT(s)!`);
    console.log("\nSummary:");
    mintedNfts.forEach(nft => {
        console.log(`  #${nft.number}: ${nft.mint}`);
    });
    
    return mintedNfts;
}

// CLI: node nft_workflow.ts [count] [imageUrl]
(async () => {
    const count = parseInt(process.argv[2]) || 1;
    const imageUri = process.argv[3]; // Optional: image URL already uploaded
    
    if (count < 1 || count > 1000) {
        console.error("Please specify a count between 1 and 1000");
        process.exit(1);
    }
    
    try {
        if (imageUri) {
            await mintMultipleNfts(count, undefined, imageUri);
        } else {
            await mintMultipleNfts(count);
        }
    } catch (error) {
        console.error("Workflow failed:", error);
        process.exit(1);
    }
})();
