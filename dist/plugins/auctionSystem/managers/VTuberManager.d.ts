import { IAgentRuntime } from "@elizaos/core";
export declare class VTuberManager {
    private runtime;
    private currentExpression;
    constructor(runtime: IAgentRuntime);
    initialize(): Promise<void>;
    private loadAssets;
    setExpression(expression: string): Promise<void>;
    cleanup(): Promise<void>;
}
