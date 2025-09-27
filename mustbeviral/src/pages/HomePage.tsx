// Home Page Component - Premium Viral Marketing Platform
import { HeroSection} from '../components/HeroSection';
import { SocialProof} from '../components/SocialProof';
import { ValueProps} from '../components/ValueProps';
import { ViralPredictor} from '../components/ViralPredictor';

export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with main value proposition */}
      <HeroSection />

      {/* Social proof with metrics and testimonials */}
      <SocialProof />

      {/* Value propositions and feature cards */}
      <ValueProps />

      {/* Interactive viral predictor demo */}
      <ViralPredictor />

      {/* Footer CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-500 to-viral-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-heading font-bold text-white mb-4">
            Ready to Make Every Post Go Viral?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join 50,000+ creators who never guess about content performance again
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/onboard"
              className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              Start Free 14-Day Trial
            </a>
            <a
              href="/api/subscribe"
              className="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              View Pricing Plans
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}