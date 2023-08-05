import { AnchorProvider } from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";
export declare class WrappedConnection extends Connection {
    axiosInstance: any;
    provider: AnchorProvider;
    payer: Keypair;
    constructor(payer: Keypair, connectionString: string, rpcUrl?: string);
    getAsset(assetId: any): Promise<any>;
    getAssetProof(assetId: any): Promise<any>;
    getAssetsByOwner(assetId: string, sortBy: any, limit: number, page: number, before: string, after: string): Promise<any>;
}
