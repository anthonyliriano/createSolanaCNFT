var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { TokenProgramVersion, TokenStandard, createMintToCollectionV1Instruction, PROGRAM_ID as BUBBLEGUM_PROGRAM_ID, createCreateTreeInstruction, } from "@metaplex-foundation/mpl-bubblegum";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID, createCreateMasterEditionV3Instruction, createCreateMetadataAccountV3Instruction, createSetCollectionSizeInstruction } from "@metaplex-foundation/mpl-token-metadata";
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, getConcurrentMerkleTreeAccountSize } from "@solana/spl-account-compression";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createMint, mintTo } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { WrappedConnection } from "./ConnectionWrapper";
function createCompressedNFT(name, symbol, creators) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            name: "Builder Ape #1234",
            symbol: "BAPE",
            uri: "https://qhz36tsgfw2qs3hpjjjzugw5ga6p3jptcrox6ilgi2ucek6qrrvq.arweave.net/gfO_TkYttQls70pTmhrdMDz9pfMUXX8hZkaoIivQjGs",
            creators: [],
            editionNonce: 253,
            tokenProgramVersion: TokenProgramVersion.Original,
            tokenStandard: TokenStandard.NonFungible,
            uses: null,
            collection: null,
            primarySaleHappened: false,
            sellerFeeBasisPoints: 0,
            isMutable: false
        };
    });
}
function setupTreeWithCompressedNFT(connectionWrapper, payerKeypair, compressedNFT, maxDepth = 14, maxBufferSize = 64) {
    return __awaiter(this, void 0, void 0, function* () {
        const payer = payerKeypair.publicKey;
        const merkleTreeKeypair = Keypair.generate();
        const merkleTree = merkleTreeKeypair.publicKey;
        const space = getConcurrentMerkleTreeAccountSize(maxDepth, maxBufferSize, 5);
        const collectionMint = yield createMint(connectionWrapper, payerKeypair, payer, payer, 0, null, null, TOKEN_PROGRAM_ID);
        // createAssociatedTokenAccount(connectionWrapper, payerKeypair, collectionMint, payer, null, null, null);
        const collectionTokenAccount = yield createAssociatedTokenAccount(connectionWrapper, payerKeypair, collectionMint, payer, null, null, null); //collectionMint.createAccount(payer)
        yield mintTo(connectionWrapper, payerKeypair, collectionMint, payer, payer, 1);
        // await collectionMint.MintTo(collectionTokenAccount, payerKeypair, [], 1);
        const [collectionMetadataAccount, _b] = PublicKey.findProgramAddressSync([
            Buffer.from("metadata", "utf8"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            collectionMint.toBuffer()
        ], TOKEN_METADATA_PROGRAM_ID);
        const collectionMetadataIX = createCreateMetadataAccountV3Instruction({
            metadata: collectionMetadataAccount,
            mint: collectionMint,
            mintAuthority: payer,
            payer,
            updateAuthority: payer
        }, {
            createMetadataAccountArgsV3: {
                data: {
                    name: "erm",
                    symbol: "erm",
                    uri: "erm",
                    sellerFeeBasisPoints: 100,
                    creators: null,
                    collection: null,
                    uses: null
                },
                isMutable: false,
                collectionDetails: null
            }
        });
        const [collectionMasterEditionAccount, _b2] = yield PublicKey.findProgramAddress([
            Buffer.from("metadata", "utf8"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            collectionMint.toBuffer(),
            Buffer.from("edition", "utf8")
        ], TOKEN_METADATA_PROGRAM_ID);
        const collectionMasterEditionIX = createCreateMasterEditionV3Instruction({
            edition: collectionMasterEditionAccount,
            mint: collectionMint,
            updateAuthority: payer,
            mintAuthority: payer,
            payer: payer,
            metadata: collectionMetadataAccount
        }, {
            createMasterEditionArgs: {
                maxSupply: 0
            }
        });
        const sizeCollectionIX = createSetCollectionSizeInstruction({
            collectionMetadata: collectionMetadataAccount,
            collectionAuthority: payer,
            collectionMint: collectionMint
        }, {
            setCollectionSizeArgs: { size: 0 }
        });
        let tx_collection = new Transaction()
            .add(collectionMetadataIX)
            .add(collectionMasterEditionIX)
            .add(sizeCollectionIX);
        tx_collection.feePayer = payer;
        yield sendAndConfirmTransaction(connectionWrapper, tx_collection, [payerKeypair], {
            commitment: "confirmed",
            skipPreflight: true
        });
        const allocTreeIx = SystemProgram.createAccount({
            fromPubkey: payer,
            newAccountPubkey: merkleTree,
            lamports: yield connectionWrapper.getMinimumBalanceForRentExemption(space),
            space: space,
            programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID
        });
        const [treeAuthority, _bump] = yield PublicKey.findProgramAddress([merkleTree.toBuffer()], BUBBLEGUM_PROGRAM_ID);
        const createTreeIx = createCreateTreeInstruction({
            merkleTree,
            treeAuthority,
            treeCreator: payer,
            payer,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID
        }, {
            maxBufferSize,
            maxDepth,
            public: false
        }, BUBBLEGUM_PROGRAM_ID);
        const [bgumSigner, __] = yield PublicKey.findProgramAddress([Buffer.from("collection_cpi", "utf8")], BUBBLEGUM_PROGRAM_ID);
        const mintIx = createMintToCollectionV1Instruction({
            merkleTree,
            treeAuthority,
            treeDelegate: payer,
            payer,
            leafDelegate: payer,
            leafOwner: payer,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            collectionAuthority: payer,
            collectionAuthorityRecordPda: BUBBLEGUM_PROGRAM_ID,
            collectionMint: collectionMint,
            collectionMetadata: collectionMetadataAccount,
            editionAccount: collectionMasterEditionAccount,
            bubblegumSigner: bgumSigner,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID
        }, {
            metadataArgs: Object.assign(compressedNFT, {
                collection: { key: collectionMint, verified: false }
            })
        });
        let tx = new Transaction().add(allocTreeIx).add(createTreeIx);
        tx.feePayer = payer;
        yield sendAndConfirmTransaction(connectionWrapper, tx, [merkleTreeKeypair, payerKeypair], {
            commitment: "confirmed",
            skipPreflight: true
        });
        return {
            merkleTree
        };
    });
}
;
function main() {
    const rpcUrl = "https://rpc-devnet.aws.metaplex.com/";
    const connectionString = "https://liquid.devnet.rpcpool.com/5ebea512d12be102f53d319dafc8";
    const connectionWrapper = new WrappedConnection(Keypair.fromSeed(new TextEncoder().encode("hello world".padEnd(32, "\0"))), connectionString, rpcUrl);
    console.log("payer", connectionWrapper.provider.wallet.publicKey.toBase58());
    let originalCompressedNFT = createCompressedNFT("test", "test", []);
    console.log(originalCompressedNFT);
}
main();
//# sourceMappingURL=index.js.map