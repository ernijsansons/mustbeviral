import { MetricCounter} from './ui/MetricCounter';
import { TestimonialCard} from './ui/TestimonialCard';
import { GradientText} from './ui/GradientText';
import { useState, useEffect} from 'react';
import { ChevronLeft, ChevronRight} from 'lucide-react';

const metrics = [
  { value: 10000000, label: 'Viral Posts Analyzed', suffix: '+', showPlus: true },
  { value: 50000000, label: 'Creator Revenue Generated', prefix: '$', showPlus: true },
  { value: 95, label: 'User Retention Rate', suffix: '%' },
  { value: 50000, label: 'Active Creators', showPlus: true },
];

const testimonials = [
  {
    quote: "Must Be Viral completely transformed my content strategy. What used to be guesswork is now data-driven success.",
    author: "Sarah Chen",
    role: "Content Creator",
    company: "@sarahcreates",
    rating: 5,
    metric: {
      before: "10K",
      after: "250K",
      label: "Followers in 3 months",
    },
  },
  {
    quote: "The AI predictions are scary accurate. It's like having a viral content expert on speed dial 24/7.",
    author: "Marcus Rodriguez",
    role: "Brand Manager",
    company: "TechStart Inc",
    rating: 5,
    metric: {
      before: "2.3%",
      after: "18.7%",
      label: "Average engagement rate",
    },
  },
  {
    quote: "We've reduced our content creation time by 70% while increasing engagement by 300%. Game changer.",
    author: "Emily Watson",
    role: "Marketing Director",
    company: "Scale Agency",
    rating: 5,
    metric: {
      before: "5 hours",
      after: "1.5 hours",
      label: "Per content piece",
    },
  },
];

const brandLogos = [
  { name: 'TechCrunch', opacity: 0.7 },
  { name: 'Forbes', opacity: 0.7 },
  { name: 'Product Hunt', opacity: 0.7 },
  { name: 'The Verge', opacity: 0.7 },
  { name: 'Wired', opacity: 0.7 },
];

export function SocialProof() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect_(() => {
    const timer = setInterval_(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-primary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="mb-4">
            <GradientText size="4xl" variant="viral">
              Trusted by Creators & Brands Worldwide
            </GradientText>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of creators and brands who've transformed their social media presence
          </p>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {metrics.map((metric, index) => (
            <MetricCounter
              key={index}
              value={metric.value}
              label={metric.label}
              suffix={metric.suffix}
              prefix={metric.prefix}
              showPlus={metric.showPlus}
              duration={2500}
            />
          ))}
        </div>

        {/* Brand logos */}
        <div className="mb-20">
          <p className="text-center text-sm text-gray-500 mb-8">AS FEATURED IN</p>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {brandLogos.map((brand, index) => (
              <div
                key={index}
                className="text-2xl font-bold text-gray-400 hover:text-gray-600 transition-colors"
                style={{ opacity: brand.opacity }}
              >
                {brand.name}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials carousel */}
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-heading font-semibold text-gray-900">
              Success Stories
            </h3>
            <div className="flex gap-2">
              <button
                onClick={prevTestimonial}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={nextTestimonial}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0 px-2">
                  <TestimonialCard {...testimonial} />
                </div>
              ))}
            </div>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentTestimonial
                    ? 'w-8 bg-primary-500'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}