import { IAgentRuntime } from "@elizaos/core";
export declare class AuctionManager {
    private runtime;
    constructor(runtime: IAgentRuntime);
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
}
