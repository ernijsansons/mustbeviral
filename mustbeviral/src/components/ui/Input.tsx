// Enhanced Universe-Bending Input Component with Smart Features
import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Eye, EyeOff, Check, AlertCircle, X, Search } from 'lucide-react';

const inputVariants = cva(
  'flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-neutral-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 hover:border-neutral-400 focus:border-primary-500',
        destructive: 'border-error-300 focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-2 focus:border-error-500 bg-error-50',
        success: 'border-success-300 focus-visible:ring-2 focus-visible:ring-success-500 focus-visible:ring-offset-2 focus:border-success-500 bg-success-50',

        // Universe-bending variants with enhanced interactions
        cosmic: 'border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:glow-cosmic hover:border-purple-400 focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20',
        plasma: 'border-pink-300 bg-gradient-to-r from-pink-50 to-violet-50 focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:glow-plasma hover:border-pink-400 focus:border-pink-500 focus:shadow-lg focus:shadow-pink-500/20',
        aurora: 'border-orange-300 bg-gradient-to-r from-orange-50 to-pink-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:glow-aurora hover:border-orange-400 focus:border-orange-500 focus:shadow-lg focus:shadow-orange-500/20',
        quantum: 'border-cyan-300 bg-gradient-to-r from-cyan-50 to-blue-50 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:glow-quantum hover:border-cyan-400 focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20',
        energy: 'border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:glow-energy hover:border-indigo-400 focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/20',
        glass: 'glass border-white/30 placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 backdrop-blur-md hover:backdrop-blur-lg',
        neuro: 'neuro-light dark:neuro-dark border-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 shadow-inner',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3',
        lg: 'h-12 px-4 text-base',
        xl: 'h-14 px-6 text-lg',
      },
      animation: {
        none: '',
        shimmer: 'animate-shimmer',
        float: 'animate-float',
        pulse: 'animate-pulse-glow',
        glow: 'focus:animate-pulse-glow',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  validation?: 'real-time' | 'on-blur' | 'none';
  suggestions?: string[];
  autoComplete?: boolean;
  clearable?: boolean;
  loadingState?: boolean;
  successMessage?: string;
  characterLimit?: number;
  showCharacterCount?: boolean;
  onValidation?: (value: string, isValid: boolean) => void;
  onSuggestionSelect?: (suggestion: string) => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className,
    variant,
    size,
    animation,
    type,
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    showPasswordToggle = false,
    validation = 'none',
    suggestions = [],
    autoComplete = false,
    clearable = false,
    loadingState = false,
    successMessage,
    characterLimit,
    showCharacterCount = false,
    onValidation,
    onSuggestionSelect,
    value: controlledValue,
    onChange,
    onFocus,
    onBlur,
    onInput,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(controlledValue || '');
    const [isValid, setIsValid] = useState(true);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [validationMessage, setValidationMessage] = useState('');
    
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const value = controlledValue !== undefined ? controlledValue : internalValue;

    // Real-time validation
    const validateInput = useCallback((inputValue: string) => {
      let valid = true;
      let message = '';

      // Basic validation rules
      if (type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        valid = emailRegex.test(inputValue) || inputValue === '';
        message = !valid && inputValue ? 'Please enter a valid email address' : '';
      }

      if (type === 'url') {
        try {
          new URL(inputValue);
          valid = true;
        } catch {
          valid = inputValue === '';
          message = !valid && inputValue ? 'Please enter a valid URL' : '';
        }
      }

      if (characterLimit && inputValue.length > characterLimit) {
        valid = false;
        message = `Character limit exceeded (${inputValue.length}/${characterLimit})`;
      }

      setIsValid(valid);
      setValidationMessage(message);
      onValidation?.(inputValue, valid);

      return valid;
    }, [type, characterLimit, onValidation]);

    // Handle input changes
    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }

      // Real-time validation
      if (validation === 'real-time') {
        validateInput(newValue);
      }

      // Filter suggestions
      if (autoComplete && suggestions.length > 0) {
        const filtered = suggestions.filter(suggestion =>
          suggestion.toLowerCase().includes(newValue.toLowerCase())
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(filtered.length > 0 && newValue.length > 0);
        setSelectedSuggestionIndex(-1);
      }

      onChange?.(event);
    }, [controlledValue, validation, validateInput, autoComplete, suggestions, onChange]);

    // Handle focus
    const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      
      if (autoComplete && suggestions.length > 0) {
        const filtered = suggestions.filter(suggestion =>
          suggestion.toLowerCase().includes(value.toString().toLowerCase())
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      }

      onFocus?.(event);
    }, [autoComplete, suggestions, value, onFocus]);

    // Handle blur
    const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // Delay hiding suggestions to allow click
      setTimeout(() => {
        setShowSuggestions(false);
      }, 200);

      // Validation on blur
      if (validation === 'on-blur') {
        validateInput(value.toString());
      }

      onBlur?.(event);
    }, [validation, validateInput, value, onBlur]);

    // Handle keyboard navigation for suggestions
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || filteredSuggestions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          break;
        case 'Enter':
          if (selectedSuggestionIndex >= 0) {
            event.preventDefault();
            const selectedSuggestion = filteredSuggestions[selectedSuggestionIndex];
            if (controlledValue === undefined) {
              setInternalValue(selectedSuggestion);
            }
            onSuggestionSelect?.(selectedSuggestion);
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    }, [showSuggestions, filteredSuggestions, selectedSuggestionIndex, controlledValue, onSuggestionSelect]);

    // Handle suggestion selection
    const handleSuggestionClick = useCallback((suggestion: string) => {
      if (controlledValue === undefined) {
        setInternalValue(suggestion);
      }
      onSuggestionSelect?.(suggestion);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      inputRef.current?.focus();
    }, [controlledValue, onSuggestionSelect]);

    // Clear input
    const clearInput = useCallback(() => {
      if (controlledValue === undefined) {
        setInternalValue('');
      }
      const event = {
        target: { value: '' },
        currentTarget: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(event);
      inputRef.current?.focus();
    }, [controlledValue, onChange]);

    const inputType = showPasswordToggle && type === 'password'
      ? (showPassword ? 'text' : 'password')
      : type;

    const hasError = !!error || (!isValid && validationMessage);
    const hasSuccess = !!successMessage && !hasError;
    const effectiveVariant = hasError ? 'destructive' : hasSuccess ? 'success' : variant;
    const displayMessage = error || validationMessage || successMessage || helperText;
    const characterCount = value.toString().length;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none z-10">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            type={inputType}
            className={cn(
              inputVariants({ variant: effectiveVariant, size, animation }),
              leftIcon && 'pl-10',
              (rightIcon || showPasswordToggle || clearable || loadingState) && 'pr-10',
              isFocused && animation === 'shimmer' && 'animate-shimmer',
              'transition-all duration-200',
              className
            )}
            ref={ref || inputRef}
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={onInput}
            aria-invalid={hasError}
            aria-describedby={cn(
              displayMessage && 'input-message',
              showCharacterCount && 'input-count',
              showSuggestions && 'input-suggestions'
            )}
            aria-expanded={showSuggestions}
            aria-haspopup={autoComplete ? 'listbox' : undefined}
            aria-activedescendant={
              showSuggestions && selectedSuggestionIndex >= 0 
                ? `suggestion-${selectedSuggestionIndex}` 
                : undefined
            }
            aria-autocomplete={autoComplete ? 'list' : undefined}
            aria-label={label || props.placeholder}
            aria-required={props.required}
            role={autoComplete ? 'combobox' : 'textbox'}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {/* Loading state */}
            {loadingState && (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin text-neutral-400" />
            )}

            {/* Success icon */}
            {hasSuccess && !loadingState && (
              <Check className="w-4 h-4 text-success-500" />
            )}

            {/* Error icon */}
            {hasError && !loadingState && (
              <AlertCircle className="w-4 h-4 text-error-500" />
            )}

            {/* Clear button */}
            {clearable && value && !loadingState && (
              <button
                type="button"
                onClick={clearInput}
                className="w-4 h-4 text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none"
                aria-label="Clear input"
                tabIndex={-1}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Password toggle */}
            {showPasswordToggle && type === 'password' && !loadingState && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="w-4 h-4 text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none focus:text-neutral-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Custom right icon */}
            {rightIcon && !showPasswordToggle && !clearable && !loadingState && !hasSuccess && !hasError && (
              <div className="text-neutral-400 pointer-events-none">
                {rightIcon}
              </div>
            )}
          </div>

          {/* Enhanced shimmer effect */}
          {animation === 'shimmer' && isFocused && (
            <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              id="input-suggestions"
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
              role="listbox"
              aria-label="Suggestions"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  id={`suggestion-${index}`}
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 transition-colors focus:bg-primary-50 focus:text-primary-600 focus:outline-none',
                    index === selectedSuggestionIndex && 'bg-primary-50 text-primary-600'
                  )}
                  onClick={() => handleSuggestionClick(suggestion)}
                  role="option"
                  aria-selected={index === selectedSuggestionIndex}
                  aria-label={`Select ${suggestion}`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3 h-3 text-neutral-400" aria-hidden="true" />
                    <span>{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Character count and messages */}
        <div className="flex justify-between items-start mt-2">
          <div className="flex-1">
            {displayMessage && (
              <p
                id="input-message"
                className={cn(
                  'text-sm',
                  hasError ? 'text-error-600' : hasSuccess ? 'text-success-600' : 'text-neutral-500'
                )}
                role={hasError ? 'alert' : 'status'}
                aria-live={hasError ? 'assertive' : 'polite'}
                aria-atomic="true"
              >
                <span className="sr-only">
                  {hasError ? 'Error: ' : hasSuccess ? 'Success: ' : 'Info: '}
                </span>
                {displayMessage}
              </p>
            )}
          </div>

          {/* Character count */}
          {showCharacterCount && characterLimit && (
            <p
              id="input-count"
              className={cn(
                'text-xs ml-2 flex-shrink-0',
                characterCount > characterLimit ? 'text-error-600' : 'text-neutral-500'
              )}
              aria-live="polite"
            >
              {characterCount}/{characterLimit}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };