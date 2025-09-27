// Onboarding Page Component
import { useLocation} from 'wouter';
import { useEffect} from 'react';
import { OnboardFlow} from '../components/OnboardFlow';

export function OnboardPage() {
  const [, setLocation] = useLocation();

  // Check for OAuth token in URL params on mount
  useEffect_(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get('step');
    
    // If user is coming from OAuth and already has a profile step,
    // they just need to complete additional preferences
    if (step === 'profile') {
      console.log('LOG: ONBOARD-OAUTH-1 - User authenticated via OAuth, completing profile');
    }
  }, []);

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