import { AnchorProvider } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { Connection, Keypair } from "@solana/web3.js";
import axios from "axios";

export class WrappedConnection extends Connection {
    axiosInstance: any;
    provider: AnchorProvider;
    payer: Keypair;

    constructor(payer: Keypair, connectionString: string, rpcUrl?: string){
        super(connectionString, "confirmed");
        this.axiosInstance = axios.create({
            baseURL: rpcUrl ?? connectionString
        });
        this.provider = new AnchorProvider(
            new Connection(connectionString),
            new NodeWallet(payer),
            {
                commitment: super.commitment,
                skipPreflight: true
            }
        );
        this.payer = payer;
    }    
}