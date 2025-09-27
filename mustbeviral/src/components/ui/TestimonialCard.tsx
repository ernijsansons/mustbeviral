import { Star} from 'lucide-react';
import { cn} from '../../lib/utils';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company?: string;
  avatar?: string;
  rating?: number;
  metric?: {
    before: string;
    after: string;
    label: string;
  };
  className?: string;
}

export function TestimonialCard({
  quote, author, role, company, avatar, rating = 5, metric, className }: TestimonialCardProps) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl p-6 shadow-lg hover:shadow-viral transition-all duration-300 hover:-translate-y-1',
        className
      )}
    >
      {/* Quote mark decoration */}
      <div className="absolute top-4 left-4 text-6xl text-primary-100 font-serif leading-none">
        "
      </div>

      {/* Rating stars */}
      {rating > 0 && (
        <div className="flex gap-1 mb-4 relative z-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'w-5 h-5',
                i < rating
                  ? 'fill-gold-500 text-gold-500'
                  : 'fill-gray-200 text-gray-200'
              )}
            />
          ))}
        </div>
      )}

      {/* Quote */}
      <blockquote className="relative z-10 text-gray-700 mb-6 italic">
        {quote}
      </blockquote>

      {/* Metric transformation */}
      {metric && (
        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-viral-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Before</p>
              <p className="text-xl font-bold text-gray-900">{metric.before}</p>
            </div>
            <div className="px-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-viral-500 flex items-center justify-center">
                <span className="text-white text-xs">→</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">After</p>
              <p className="text-xl font-bold bg-gradient-to-r from-primary-500 to-viral-500 bg-clip-text text-transparent">
                {metric.after}
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">{metric.label}</p>
        </div>
      )}

      {/* Author info */}
      <div className="flex items-center">
        {avatar ? (
          <img
            src={avatar}
            alt={author}
            className="w-12 h-12 rounded-full mr-4 object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-viral-500 flex items-center justify-center text-white font-semibold mr-4">
            {author.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">{author}</p>
          <p className="text-sm text-gray-600">
            {role}
            {company && <span> at {company}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}