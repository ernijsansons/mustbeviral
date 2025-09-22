import { Brain, Zap, BarChart3, Layers, Target, Shield } from 'lucide-react';
import { ViralCard } from './ui/ViralCard';
import { GradientText } from './ui/GradientText';

const features = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "Predict Virality Before You Post",
    description: "AI analyzes your content against 10M+ viral posts to predict performance with 87% accuracy",
    benefits: ["Viral probability score", "Optimal posting time", "Trending topic alignment"],
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Optimize for Every Platform",
    description: "Automatically generate platform-specific variations optimized for maximum engagement",
    benefits: ["Multi-platform adaptation", "Hashtag optimization", "Caption variations"],
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Scale Your Success",
    description: "Advanced analytics and team collaboration tools to scale viral content production",
    benefits: ["Real-time analytics", "Team workflows", "Content calendar"],
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Find Perfect Brand Matches",
    description: "ML-powered matching connects creators with brands based on audience overlap",
    benefits: ["Audience analysis", "Brand compatibility", "Campaign management"],
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "Content Intelligence Hub",
    description: "Comprehensive content library with performance insights and reusability tracking",
    benefits: ["Content repository", "Performance history", "Template library"],
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Enterprise-Grade Security",
    description: "SOC 2 compliant platform with advanced security and privacy features",
    benefits: ["Data encryption", "GDPR compliance", "Role-based access"],
  },
];

export function ValueProps() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="mb-4">
            <GradientText size="4xl" variant="viral">
              Everything You Need to Go Viral
            </GradientText>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful AI tools that transform how you create, optimize, and scale content
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <ViralCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              variant="gradient"
              className="group"
            >
              <p className="text-gray-600 mb-4">
                {feature.description}
              </p>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-start">
                    <span className="text-viral-500 mr-2 mt-0.5">✓</span>
                    <span className="text-sm text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </ViralCard>
          ))}
        </div>

        {/* CTA section */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-4 items-center bg-gradient-to-r from-primary-50 to-viral-50 rounded-2xl p-8">
            <div className="text-left">
              <h3 className="text-2xl font-heading font-semibold text-gray-900 mb-2">
                Ready to transform your content strategy?
              </h3>
              <p className="text-gray-600">
                Join 50,000+ creators using AI to guarantee viral success
              </p>
            </div>
            <a
              href="/onboard"
              className="shrink-0 px-6 py-3 bg-gradient-to-r from-primary-500 to-viral-500 text-white font-semibold rounded-lg hover:shadow-viral hover:-translate-y-0.5 transition-all duration-200"
            >
              Start Free Trial →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}