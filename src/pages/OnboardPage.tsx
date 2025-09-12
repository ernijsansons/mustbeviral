// Onboarding Page Component
import { useLocation } from 'wouter';
import { OnboardFlow } from '../components/OnboardFlow';

export function OnboardPage() {
  const [, setLocation] = useLocation();

  const handleOnboardComplete = () => {
    // Redirect to dashboard after successful onboarding
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">Must Be Viral</h1>
          <p className="text-gray-600 mt-2">Create your account and get started</p>
        </div>
        
        <OnboardFlow onComplete={handleOnboardComplete} />
      </div>
    </div>
  );
}