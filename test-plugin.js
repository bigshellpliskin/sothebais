// test-plugin.js
import { Plugin } from "@elizaos/core";

const testPlugin = {
    name: "test-plugin",
    description: "Test plugin to verify ElizaOS setup",
    
    actions: [{
        name: "TEST_ACTION",
        similes: ["VERIFY", "CHECK"],
        description: "Test action to verify plugin loading",
        validate: async (runtime, message) => true,
        handler: async (runtime, message) => {
            console.log("Test plugin working!");
            return true;
        },
        examples: []
    }],
    
    evaluators: [],
    providers: []
};

export default testPlugin;