/**
 * BuilderTest - Test Component for Builder.io Integration
 * 
 * This component helps verify that Builder.io is properly connected
 * and all custom components are working correctly.
 */

import React, { useEffect, useState } from 'react';
import { ViralHero } from './ViralHero';
import { FeatureGrid } from './FeatureGrid';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export function BuilderTest() {
  const [builderStatus, setBuilderStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    // Check if Builder.io is available
    const checkBuilder = () => {
      if (typeof window !== 'undefined' && (window as any).Builder) {
        setBuilderStatus('connected');
        console.log('✅ Builder.io SDK loaded successfully');
      } else {
        setBuilderStatus('disconnected');
        console.log('❌ Builder.io SDK not found');
      }
    };

    // Check API key
    const checkApiKey = () => {
      const key = import.meta.env.VITE_BUILDER_API_KEY;
      if (key && key !== 'your-builder-api-key-here') {
        setApiKey(key.substring(0, 8) + '...');
        console.log('✅ Builder.io API key found');
      } else {
        console.log('❌ Builder.io API key not configured');
      }
    };

    checkBuilder();
    checkApiKey();

    // Re-check after a delay
    const timer = setTimeout(() => {
      checkBuilder();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const testFeatures = [
    {
      id: '1',
      icon: '🚀',
      title: 'AI-Powered Predictions',
      description: 'Predict virality before you post with 87% accuracy',
      variant: 'cosmic' as const,
    },
    {
      id: '2',
      icon: '⚡',
      title: 'Multi-Platform Optimization',
      description: 'Automatically generate platform-specific variations',
      variant: 'plasma' as const,
    },
    {
      id: '3',
      icon: '📊',
      title: 'Real-Time Analytics',
      description: 'Track performance with advanced metrics and insights',
      variant: 'aurora' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Status Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Builder.io Integration Test</h1>
            <p className="text-slate-600">Testing Builder.io connection and custom components</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              builderStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : builderStatus === 'disconnected'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {builderStatus === 'connected' && '✅ Connected'}
              {builderStatus === 'disconnected' && '❌ Disconnected'}
              {builderStatus === 'checking' && '⏳ Checking...'}
            </div>
            {apiKey && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                🔑 API Key: {apiKey}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Components */}
      <div className="space-y-16">
        {/* ViralHero Test */}
        <section>
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">ViralHero Component Test</h2>
            <ViralHero
              title="🚀 Builder.io Integration"
              subtitle="Testing viral hero component"
              description="This hero section demonstrates the ViralHero component with cosmic styling and animations."
              ctaText="Test CTA"
              ctaVariant="viral"
              backgroundVariant="cosmic"
              animation="float"
            />
          </div>
        </section>

        {/* FeatureGrid Test */}
        <section>
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">FeatureGrid Component Test</h2>
            <FeatureGrid
              title="Amazing Features"
              subtitle="Testing feature grid component with cosmic styling"
              features={testFeatures}
              columns={3}
              animation="float"
              variant="cosmic"
            />
          </div>
        </section>

        {/* Builder.io Status */}
        <section>
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Builder.io Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card variant="default">
                <CardHeader>
                  <CardTitle>Connection Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        builderStatus === 'connected' ? 'bg-green-500' : 
                        builderStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <span className="font-medium">
                        {builderStatus === 'connected' && 'Builder.io SDK Connected'}
                        {builderStatus === 'disconnected' && 'Builder.io SDK Not Found'}
                        {builderStatus === 'checking' && 'Checking Connection...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        apiKey ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">
                        {apiKey ? 'API Key Configured' : 'API Key Missing'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="default">
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {builderStatus === 'connected' && apiKey ? (
                      <>
                        <p className="text-green-600">✅ Everything is working perfectly!</p>
                        <p className="text-sm text-slate-600">
                          You can now use Builder.io to create content with your custom components.
                        </p>
                        <Button variant="viral" className="mt-4">
                          Open Builder.io
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-yellow-600">⚠️ Setup incomplete</p>
                        <p className="text-sm text-slate-600">
                          Please check your Builder.io API key and ensure the SDK is loaded.
                        </p>
                        <Button variant="outline" className="mt-4">
                          Check Setup
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}




