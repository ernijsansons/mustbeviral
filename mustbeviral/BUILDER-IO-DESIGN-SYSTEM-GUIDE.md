# 🎨 Builder.io Design System Integration Guide

## How AI Should Use Your Design System

This guide provides comprehensive instructions for AI to properly utilize the Must Be Viral V2 design system when creating content in Builder.io.

---

## 🎯 **Design System Overview**

### **Brand Identity**
- **Primary Color**: Electric Violet (`#6366f1`) - Primary brand color
- **Secondary Color**: Viral Green (`#10b981`) - Success, growth, viral elements
- **Accent Color**: Neural Gold (`#f59e0b`) - Premium features, highlights
- **Background**: Deep Space (`#0f172a`) / Cloud White (`#f8fafc`)
- **Typography**: Poppins (headings) + Inter (body text)

### **Design Philosophy**
- **Viral-First**: Every element should feel shareable and engaging
- **Cosmic Aesthetic**: Universe-bending effects with smooth animations
- **Performance-Optimized**: Fast, responsive, accessible
- **Emotion-Driven**: Micro-interactions that create delight

---

## 🧩 **Component Patterns & Usage**

### **1. Button Components**

#### **Standard Variants**
```typescript
// Primary actions
<Button variant="default">Primary Action</Button>
<Button variant="viral">Go Viral</Button>
<Button variant="gold">Premium Feature</Button>

// Secondary actions
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Subtle Action</Button>
```

#### **Cosmic Variants** (for special features)
```typescript
<Button variant="cosmic">Cosmic Feature</Button>
<Button variant="plasma">Plasma Effect</Button>
<Button variant="aurora">Aurora Display</Button>
<Button variant="quantum">Quantum Leap</Button>
<Button variant="energy">Energy Boost</Button>
```

#### **Interactive Features**
```typescript
<Button 
  animation="shimmer" 
  rippleEffect 
  hapticFeedback
  loading={isLoading}
>
  Enhanced Button
</Button>
```

### **2. Card Components**

#### **Standard Cards**
```typescript
<Card variant="default">
  <CardHeader>
    <CardTitle>Standard Card</CardTitle>
    <CardDescription>Basic card content</CardDescription>
  </CardHeader>
  <CardContent>Card body content</CardContent>
</Card>
```

#### **Cosmic Cards** (for viral content)
```typescript
<Card variant="cosmic" animation="float" interactive="hover">
  <CardHeader>
    <CardTitle gradient>Viral Content</CardTitle>
  </CardHeader>
  <CardContent>Cosmic card with glow effects</CardContent>
</Card>
```

#### **Interactive Cards**
```typescript
<Card 
  variant="elevated" 
  clickable 
  hoverEffect="lift"
  animation="shimmer"
>
  Clickable content card
</Card>
```

### **3. Layout Components**

#### **Page Layouts**
- **MarketingLayout**: For landing pages and marketing content
- **AppLayout**: For authenticated user interfaces with sidebar
- **AuthLayout**: For login/register pages with cosmic backgrounds

#### **Grid Systems**
```typescript
// Feature grids
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card variant="cosmic">Feature 1</Card>
  <Card variant="plasma">Feature 2</Card>
  <Card variant="aurora">Feature 3</Card>
</div>
```

---

## 🎨 **Visual Design Guidelines**

### **Color Usage Rules**

#### **Primary Colors**
- **Electric Violet** (`primary-500`): Main CTAs, navigation, primary actions
- **Viral Green** (`viral-500`): Success states, viral metrics, growth indicators
- **Neural Gold** (`gold-500`): Premium features, highlights, achievements

#### **Gradient Combinations**
```css
/* Viral gradient - most popular */
background: linear-gradient(135deg, #6366f1 0%, #10b981 100%);

/* Gold gradient - premium features */
background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);

/* Space gradient - backgrounds */
background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
```

### **Typography Hierarchy**

#### **Headings**
```typescript
// Use Poppins font family
<h1 className="font-heading text-4xl font-bold">Main Heading</h1>
<h2 className="font-heading text-3xl font-semibold">Section Heading</h2>
<h3 className="font-heading text-2xl font-medium">Subsection</h3>
```

#### **Body Text**
```typescript
// Use Inter font family
<p className="font-body text-base">Body text content</p>
<p className="font-body text-sm text-neutral-500">Muted text</p>
```

#### **Gradient Text** (for viral elements)
```typescript
<span className="bg-gradient-to-r from-primary-600 to-viral-600 bg-clip-text text-transparent">
  Viral Text
</span>
```

### **Animation Guidelines**

#### **Micro-Interactions**
- **Hover Effects**: Scale (1.02), lift (-translate-y-1), glow
- **Click Effects**: Scale (0.98), ripple effects
- **Loading States**: Shimmer, pulse, skeleton

#### **Page Transitions**
- **Fade In**: `animate-fade-in`
- **Slide Up**: `animate-slide-up`
- **Scale In**: `animate-scale-in`

#### **Viral Animations**
- **Float**: `animate-float` for floating elements
- **Pulse Glow**: `animate-pulse-glow` for attention-grabbing
- **Shimmer**: `animate-shimmer` for loading states

---

## 📱 **Responsive Design Patterns**

### **Breakpoint System**
```typescript
// Mobile first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
  {/* Responsive grid */}
</div>
```

### **Spacing System**
```typescript
// Consistent spacing
<div className="space-y-4 md:space-y-6 lg:space-y-8">
  {/* Vertical spacing */}
</div>

<div className="space-x-4 md:space-x-6 lg:space-x-8">
  {/* Horizontal spacing */}
</div>
```

---

## 🎯 **Content-Specific Guidelines**

### **Viral Content Cards**
```typescript
<Card variant="cosmic" animation="float" interactive="hover">
  <CardHeader>
    <CardTitle gradient>🔥 Viral Content</CardTitle>
    <CardDescription>This content is trending</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-2 text-viral-500">
      <TrendingUp className="w-4 h-4" />
      <span className="font-semibold">+2.5M views</span>
    </div>
  </CardContent>
</Card>
```

### **Feature Showcase**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {features.map((feature, index) => (
    <Card 
      key={feature.id}
      variant={index % 2 === 0 ? "cosmic" : "plasma"}
      animation="float"
      interactive="hover"
    >
      <CardHeader>
        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-viral-500 rounded-lg flex items-center justify-center mb-4">
          {feature.icon}
        </div>
        <CardTitle>{feature.title}</CardTitle>
        <CardDescription>{feature.description}</CardDescription>
      </CardHeader>
    </Card>
  ))}
</div>
```

### **Call-to-Action Sections**
```typescript
<div className="bg-gradient-to-r from-primary-500 to-viral-500 rounded-2xl p-8 text-center">
  <h2 className="text-3xl font-bold text-white mb-4">Ready to Go Viral?</h2>
  <p className="text-white/90 mb-6">Join thousands of creators making viral content</p>
  <Button variant="gold" size="lg" animation="shimmer">
    Start Creating
  </Button>
</div>
```

---

## 🔧 **Builder.io Integration Patterns**

### **Custom Components for Builder.io**

#### **ViralHero Component**
```typescript
// For hero sections
<ViralHero 
  title="Go Viral with AI"
  subtitle="Create content that spreads like wildfire"
  backgroundVariant="cosmic"
  ctaText="Start Creating"
  ctaVariant="viral"
/>
```

#### **FeatureGrid Component**
```typescript
// For feature showcases
<FeatureGrid 
  features={features}
  variant="cosmic"
  animation="float"
  columns={3}
/>
```

#### **TestimonialCarousel Component**
```typescript
// For social proof
<TestimonialCarousel 
  testimonials={testimonials}
  variant="plasma"
  autoplay={true}
/>
```

### **Content Models**

#### **Hero Section Model**
- **Title**: Text field
- **Subtitle**: Text area
- **Background Variant**: Select (cosmic, plasma, aurora, quantum, energy)
- **CTA Text**: Text field
- **CTA Variant**: Select (viral, gold, cosmic, etc.)

#### **Feature Card Model**
- **Icon**: Image/Icon selector
- **Title**: Text field
- **Description**: Text area
- **Variant**: Select (cosmic, plasma, aurora, etc.)
- **Animation**: Select (float, pulse, shimmer, etc.)

---

## 🎨 **AI Content Creation Guidelines**

### **When Creating Content, AI Should:**

1. **Use Cosmic Variants** for viral/marketing content
2. **Apply Gradient Text** for headlines and important elements
3. **Include Micro-Interactions** (hover effects, animations)
4. **Follow Color Hierarchy** (viral green for success, gold for premium)
5. **Use Consistent Spacing** (4, 6, 8 unit system)
6. **Apply Responsive Design** (mobile-first approach)
7. **Include Loading States** for dynamic content
8. **Use Appropriate Typography** (Poppins for headings, Inter for body)

### **Content Tone & Voice**
- **Energetic**: Use exclamation points and action words
- **Viral-Focused**: Emphasize growth, engagement, trending
- **Premium**: Highlight advanced features with gold accents
- **Accessible**: Clear, concise, inclusive language

### **Visual Hierarchy**
1. **Primary**: Large headings with gradient text
2. **Secondary**: Feature cards with cosmic variants
3. **Tertiary**: Supporting text with muted colors
4. **Interactive**: Buttons with viral/gold variants

---

## 🚀 **Performance Considerations**

### **Optimization Rules**
- Use `motion-reduce:transform-none` for accessibility
- Implement lazy loading for heavy components
- Use CSS transforms instead of layout changes
- Optimize images with proper sizing
- Minimize animation complexity on mobile

### **Accessibility**
- Ensure proper contrast ratios
- Include focus states for interactive elements
- Provide alternative text for images
- Use semantic HTML structure
- Test with screen readers

---

## 📝 **Example Builder.io Content**

### **Landing Page Hero**
```json
{
  "title": "🚀 Go Viral with AI",
  "subtitle": "Create content that spreads like wildfire across all platforms",
  "backgroundVariant": "cosmic",
  "ctaText": "Start Creating Now",
  "ctaVariant": "viral",
  "animation": "float"
}
```

### **Feature Grid**
```json
{
  "features": [
    {
      "icon": "🧠",
      "title": "AI-Powered Predictions",
      "description": "Predict virality before you post",
      "variant": "cosmic"
    },
    {
      "icon": "⚡",
      "title": "Multi-Platform Optimization",
      "description": "Optimize for every platform",
      "variant": "plasma"
    }
  ],
  "animation": "float",
  "columns": 3
}
```

This design system ensures all Builder.io content maintains the viral, cosmic aesthetic while being performant, accessible, and engaging. The AI should always prioritize user experience and viral potential when creating content.




