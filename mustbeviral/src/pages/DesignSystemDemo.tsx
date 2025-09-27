// Design System Demo Page
import React, { useState } from 'react';
import { Button, Card, CardHeader, CardContent, CardTitle, CardDescription, Input, CosmicBackground} from '../components/ui';
import { ThemeToggle, CosmicEffectsControl, AnimationToggle, useTheme} from '../providers/ThemeProvider';
import { Star, Zap, Sparkles, Rocket, Atom, Eye, Mail, Lock, Search, Send} from 'lucide-react';

export function DesignSystemDemo() {
  const { tokens} = useTheme();
  const [inputValue, setInputValue] = useState('');

  return (
    <CosmicBackground variant="nebula" density="medium" animated interactive>
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-bold text-gradient-cosmic">
              🌌 Universe-Bending Design System
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto">
              Experience the most advanced design system in the known universe.
              From cosmic buttons to quantum inputs, everything bends reality.
            </p>

            {/* Theme Controls */}
            <div className="flex items-center justify-center space-x-6 pt-6">
              <ThemeToggle />
              <CosmicEffectsControl />
              <AnimationToggle />
            </div>
          </div>

          {/* Button Showcase */}
          <Card variant="cosmic" size="lg" animation="float">
            <CardHeader>
              <CardTitle className="text-gradient-plasma">
                <Zap className="inline-block w-6 h-6 mr-2" />
                Universe-Bending Buttons
              </CardTitle>
              <CardDescription>
                Buttons that transcend dimensional boundaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="cosmic" animation="pulse">
                  <Star className="w-4 h-4 mr-2" />
                  Cosmic
                </Button>
                <Button variant="plasma" animation="shimmer">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Plasma
                </Button>
                <Button variant="aurora" animation="float">
                  <Rocket className="w-4 h-4 mr-2" />
                  Aurora
                </Button>
                <Button variant="quantum" animation="scale">
                  <Atom className="w-4 h-4 mr-2" />
                  Quantum
                </Button>
                <Button variant="energy" animation="lift">
                  <Zap className="w-4 h-4 mr-2" />
                  Energy
                </Button>
                <Button variant="glass" animation="pulse">
                  <Eye className="w-4 h-4 mr-2" />
                  Glass
                </Button>
                <Button variant="neuro" animation="scale">
                  <Star className="w-4 h-4 mr-2" />
                  Neuro
                </Button>
                <Button variant="cosmic" size="lg" loading>
                  Loading...
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input Showcase */}
          <Card variant="plasma" size="lg" animation="pulse">
            <CardHeader>
              <CardTitle className="text-gradient-aurora">
                <Sparkles className="inline-block w-6 h-6 mr-2" />
                Cosmic Input Fields
              </CardTitle>
              <CardDescription>
                Inputs that channel universal energy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  variant="cosmic"
                  placeholder="Enter cosmic coordinates..."
                  leftIcon={<Search className="w-4 h-4" />}
                  animation="shimmer"
                />
                <Input
                  variant="plasma"
                  type="email"
                  placeholder="Quantum email address"
                  leftIcon={<Mail className="w-4 h-4" />}
                  animation="pulse"
                />
                <Input
                  variant="aurora"
                  type="password"
                  placeholder="Nebula access code"
                  leftIcon={<Lock className="w-4 h-4" />}
                  showPasswordToggle
                />
                <Input
                  variant="quantum"
                  placeholder="Universal message"
                  rightIcon={<Send className="w-4 h-4" />}
                  animation="float"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card Variations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="cosmic" animation="float" interactive="glow">
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-cosmic rounded-full mx-auto flex items-center justify-center">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-glow-cosmic">Cosmic Reality</h3>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    Bend space and time with cosmic-powered interactions
                  </p>
                  <Button variant="cosmic" size="sm" className="w-full">
                    Enter Cosmos
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card variant="plasma" animation="pulse" interactive="hover">
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-plasma rounded-full mx-auto flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-glow-plasma">Plasma Fields</h3>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    Harness the power of stellar plasma energy
                  </p>
                  <Button variant="plasma" size="sm" className="w-full">
                    Charge Plasma
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card variant="aurora" animation="scale" interactive="glow">
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-aurora rounded-full mx-auto flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-glow-aurora">Aurora Magic</h3>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    Channel the ethereal beauty of cosmic auroras
                  </p>
                  <Button variant="aurora" size="sm" className="w-full">
                    Create Aurora
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Glass Morphism Section */}
          <Card variant="glass" size="xl" animation="float">
            <CardContent>
              <div className="text-center space-y-6">
                <h2 className="text-4xl font-bold text-gradient-quantum">
                  Glass Morphism Universe
                </h2>
                <p className="text-lg text-white/80 max-w-2xl mx-auto">
                  Experience the next evolution of design with glass morphism effects
                  that create depth and dimension beyond the third dimension.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button variant="glass" size="lg">
                    <Atom className="w-5 h-5 mr-2" />
                    Quantum Leap
                  </Button>
                  <Button variant="glass" size="lg">
                    <Rocket className="w-5 h-5 mr-2" />
                    Cosmic Journey
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Neumorphism Section */}
          <Card variant="neuro" size="lg" animation="lift">
            <CardContent>
              <div className="text-center space-y-6">
                <h2 className="text-3xl font-bold text-gradient-energy">
                  Neumorphic Dimensions
                </h2>
                <p className="text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
                  Soft, tactile interfaces that feel like they exist in physical space.
                  The perfect blend of skeuomorphism and flat design.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="neuro" className="h-16">
                    <Star className="w-6 h-6" />
                  </Button>
                  <Button variant="neuro" className="h-16">
                    <Zap className="w-6 h-6" />
                  </Button>
                  <Button variant="neuro" className="h-16">
                    <Sparkles className="w-6 h-6" />
                  </Button>
                  <Button variant="neuro" className="h-16">
                    <Atom className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Design Tokens Display */}
          <Card variant="energy" size="lg">
            <CardHeader>
              <CardTitle className="text-gradient-cosmic">
                Design Token Universe
              </CardTitle>
              <CardDescription>
                The foundational constants that power this reality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Colors */}
                <div>
                  <h4 className="font-semibold mb-3 text-gradient-plasma">Universe Colors</h4>
                  <div className="space-y-2">
                    {Object.entries(tokens.colors.universe).map(([name, color]) => (
                      <div key={name} className="flex items-center space-x-3">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-mono">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gradients */}
                <div>
                  <h4 className="font-semibold mb-3 text-gradient-aurora">Cosmic Gradients</h4>
                  <div className="space-y-2">
                    {Object.entries(tokens.colors.gradients).map(([name, gradient]) => (
                      <div key={name} className="flex items-center space-x-3">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ background: gradient }}
                        />
                        <span className="text-sm font-mono">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Animations */}
                <div>
                  <h4 className="font-semibold mb-3 text-gradient-quantum">Quantum Timing</h4>
                  <div className="space-y-2">
                    {Object.entries(tokens.animation.duration).map(([name, duration]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm font-mono">{name}</span>
                        <span className="text-sm text-neutral-500">{duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center space-y-4 pt-12">
            <p className="text-neutral-600 dark:text-neutral-400">
              🌌 Built with universe-bending technology • ⚡ Powered by cosmic energy
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="cosmic" size="sm">
                <Star className="w-4 h-4 mr-2" />
                Explore More
              </Button>
              <Button variant="link" size="sm">
                Return to Reality
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CosmicBackground>
  );
}