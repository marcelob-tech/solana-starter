import wallet from "../turbin3-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createMetadataAccountV3,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs,
  DataV2Args,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
import { createSignerFromKeypair, signerIdentity, publicKey } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

// Define our Mint address
// const mint = publicKey("2Wsezgj1vJihCzAq2k8pGBeHcrMVwKkRa9FSnzNFBkLv")
const mint = publicKey("GKx8cKAqVA57oMd87YUtUQtLefDxHfVW2g23jR9cDGbS");

// Create a UMI connection
const umi = createUmi("https://api.devnet.solana.com");
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

(async () => {
  try {
    // Start here
    const metadata = await findMetadataPda(umi, { mint });

    //CreateMetadataAccountV3InstructionAccounts
    let accounts: CreateMetadataAccountV3InstructionAccounts = {
      mint,
      metadata: metadata[0], // PDA (primeiro item retornado por findMetadataPda)
      mintAuthority: signer,
      payer: signer,
      updateAuthority: signer,
    };

    const metadataData = {
      name: "Blues On Turbin3",
      symbol: "BOT3",
      description: "Simple Blues' token",
      image: "https://bafybeic75qqhfytc6xxoze2lo5af2lfhmo2kh4mhirelni2wota633dgqu.ipfs.nftstorage.link/",
    };

    // let data: DataV2Args
    let data: DataV2Args = {
      name: metadataData.name,
      symbol: metadataData.symbol,
      uri: metadataData.image,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    };

    // let args: CreateMetadataAccountV3InstructionArgs
    let args: CreateMetadataAccountV3InstructionArgs = {
      collectionDetails: null,
      data,
      isMutable: true,
    };

    // let tx = createMetadataAccountV3
    let tx = createMetadataAccountV3(umi, {
      ...accounts,
      ...args,
    });


    console.log(tx)
    let result = await tx.sendAndConfirm(umi);
    console.log(bs58.encode(result.signature));
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
