"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAIProvider = createAIProvider;
const claude_1 = require("./claude");
const openai_1 = require("./openai");
const groq_1 = require("./groq");
__exportStar(require("./types"), exports);
__exportStar(require("./claude"), exports);
__exportStar(require("./openai"), exports);
__exportStar(require("./groq"), exports);
function createAIProvider(config) {
    switch (config.provider) {
        case 'openai':
            return new openai_1.OpenAIProvider(config.apiKey);
        case 'groq':
            return new groq_1.GroqProvider(config.apiKey);
        case 'claude':
        default:
            return new claude_1.ClaudeProvider(config.apiKey);
    }
}
//# sourceMappingURL=index.js.map