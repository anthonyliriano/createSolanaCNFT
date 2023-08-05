var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { AnchorProvider } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { Connection } from "@solana/web3.js";
import axios from "axios";
export class WrappedConnection extends Connection {
    constructor(payer, connectionString, rpcUrl) {
        super(connectionString, "confirmed");
        this.axiosInstance = axios.create({
            baseURL: rpcUrl !== null && rpcUrl !== void 0 ? rpcUrl : connectionString
        });
        this.provider = new AnchorProvider(new Connection(connectionString), new NodeWallet(payer), {
            commitment: super.commitment,
            skipPreflight: true
        });
        this.payer = payer;
    }
    getAsset(assetId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.axiosInstance.post("get_asset", {
                    jsonrpc: "2.0",
                    method: "getAsset",
                    id: "rpd-op-123",
                    params: {
                        id: assetId
                    }
                });
                return response.data.result;
            }
            catch (error) {
                console.error(error);
            }
        });
    }
    getAssetProof(assetId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.axiosInstance.post("get_asset_proof", {
                    jsonrpc: "2.0",
                    method: "getAssetProof",
                    id: "rpd-op-123",
                    params: {
                        id: assetId
                    }
                });
                return response.data.result;
            }
            catch (error) {
                console.error(error);
            }
        });
    }
    getAssetsByOwner(assetId, sortBy, limit, page, before, after) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.axiosInstance.post("get_assets_by_owner", {
                    jsonrpc: "2.0",
                    method: "get_assets_by_owner",
                    id: "rpd-op-123",
                    params: [assetId, sortBy, limit, page, before, after]
                });
                return response.data.result;
            }
            catch (error) {
                console.error(error);
            }
        });
    }
}
//# sourceMappingURL=ConnectionWrapper.js.map