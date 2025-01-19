import { IAgentRuntime } from "@elizaos/core";
export declare class StreamManager {
    private runtime;
    private streamConnection;
    private isStreaming;
    constructor(runtime: IAgentRuntime);
    initialize(): Promise<void>;
    private setupTwitterClient;
    private connectToStream;
    cleanup(): Promise<void>;
    private disconnectStream;
}
