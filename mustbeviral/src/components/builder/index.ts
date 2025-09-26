/**
 * Builder.io Custom Components Index
 * 
 * This file exports all custom Builder.io components for easy importing
 * and registration with the Builder.io SDK.
 */

export { ViralHero } from './ViralHero';
export { FeatureGrid } from './FeatureGrid';

// Re-export common UI components that Builder.io can use
export { Button } from '../ui/Button';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
export { GradientText } from '../ui/GradientText';

// Register all components with Builder.io when the module loads
if (typeof window !== 'undefined' && (window as any).Builder) {
  // Components will auto-register themselves when imported
  console.log('🎨 Builder.io custom components loaded successfully!');
}




