// Mobile-first onboarding flow with accessibility
// LOG: ONBOARD-FLOW-1 - Initialize onboarding stepper component

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, User, Target, Sparkles, CheckCircle, AlertCircle, Mail } from 'lucide-react';

interface OnboardingData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: 'creator' | 'influencer' | '';
  industry: string;
  primaryGoal: string;
  aiControlLevel: number;
  firstPrompt: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export function OnboardFlow({ onComplete }: { onComplete?: (data: OnboardingData) => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
    industry: '',
    primaryGoal: '',
    aiControlLevel: 50,
    firstPrompt: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  console.log('LOG: ONBOARD-FLOW-2 - Onboarding flow rendered, step:', currentStep);

  const totalSteps = 4;

  const validateStep = (step: number): boolean => {
    console.log('LOG: ONBOARD-FLOW-3 - Validating step:', step);
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1:
        if (!data.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(data.email)) newErrors.email = 'Invalid email format';
        
        if (!data.username) newErrors.username = 'Username is required';
        else if (data.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
        
        if (!data.password) newErrors.password = 'Password is required';
        else if (data.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        
        if (data.password !== data.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        
        if (!data.role) newErrors.role = 'Please select your role';
        break;

      case 2:
        if (!data.industry) newErrors.industry = 'Please select your industry';
        if (!data.primaryGoal) newErrors.primaryGoal = 'Please select your primary goal';
        break;

      case 3:
        if (!data.firstPrompt.trim()) newErrors.firstPrompt = 'Please enter a prompt to get started';
        else if (data.firstPrompt.length < 10) newErrors.firstPrompt = 'Please provide more detail in your prompt';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(totalSteps, prev + 1));
      console.log('LOG: ONBOARD-FLOW-4 - Advanced to step:', currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    console.log('LOG: ONBOARD-FLOW-5 - Returned to step:', currentStep - 1);
  };

  const handleSubmit = async () => {
    console.log('LOG: ONBOARD-FLOW-6 - Submitting onboarding data');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          username: data.username,
          password: data.password,
          role: data.role,
          aiPreferenceLevel: data.aiControlLevel
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('LOG: ONBOARD-FLOW-7 - Onboarding completed successfully');
        
        // Store token if provided
        if (result.token) {
          localStorage.setItem('auth_token', result.token);
        }
        
        onComplete?.(data);
      } else {
        console.error('LOG: ONBOARD-FLOW-ERROR-1 - Onboarding failed:', result.error || result.message);
        setErrors({ submit: result.error || result.message || 'Failed to create account' });
      }
    } catch (error) {
      console.error('LOG: ONBOARD-FLOW-ERROR-2 - API call failed:', error);
      setErrors({ submit: 'Failed to create account. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Step 1: Account Setup */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <User className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
                <p className="text-gray-600">Join the AI-powered content revolution</p>
              </div>

              {/* Social Sign-In Buttons */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 text-center">Quick sign up with</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Google Sign-In */}
                  <button
                    type="button"
                    onClick={() => {
                      console.log('LOG: ONBOARD-SOCIAL-1 - Google OAuth initiated');
                      window.location.href = '/api/oauth/google';
                    }}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    data-testid="button-google-signin"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>

                  {/* Twitter Sign-In */}
                  <button
                    type="button"
                    onClick={() => {
                      console.log('LOG: ONBOARD-SOCIAL-2 - Twitter OAuth initiated');
                      window.location.href = '/api/oauth/twitter';
                    }}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    data-testid="button-twitter-signin"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Twitter
                  </button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => updateData('email', e.target.value)}
                    className={`w-full px-3 py-3 border rounded-md text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={data.username}
                    onChange={(e) => updateData('username', e.target.value)}
                    className={`w-full px-3 py-3 border rounded-md text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.username ? 'username-error' : undefined}
                    autoComplete="username"
                  />
                  {errors.username && (
                    <p id="username-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={data.password}
                      onChange={(e) => updateData('password', e.target.value)}
                      className={`w-full px-3 py-3 border rounded-md text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-3">I am a...</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'creator', label: 'Content Creator', desc: 'Create viral content' },
                      { id: 'influencer', label: 'Influencer', desc: 'Promote brands' }
                    ].map((role) => (
                      <label
                        key={role.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          data.role === role.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.id}
                          checked={data.role === role.id}
                          onChange={(e) => updateData('role', e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <h4 className="font-medium text-gray-900">{role.label}</h4>
                          <p className="text-sm text-gray-600">{role.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.role && (
                    <p className="mt-2 text-sm text-red-600" role="alert">
                      {errors.role}
                    </p>
                  )}
                </fieldset>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Target className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Personalize Your Experience</h2>
                <p className="text-gray-600">Help us tailor AI to your needs</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <select
                    id="industry"
                    value={data.industry}
                    onChange={(e) => updateData('industry', e.target.value)}
                    className={`w-full px-3 py-3 border rounded-md text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.industry ? 'border-red-500' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.industry ? 'industry-error' : undefined}
                  >
                    <option value="">Select your industry</option>
                    <option value="technology">Technology</option>
                    <option value="fashion">Fashion</option>
                    <option value="health">Health & Wellness</option>
                    <option value="food">Food & Beverage</option>
                    <option value="finance">Finance</option>
                    <option value="education">Education</option>
                  </select>
                  {errors.industry && (
                    <p id="industry-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.industry}
                    </p>
                  )}
                </div>

                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-3">Primary Goal</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'awareness', label: 'Brand Awareness', icon: '📢' },
                      { id: 'engagement', label: 'Engagement', icon: '💬' },
                      { id: 'conversion', label: 'Conversion', icon: '🎯' },
                      { id: 'affiliate', label: 'Affiliate Revenue', icon: '💰' }
                    ].map((goal) => (
                      <label
                        key={goal.id}
                        className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                          data.primaryGoal === goal.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="primaryGoal"
                          value={goal.id}
                          checked={data.primaryGoal === goal.id}
                          onChange={(e) => updateData('primaryGoal', e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="text-2xl mb-1">{goal.icon}</div>
                          <h4 className="text-sm font-medium text-gray-900">{goal.label}</h4>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.primaryGoal && (
                    <p className="mt-2 text-sm text-red-600" role="alert">
                      {errors.primaryGoal}
                    </p>
                  )}
                </fieldset>

                <div>
                  <label htmlFor="ai-control" className="block text-sm font-medium text-gray-700 mb-2">
                    AI Autonomy Level: {data.aiControlLevel}%
                  </label>
                  <div className="space-y-2">
                    <input
                      id="ai-control"
                      type="range"
                      min="0"
                      max="100"
                      value={data.aiControlLevel}
                      onChange={(e) => updateData('aiControlLevel', parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 slider"
                      aria-valuetext={`${data.aiControlLevel} percent AI autonomy`}
                      data-testid="slider-ai-autonomy"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0% - You control everything</span>
                      <span>100% - AI handles everything</span>
                    </div>
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                      <p className="font-medium">
                        {data.aiControlLevel < 25 && "🎮 Full Control - You make all decisions"}
                        {data.aiControlLevel >= 25 && data.aiControlLevel < 50 && "🤝 Collaborative - AI suggests, you decide"}
                        {data.aiControlLevel >= 50 && data.aiControlLevel < 75 && "🚀 AI-Assisted - AI handles routine tasks"}
                        {data.aiControlLevel >= 75 && "🔮 AI-Powered - AI optimizes everything automatically"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: First Prompt */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Sparkles className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Let's Create Something</h2>
                <p className="text-gray-600">What would you like to create first?</p>
              </div>

              <div>
                <label htmlFor="first-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your content idea
                </label>
                <textarea
                  id="first-prompt"
                  value={data.firstPrompt}
                  onChange={(e) => updateData('firstPrompt', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-3 border rounded-md text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                    errors.firstPrompt ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Create a viral article about AI trends in my industry..."
                  aria-describedby={errors.firstPrompt ? 'prompt-error' : 'prompt-help'}
                />
                <p id="prompt-help" className="mt-1 text-sm text-gray-500">
                  Be specific about your topic, audience, and desired outcome
                </p>
                {errors.firstPrompt && (
                  <p id="prompt-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.firstPrompt}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Example Prompts:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• "Create a LinkedIn post about sustainable fashion trends"</li>
                  <li>• "Write a blog article about AI in healthcare for professionals"</li>
                  <li>• "Generate social media content for a new fitness app launch"</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 4: Processing & Completion */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              {isSubmitting ? (
                <div>
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Creating Your Account</h2>
                  <p className="text-gray-600" aria-live="polite">
                    Setting up your personalized AI experience...
                  </p>
                </div>
              ) : (
                <div>
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Must Be Viral!</h2>
                  <p className="text-gray-600 mb-6">
                    Your account is ready. Let's start creating amazing content together.
                  </p>
                  <button
                    onClick={() => onComplete?.(data)}
                    className="w-full bg-indigo-600 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}

              {errors.submit && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-red-800" role="alert">{errors.submit}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          {currentStep < 4 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
                aria-label="Go to previous step"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>

              <button
                onClick={currentStep === 3 ? handleSubmit : nextStep}
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label={currentStep === 3 ? 'Complete onboarding' : 'Go to next step'}
              >
                {currentStep === 3 ? 'Complete Setup' : 'Next'}
                {currentStep < 3 && <ChevronRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}