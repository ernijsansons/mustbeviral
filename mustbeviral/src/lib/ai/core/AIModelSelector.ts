// AI Model Selection Logic
export interface AIModel {
  name: string;
  description: string;
  maxTokens: number;
  costPerToken: number;
  capabilities: string[];
}

export type ContentType = 'article' | 'social_post' | 'headline' | 'description' | 'script' | 'email';
export type ContentLength = 'short' | 'medium' | 'long';

export class AIModelSelector {
  private modelMap: Record<ContentType, string> = {
    article: '@cf/meta/llama-2-7b-chat-int8',
    social_post: '@cf/mistral/mistral-7b-instruct-v0.1',
    headline: '@cf/microsoft/phi-2',
    description: '@cf/meta/llama-2-7b-chat-int8',
    script: '@cf/meta/llama-2-7b-chat-int8',
    email: '@cf/mistral/mistral-7b-instruct-v0.1'
  };

  private tokenLimits: Record<ContentLength, number> = {
    short: 200,
    medium: 500,
    long: 1000
  };

  selectModel(contentType: ContentType): string {
    return this.modelMap[contentType] ?? '@cf/meta/llama-2-7b-chat-int8';
  }

  getMaxTokens(length: ContentLength): number {
    return this.tokenLimits[length] ?? 500;
  }

  getAvailableModels(): AIModel[] {
    return [
      {
        name: '@cf/meta/llama-2-7b-chat-int8',
        description: 'General purpose language model',
        maxTokens: 4096,
        costPerToken: 0.0001,
        capabilities: ['text-generation', 'conversation']
      },
      {
        name: '@cf/mistral/mistral-7b-instruct-v0.1',
        description: 'Instruction-tuned model',
        maxTokens: 4096,
        costPerToken: 0.0001,
        capabilities: ['instruction-following', 'text-generation']
      }
    ];
  }
}