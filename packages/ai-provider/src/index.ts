import { AIProviderConfig, IAIProvider } from './types';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';

export * from './types';
export * from './claude';
export * from './openai';

export function createAIProvider(config: AIProviderConfig): IAIProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey);
    case 'claude':
    default:
      return new ClaudeProvider(config.apiKey);
  }
}
