/**
 * AI Integration Layer
 * Central AI service orchestration with cost optimization
 * Optimized exports to prevent redundancy and improve tree-shaking
 */

// Primary service exports
export {
  AICostOptimizer,
  aiCostOptimizer,
  type ModelConfig,
  type RequestContext,
  type CostMetrics,
  type OptimizationResult,
} from './costOptimizer';

export {
  ModelRouter,
  type ModelProvider,
  type ModelResponse,
  type RoutingResult,
} from './modelRouter';

export {
  IntelligentAIService,
  intelligentAI,
  generateContent,
  analyzeContent,
  summarizeContent,
  type AIRequest,
  type AIResponse,
  type AIMetrics,
} from './intelligentService';

// Default service instances for convenience
export { aiCostOptimizer as defaultCostOptimizer, intelligentAI as defaultAIService };