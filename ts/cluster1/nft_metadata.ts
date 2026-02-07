import wallet from "../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs";

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

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

let contador = 0

(async () => {
    try {
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        // const image = ???
        const image ="https://devnet.irys.xyz/HN4YbCAqXm3VNXeyA7R9jASsrcFiG22hmj7aprj8K9xE"
        const metadata = {
            name: "Mustashoo",
            symbol: "MUST",
            description: "Mustashoo is a collection of 10,000 unique Mustachoo NFTs.",
            image: image,
            attributes: [
                {trait_type: 'Mustache', value: 'Mustache'},
                 { "trait_type": "Collection", "value": "The Mustashoos" },
                 { "trait_type": "Max Supply", "value": "1000" },
                 { "trait_type": "Edition", "value": "1" }
            ],
            external_url: "https://devnet.irys.xyz/HN4YbCAqXm3VNXeyA7R9jASsrcFiG22hmj7aprj8K9xE",
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: image
                    },
                ]
            },
        };
        const myUri = await umi.uploader.upload([metadata]);
        console.log("Your metadata URI: ", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
