// AI Control Slider Component
// LOG: COMPONENT-SLIDER-1 - Initialize AI control slider

'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, User, Zap} from 'lucide-react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function AIControlSlider({ value, onChange, disabled = false, className = '' }: SliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  console.log('LOG: COMPONENT-SLIDER-2 - Slider rendered with value:', value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: number) => {
    console.log('LOG: COMPONENT-SLIDER-3 - Slider value changed to:', newValue);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const getSliderDescription = (level: number): string => {
    if (level < 25) {
    return "Minimal AI assistance - You're in control";
  }
    if (level < 50) {
    return "Balanced approach - AI suggests, you decide";
  }
    if (level < 75) {
    return "AI-first - Smart automation with your oversight";
  }
    return "Maximum AI - Let AI handle the heavy lifting";
  };

  const getSliderColor = (level: number): string => {
    if (level < 25) {
    return "from-blue-500 to-blue-600";
  }
    if (level < 50) {
    return "from-indigo-500 to-indigo-600";
  }
    if (level < 75) {
    return "from-purple-500 to-purple-600";
  }
    return "from-pink-500 to-pink-600";
  };

  const getIcon = (level: number) => {
    if (level < 25) {
    return <User className="w-5 h-5" />;
  }
    if (level < 75) {
    return <Sparkles className="w-5 h-5" />;
  }
    return <Zap className="w-5 h-5" />;
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            {getIcon(localValue)}
            <span className="ml-2">AI Control Level</span>
          </h3>
          <div className={`px-3 py-1 rounded-full text-white text-sm font-medium bg-gradient-to-r ${getSliderColor(localValue)}`}>
            {localValue}%
          </div>
        </div>

        <div className="space-y-4">
          {/* Slider Labels */}
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              Manual
            </span>
            <span className="flex items-center">
              <Zap className="w-4 h-4 mr-1" />
              AI-Powered
            </span>
          </div>

          {/* Custom Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={localValue}
              onChange={(e) => handleChange(parseInt(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              disabled={disabled}
              className={`
                w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                slider-thumb
              `}
              style={{
                background: `linear-gradient(to right, 
                  rgb(99, 102, 241) 0%, 
                  rgb(99, 102, 241) ${localValue}%, 
                  rgb(229, 231, 235) ${localValue}%, 
                  rgb(229, 231, 235) 100%)`
              }}
            />
            
            {/* Slider Track Markers */}
            <div className="absolute top-0 left-0 w-full h-3 pointer-events-none">
              {[25, 50, 75].map((mark) => (
                <div
                  key={mark}
                  className="absolute top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-sm"
                  style={{ left: `${mark}%` }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="text-center">
            <p className={`text-sm transition-colors duration-200 ${
              isDragging ? 'text-indigo-600 font-medium' : 'text-gray-600'
            }`}>
              {getSliderDescription(localValue)}
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex justify-between mt-4 space-x-2">
            {[
              { label: 'Manual', value: 10, icon: User },
              { label: 'Balanced', value: 50, icon: Sparkles },
              { label: 'AI-First', value: 90, icon: Zap }
            ].map(({ label, value: presetValue, icon: Icon }) => (
              <button
                key={label}
                onClick={() => handleChange(presetValue)}
                disabled={disabled}
                className={`
                  flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors
                  ${localValue === presetValue
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center
                `}
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Higher levels give AI more autonomy in content creation and decision-making</p>
      </div>
    </div>
  );
}

// Preset configurations for different use cases
export const SLIDERPRESETS = {
  MANUAL: 10,
  CONSERVATIVE: 25,
  BALANCED: 50,
  AGGRESSIVE: 75,
  AUTONOMOUS: 90
} as const;

// Hook for managing slider state with persistence
export function useAIControlLevel(initialValue: number = 50) {
  const [controlLevel, setControlLevel] = useState(initialValue);

  console.log('LOG: COMPONENT-SLIDER-4 - AI control level hook initialized:', initialValue);

  useEffect(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('ai-control-level');
    if (saved) {
      const parsedValue = parseInt(saved);
      if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 100) {
        setControlLevel(parsedValue);
        console.log('LOG: COMPONENT-SLIDER-5 - Loaded control level from storage:', parsedValue);
      }
    }
  }, []);

  const updateControlLevel = (newLevel: number) => {
    console.log('LOG: COMPONENT-SLIDER-6 - Updating control level:', newLevel);
    setControlLevel(newLevel);
    localStorage.setItem('ai-control-level', newLevel.toString());
  };

  return [controlLevel, updateControlLevel] as const;
}