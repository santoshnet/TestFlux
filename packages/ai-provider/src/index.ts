import { AIProviderConfig, IAIProvider } from './types';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';
import { GroqProvider } from './groq';

export * from './types';
export * from './claude';
export * from './openai';
export * from './groq';

export function createAIProvider(config: AIProviderConfig): IAIProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey);
    case 'groq':
      return new GroqProvider(config.apiKey);
    case 'claude':
    default:
      return new ClaudeProvider(config.apiKey);
  }
}
