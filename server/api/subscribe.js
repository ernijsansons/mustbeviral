// Stripe subscription checkout API endpoint
import express from 'express';

const router = express.Router();

// Subscription checkout (simplified for demo)
router.get('/', (req, res) => {
  console.log('GET /api/subscribe called - redirecting to Stripe');
  // In a real app, this would integrate with Stripe  
  res.redirect('https://billing.stripe.com/demo?product=premium-plan');
});

router.post('/', (req, res) => {
  console.log('POST /api/subscribe called - returning checkout URL');
  // In a real app, this would create a Stripe checkout session
  res.json({ 
    url: 'https://billing.stripe.com/demo?product=premium-plan',
    message: 'Redirecting to subscription checkout...' 
  });
});

export default router;