import { Plugin, IAgentRuntime } from "@elizaos/core";
import { StreamManager } from "./managers/StreamManager";
import { AuctionManager } from "./managers/AuctionManager";
import { VTuberManager } from "./managers/VTuberManager";
interface AuctionPlugin extends Plugin {
    streamManager: StreamManager | null;
    auctionManager: AuctionManager | null;
    vtuberManager: VTuberManager | null;
    initialize(runtime: IAgentRuntime): Promise<void>;
    cleanup(): Promise<void>;
}
export declare const auctionPlugin: AuctionPlugin;
export {};
