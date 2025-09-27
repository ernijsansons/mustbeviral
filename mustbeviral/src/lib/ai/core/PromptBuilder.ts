// Intelligent Prompt Construction
import { ContentGenerationRequest } from '../contentGenerator';

export class PromptBuilder {
  private basePrompts = {
    article: 'Write a comprehensive article about',
    social_post: 'Create an engaging social media post about',
    headline: 'Generate a compelling headline for',
    description: 'Write a clear and engaging description for',
    script: 'Create a video script about',
    email: 'Write an email newsletter about'
  };

  private toneInstructions = {
    professional: 'Use a professional, authoritative tone',
    casual: 'Use a casual, conversational tone',
    humorous: 'Use humor and wit appropriately',
    urgent: 'Create a sense of urgency',
    inspiring: 'Use inspiring and motivational language',
    educational: 'Use clear, educational language'
  };

  private audienceInstructions = {
    general: 'for a general audience',
    professionals: 'for industry professionals',
    students: 'for students and learners',
    seniors: 'for senior adults',
    teenagers: 'for teenagers and young adults'
  };

  private lengthInstructions = {
    short: 'Keep it concise and to the point (under 200 words)',
    medium: 'Provide moderate detail (200-500 words)',
    long: 'Be comprehensive and detailed (500+ words)'
  };

  build(request: ContentGenerationRequest): string {
    let prompt = `${this.basePrompts[request.type]} "${request.topic}".

${this.toneInstructions[request.tone]} ${this.audienceInstructions[request.audience]}.
${this.lengthInstructions[request.length]}.`;

    if (request.keywords?.length) {
      prompt += `\n\nInclude these keywords naturally: ${request.keywords.join(', ')}.`;
    }

    if (request.platform) {
      prompt += `\n\nOptimize for ${request.platform}.`;
    }

    if (request.context) {
      prompt += `\n\nAdditional context: ${request.context}`;
    }

    if (request.style) {
      prompt += `\n\nStyle guidelines: ${request.style}`;
    }

    return prompt + '\n\nContent:';
  }
}