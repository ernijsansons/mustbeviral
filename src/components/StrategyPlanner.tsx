// Strategy Planner Component for tailored strategy generation
// LOG: COMPONENT-STRATEGY-1 - Initialize strategy planner

'use client';

import React, { useState, useEffect } from 'react';
import { Target, Lightbulb, TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle, Users } from 'lucide-react';

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  success_metrics: string[];
}

interface StrategyRequest {
  user_id: string;
  brand_name: string;
  industry: string;
  target_audience: string;
  budget_range: 'low' | 'medium' | 'high';
  primary_goal: 'awareness' | 'engagement' | 'conversion' | 'affiliate_revenue';
  timeline: string;
  existing_channels: string[];
}

interface PersonalizedStrategy {
  id: string;
  template_id: string;
  brand_name: string;
  customized_steps: unknown[];
  timeline: string;
  budget_estimate: number;
  success_probability: number;
}

export function StrategyPlanner({ userId = 'demo-user' }: { userId?: string }) {
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [strategyRequest, setStrategyRequest] = useState<Partial<StrategyRequest>>({
    user_id: userId,
    existing_channels: []
  });
  const [generatedStrategy, setGeneratedStrategy] = useState<PersonalizedStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<unknown>(null);

  console.log('LOG: COMPONENT-STRATEGY-2 - StrategyPlanner rendered');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    console.log('LOG: COMPONENT-STRATEGY-3 - Loading strategy templates');
    
    try {
      const response = await fetch('/api/get-strategy?action=get_templates');
      const result = await response.json();
      
      if (result.success) {
        setTemplates(result.data.templates);
        console.log('LOG: COMPONENT-STRATEGY-4 - Loaded', result.data.templates.length, 'templates');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-STRATEGY-ERROR-1 - Failed to load templates:', error);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    console.log('LOG: COMPONENT-STRATEGY-5 - Input changed:', field, value);
    setStrategyRequest(prev => ({ ...prev, [field]: value }));
  };

  const handleChannelToggle = (channel: string) => {
    const currentChannels = strategyRequest.existing_channels || [];
    const updatedChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    
    handleInputChange('existing_channels', updatedChannels);
  };

  const analyzeRequest = async () => {
    console.log('LOG: COMPONENT-STRATEGY-6 - Analyzing strategy request');
    setLoading(true);
    
    try {
      const response = await fetch('/api/get-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_request',
          user_id: userId,
          strategy_request: strategyRequest
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAnalysis(result.data);
        console.log('LOG: COMPONENT-STRATEGY-7 - Request analyzed successfully');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-STRATEGY-ERROR-2 - Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStrategy = async () => {
    console.log('LOG: COMPONENT-STRATEGY-8 - Generating personalized strategy');
    setLoading(true);
    
    try {
      const response = await fetch('/api/get-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_strategy',
          user_id: userId,
          strategy_request: strategyRequest
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGeneratedStrategy(result.data.strategy);
        setCurrentStep(4);
        console.log('LOG: COMPONENT-STRATEGY-9 - Strategy generated successfully');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-STRATEGY-ERROR-3 - Strategy generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 2) {
      analyzeRequest();
    }
    setCurrentStep(prev => Math.min(4, prev + 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const getGoalIcon = (goal: string) => {
    switch (goal) {
      case 'awareness': return <Users className="w-4 h-4" />;
      case 'engagement': return <TrendingUp className="w-4 h-4" />;
      case 'conversion': return <Target className="w-4 h-4" />;
      case 'affiliate_revenue': return <DollarSign className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getBudgetColor = (range: string) => {
    switch (range) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Target className="w-6 h-6 mr-2 text-indigo-600" />
          Strategy Planner
        </h2>
        
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={strategyRequest.brand_name || ''}
                onChange={(e) => handleInputChange('brand_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your brand name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={strategyRequest.industry || ''}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select industry</option>
                <option value="technology">Technology</option>
                <option value="fashion">Fashion</option>
                <option value="health">Health & Wellness</option>
                <option value="food">Food & Beverage</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
            <input
              type="text"
              value={strategyRequest.target_audience || ''}
              onChange={(e) => handleInputChange('target_audience', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Young professionals aged 25-35"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={nextStep}
              disabled={!strategyRequest.brand_name || !strategyRequest.industry}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Goals and Budget */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Goals and Budget</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Primary Goal
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { id: 'awareness', label: 'Brand Awareness', desc: 'Increase visibility and recognition' },
                { id: 'engagement', label: 'Engagement', desc: 'Build community and interaction' },
                { id: 'conversion', label: 'Conversion', desc: 'Drive sales and leads' },
                { id: 'affiliate_revenue', label: 'Affiliate Revenue', desc: 'Generate income through partnerships' }
              ].map((goal) => (
                <div
                  key={goal.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    strategyRequest.primary_goal === goal.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                  onClick={() => handleInputChange('primary_goal', goal.id)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {getGoalIcon(goal.id)}
                    <h4 className="font-medium text-gray-900">{goal.label}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{goal.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Budget Range
            </label>
            <div className="flex space-x-4">
              {[
                { id: 'low', label: 'Low ($1K-$5K)', range: 'low' },
                { id: 'medium', label: 'Medium ($5K-$15K)', range: 'medium' },
                { id: 'high', label: 'High ($15K+)', range: 'high' }
              ].map((budget) => (
                <button
                  key={budget.id}
                  onClick={() => handleInputChange('budget_range', budget.range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    strategyRequest.budget_range === budget.range
                      ? getBudgetColor(budget.range)
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {budget.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={nextStep}
              disabled={!strategyRequest.primary_goal || !strategyRequest.budget_range}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Analyze
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Analysis Results */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Strategy Analysis</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Analyzing your requirements...</span>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium text-green-900">Feasibility</h4>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{analysis.feasibility_score}%</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Timeline</h4>
                  </div>
                  <p className="text-lg font-semibold text-blue-600">{analysis.estimated_timeline}</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium text-purple-900">Budget</h4>
                  </div>
                  <p className="text-lg font-semibold text-purple-600">
                    ${analysis.budget_recommendations?.recommended?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {analysis.risk_factors && analysis.risk_factors.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-900">Risk Factors</h4>
                  </div>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {analysis.risk_factors.map((risk: string, index: number) => (
                      <li key={index}>• {risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
          
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={generateStrategy}
              disabled={loading || !analysis}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Generate Strategy
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Generated Strategy */}
      {currentStep === 4 && generatedStrategy && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Your Personalized Strategy</h3>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-medium text-indigo-900 mb-1">Success Probability</h4>
              <p className="text-2xl font-bold text-indigo-600">{generatedStrategy.success_probability}%</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-1">Timeline</h4>
              <p className="text-lg font-semibold text-green-600">{generatedStrategy.timeline}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-1">Budget Estimate</h4>
              <p className="text-lg font-semibold text-purple-600">
                ${generatedStrategy.budget_estimate.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Strategy Steps</h4>
            <div className="space-y-3">
              {generatedStrategy.customized_steps.map((step, index) => (
                <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">{step.title}</h5>
                      <p className="text-sm text-gray-600 mb-2">{step.personalized_content}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {step.estimated_duration}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Start Over
            </button>
            <button
              onClick={() => console.log('Implement strategy')}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Implement Strategy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}