// LOG: AGENTS-CREATIVE-1 - Creative Agent

export class CreativeAgent {
  async run(input: any, controlLevel: number) {
    console.log('LOG: AGENTS-CREATIVE-RUN-1 - Creative Agent running');
    return {
      success: true,
      output: {
        content: 'Mock generated content',
      },
      next_agent: 'seo',
    };
  }
}