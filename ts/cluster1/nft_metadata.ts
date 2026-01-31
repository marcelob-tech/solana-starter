import wallet from "../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs/promises";
import * as path from "path";

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

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


(async () => {
    try {
        const contador = await readCounter();
        const image ="https://gateway.irys.xyz/Bge7FE42NX6pemFpU95RazhWJpt4XgM6dLXZGk5kHFHf"
        const metadata = {
            name: `Mustashoo #${contador}`,
            symbol: "MUST",
            description: "The Mustashoos is a collection of 1,000 unique Mustachoo NFTs.",
            image: image,
            attributes: [
                {trait_type: "Mustache", value: "Mustache"},
                {trait_type: "Collection", value: "The Mustashoos" },
                {trait_type: "Max Supply", value: "1000" },
            ],
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: image
                    },
                ]
            },
        };

        // Convert metadata to JSON string and create GenericFile
        const metadataJson = JSON.stringify(metadata);
        const metadataFile = createGenericFile(
            new TextEncoder().encode(metadataJson),
            `metadata-${contador}.json`,
            { contentType: "application/json" }
        );

        const [myUri] = await umi.uploader.upload([metadataFile]);
        console.log("Your metadata URI: ", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
