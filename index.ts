import { Creator, MetadataArgs, TokenProgramVersion, TokenStandard, 
     PROGRAM_ID as BUBBLEGUM_PROGRAM_ID, createMintToCollectionV1Instruction,  createCreateTreeInstruction, 
    } from "@metaplex-foundation/mpl-bubblegum";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID, createCreateMasterEditionV3Instruction, createCreateMetadataAccountV3Instruction, createSetCollectionSizeInstruction } from "@metaplex-foundation/mpl-token-metadata";
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, getConcurrentMerkleTreeAccountSize } from "@solana/spl-account-compression";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createMint, mintTo } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction 
} from "@solana/web3.js";
import { WrappedConnection } from "./ConnectionWrapper";


//define the specific metadata for the single NFT
function defineNFTMetadata(name : string, symbol : string, uri : string, creators: Creator[]) : MetadataArgs 
{
    return {
        name: name,
        symbol: symbol,
        uri: uri,
        creators: creators,
        editionNonce: 253,
        tokenProgramVersion: TokenProgramVersion.Original,
        tokenStandard: TokenStandard.NonFungible,
        uses: null,
        collection: null,
        primarySaleHappened: false,
        sellerFeeBasisPoints: 0,
        isMutable: false
    };
}

async function setupTreeWithCompressedNFT(
    connectionWrapper: WrappedConnection,
    payerKeypair: Keypair,
    nftMetadata: MetadataArgs,
    maxDepth : number = 14,
    maxBufferSize: number = 64 ) 
{
    const payer = payerKeypair.publicKey;
    const merkleTreeKeypair = Keypair.generate();
    const merkleTree = merkleTreeKeypair.publicKey;
    const space = getConcurrentMerkleTreeAccountSize(maxDepth, maxBufferSize, 5);

    const collectionMint = await createMint(
        connectionWrapper,
        payerKeypair,
        payer,
        payer,
        0,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
    );
    
    console.log("collectionMint: " + collectionMint);

    const mintTokenAccount = await createAssociatedTokenAccount(connectionWrapper, payerKeypair, collectionMint, collectionMint, undefined, undefined, undefined);//collectionMint.createAccount(payer)
    // console.log('Associated Token Account: ' + mintTokenAccount);
    //Send the token to an associated token account, not to a wallet address: https://solana.stackexchange.com/questions/3386/invalid-account-data-for-instruction-when-trying-to-transfer-usdc-tokens
    let transactionSignature = await mintTo(connectionWrapper, payerKeypair, collectionMint, mintTokenAccount, payer, 1, []);   
    console.log('Transaction Signature: ' + transactionSignature);
    // await collectionMint.MintTo(collectionTokenAccount, payerKeypair, [], 1);
    const [collectionMetadataAccount, _b] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata", "utf8"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            collectionMint.toBuffer()
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    console.log('Metatadata Program Address PubKey: ' + collectionMetadataAccount);

    const collectionMetadataIX = createCreateMetadataAccountV3Instruction(
        {
            metadata: collectionMetadataAccount,
            mint: collectionMint,
            mintAuthority: payer,
            payer,
            updateAuthority: payer
        },
        {
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
        }
    );
    
    const [collectionMasterEditionAccount, _b2] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata", "utf8"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            collectionMint.toBuffer(),
            Buffer.from("edition", "utf8")
        ],
        TOKEN_METADATA_PROGRAM_ID
    );

    console.log("Collection Master Edition PubKey: " + collectionMasterEditionAccount);
    const collectionMasterEditionIX = createCreateMasterEditionV3Instruction(
        {
            edition: collectionMasterEditionAccount,
            mint: collectionMint,
            updateAuthority: payer,
            mintAuthority: payer,
            payer: payer,
            metadata: collectionMetadataAccount
        },
        {
            createMasterEditionArgs: {
                maxSupply: 0
            }
        }
    );

    const sizeCollectionIX = createSetCollectionSizeInstruction(
        {
            collectionMetadata: collectionMetadataAccount,
            collectionAuthority: payer,
            collectionMint: collectionMint
        },
        {
            setCollectionSizeArgs: { size: 0}
        }
    );

    let tx_collection = new Transaction()
        .add(collectionMetadataIX)
        .add(collectionMasterEditionIX)
        .add(sizeCollectionIX);

    tx_collection.feePayer = payer;
    let tranResult = await sendAndConfirmTransaction(
        connectionWrapper,
        tx_collection,
        [payerKeypair],
        {
            commitment: "confirmed",
            skipPreflight: true
        }
    );

    console.log("Transaction Result (Collection - Metadata, Master Edition, Size): " + tranResult);

    const allocTreeIx = SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: merkleTree,
        lamports: await connectionWrapper.getMinimumBalanceForRentExemption(space),
        space: space,
        programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID
    });
    const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
        [merkleTree.toBuffer()],
        BUBBLEGUM_PROGRAM_ID
    );
    const createTreeIx = createCreateTreeInstruction(
        {
            merkleTree,
            treeAuthority,
            treeCreator: payer,
            payer,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID
        },
        {
            maxBufferSize,
            maxDepth,
            public: false
        },
        BUBBLEGUM_PROGRAM_ID
    );
    const [bgumSigner, __] = PublicKey.findProgramAddressSync(
        [Buffer.from("collection_cpi", "utf8")],
        BUBBLEGUM_PROGRAM_ID
    );
    const mintIx = createMintToCollectionV1Instruction(
        {
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
        },
        {
            metadataArgs: Object.assign(nftMetadata, {
                collection: {key: collectionMint, verified: false}
            })
        }
    );
    let tx = new Transaction().add(allocTreeIx).add(createTreeIx);
    tx.feePayer = payer;
    tranResult = await sendAndConfirmTransaction(
        connectionWrapper,
        tx,
        [merkleTreeKeypair, payerKeypair],
        {
            commitment: "confirmed",
            skipPreflight: true
        });

    console.log("Transaction Result (Merkle Tree - Allocate & Create): " + tranResult);

    tx = new Transaction().add(mintIx);
    tx.feePayer = payer;
    await sendAndConfirmTransaction(connectionWrapper, tx, [payerKeypair], {
        commitment: "confirmed",
        skipPreflight: true
    });

    return {
        merkleTree
    }
};

async function main() {
    const rpcUrl = "https://rpc-devnet.aws.metaplex.com/";
    const connectionString = "https://liquid.devnet.rpcpool.com/5ebea512d12be102f53d319dafc8";
    const payer = Keypair.fromSeed(new TextEncoder().encode("goodbye world".padEnd(32, "\0")))

    const connectionWrapper = new WrappedConnection(payer, connectionString, rpcUrl);

    console.log("payer", connectionWrapper.provider.wallet.publicKey.toBase58());

    //Creates Metadata
    let originalCompressedNFT = defineNFTMetadata("Builder Ape #1234", "BAPE", 
        "https://qhz36tsgfw2qs3hpjjjzugw5ga6p3jptcrox6ilgi2ucek6qrrvq.arweave.net/gfO_TkYttQls70pTmhrdMDz9pfMUXX8hZkaoIivQjGs", []);

    let result = await setupTreeWithCompressedNFT(connectionWrapper, 
        connectionWrapper.payer, originalCompressedNFT, 14, 64)

    console.log(result)
}

main();
