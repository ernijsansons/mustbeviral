// AI Tool Selector with tier selection and quality/cost sliders
// LOG: COMPONENT-TOOL-SELECTOR-1 - Initialize AI tool selector

'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Cpu, Image, Video, Sliders, DollarSign, Clock, CheckCircle } from 'lucide-react';

interface AITier {
  id: string;
  name: string;
  description: string;
  price_per_month: number;
  daily_limits: {
    text_tokens: number;
    image_generations: number;
    video_seconds: number;
  };
  available_models: string[];
  quality_level: number;
  priority: string;
}

interface AIModel {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video';
  provider: string;
  cost_multiplier: number;
}

interface UsageInfo {
  current_tier: AITier;
  daily_usage: {
    text_tokens: number;
    image_generations: number;
    video_seconds: number;
  };
  usage_percentages: {
    text: number;
    image: number;
    video: number;
  };
}

export function ToolSelector({ userId = 'demo-user' }: { userId?: string }) {
  const [tiers, setTiers] = useState<AITier[]>([]);
  const [selectedTier, setSelectedTier] = useState<AITier | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [qualitySlider, setQualitySlider] = useState(5);
  const [costSlider, setCostSlider] = useState(5);

  console.log('LOG: COMPONENT-TOOL-SELECTOR-2 - ToolSelector rendered');

  useEffect(() => {
    loadTiers();
    loadUsageInfo();
  }, [userId]);

  useEffect(() => {
    if (selectedTier) {
      loadModelsForTier(selectedTier.id);
    }
  }, [selectedTier]);

  const loadTiers = async () => {
    console.log('LOG: COMPONENT-TOOL-SELECTOR-3 - Loading available tiers');
    
    try {
      const response = await fetch('/api/select-tool?action=get_tiers');
      const result = await response.json();
      
      if (result.success) {
        setTiers(result.data.tiers);
        console.log('LOG: COMPONENT-TOOL-SELECTOR-4 - Loaded', result.data.tiers.length, 'tiers');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-TOOL-SELECTOR-ERROR-1 - Failed to load tiers:', error);
    }
  };

  const loadUsageInfo = async () => {
    console.log('LOG: COMPONENT-TOOL-SELECTOR-5 - Loading user usage info');
    
    try {
      const response = await fetch(`/api/select-tool?action=get_usage&user_id=${userId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setUsageInfo(result.data);
        setSelectedTier(result.data.current_tier);
        console.log('LOG: COMPONENT-TOOL-SELECTOR-6 - Usage info loaded');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-TOOL-SELECTOR-ERROR-2 - Failed to load usage info:', error);
    }
  };

  const loadModelsForTier = async (tierId: string) => {
    console.log('LOG: COMPONENT-TOOL-SELECTOR-7 - Loading models for tier:', tierId);
    
    try {
      const response = await fetch('/api/select-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_models',
          user_id: userId,
          tier_id: tierId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAvailableModels(result.data.available_models);
        if (result.data.available_models.length > 0) {
          setSelectedModel(result.data.available_models[0]);
        }
        console.log('LOG: COMPONENT-TOOL-SELECTOR-8 - Loaded', result.data.available_models.length, 'models');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-TOOL-SELECTOR-ERROR-3 - Failed to load models:', error);
    }
  };

  const selectTier = async (tier: AITier) => {
    console.log('LOG: COMPONENT-TOOL-SELECTOR-9 - Selecting tier:', tier.id);
    setLoading(true);
    
    try {
      const response = await fetch('/api/select-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select_tier',
          user_id: userId,
          tier_id: tier.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSelectedTier(tier);
        await loadUsageInfo();
        console.log('LOG: COMPONENT-TOOL-SELECTOR-10 - Tier selected successfully');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-TOOL-SELECTOR-ERROR-4 - Failed to select tier:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModelIcon = (type: string) => {
    switch (type) {
      case 'text': return <Cpu className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Sliders className="w-6 h-6 mr-2 text-indigo-600" />
          AI Tool Selector
        </h2>
        
        {selectedTier && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Current:</span>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              {selectedTier.name}
            </span>
          </div>
        )}
      </div>

      {/* Tier Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Your Plan</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                selectedTier?.id === tier.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
              onClick={() => selectTier(tier)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                {selectedTier?.id === tier.id && (
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-gray-900">
                  ${tier.price_per_month}
                </span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-600">
                <div>Text: {formatNumber(tier.daily_limits.text_tokens)} tokens/day</div>
                <div>Images: {tier.daily_limits.image_generations}/day</div>
                <div>Video: {tier.daily_limits.video_seconds}s/day</div>
              </div>
              
              <div className="mt-3 flex items-center">
                <span className="text-xs text-gray-500 mr-2">Quality:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{ width: `${tier.quality_level * 10}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">{tier.quality_level}/10</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality/Cost Sliders */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Settings</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality Level: {qualitySlider}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={qualitySlider}
              onChange={(e) => setQualitySlider(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Basic</span>
              <span>Premium</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Preference: {costSlider}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={costSlider}
              onChange={(e) => setCostSlider(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Economy</span>
              <span>Performance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Models */}
      {availableModels.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Models</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {availableModels.map((model) => (
              <div
                key={model.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedModel?.id === model.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
                onClick={() => setSelectedModel(model)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getModelIcon(model.type)}
                    <h4 className="font-medium text-gray-900">{model.name}</h4>
                  </div>
                  {selectedModel?.id === model.id && (
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{model.type}</span>
                  <div className="flex items-center text-gray-500">
                    <DollarSign className="w-3 h-3 mr-1" />
                    <span>{model.cost_multiplier}x</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Information */}
      {usageInfo && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Daily Usage
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Text Tokens</span>
                <span>{formatNumber(usageInfo.daily_usage.text_tokens)} / {formatNumber(usageInfo.current_tier.daily_limits.text_tokens)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(usageInfo.usage_percentages.text)}`}
                  style={{ width: `${Math.min(100, usageInfo.usage_percentages.text)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Image Generations</span>
                <span>{usageInfo.daily_usage.image_generations} / {usageInfo.current_tier.daily_limits.image_generations}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(usageInfo.usage_percentages.image)}`}
                  style={{ width: `${Math.min(100, usageInfo.usage_percentages.image)}%` }}
                ></div>
              </div>
            </div>
            
            {usageInfo.current_tier.daily_limits.video_seconds > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Video Seconds</span>
                  <span>{usageInfo.daily_usage.video_seconds} / {usageInfo.current_tier.daily_limits.video_seconds}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(usageInfo.usage_percentages.video)}`}
                    style={{ width: `${Math.min(100, usageInfo.usage_percentages.video)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Updating...</span>
        </div>
      )}
    </div>
  );
}