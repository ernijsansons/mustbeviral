# Must Be Viral - AI-Powered Content Creation Platform

Must Be Viral is a full-stack application that connects content creators with influencers through AI-powered matching. Features responsive navigation, social authentication, and a comprehensive marketplace.

## Architecture

- **Frontend**: React + TypeScript with Vite and Wouter routing
- **Backend**: Express.js server with PostgreSQL database
- **Authentication**: JWT tokens with OAuth 2.0 (Google, Twitter) and secure session management
- **Database**: PostgreSQL with Drizzle ORM
- **Navigation**: Responsive design with mobile bottom navigation
- **Testing**: Jest for unit tests, Playwright for E2E testing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Environment Setup

1. Copy the environment template:
```bash
cp .env.local.example .env.local
```

2. Fill in your environment variables in `.env.local`:
```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Cloudflare D1 Database
D1_DB_ID=your_d1_database_id_here

# Cloudflare KV
KV_NAMESPACE_ID=your_kv_namespace_id_here

# Cloudflare R2 Storage
R2_BUCKET_NAME=your_r2_bucket_name_here

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here
```

### Installation & Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
# or directly with Next.js
npx next dev --port 3000
# or use the startup script
node start-nextjs.js
```

3. Open [http://localhost:5000](http://localhost:5000) in your browser.

The app should load with:
- ✅ Responsive navigation (desktop + mobile bottom nav)
- ✅ Working page navigation (Dashboard, Content, Matches)
- ✅ Tabbed content interfaces
- ✅ Social authentication buttons
- ✅ No console errors

### Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:e2e` - Run Playwright E2E tests

### Project Structure

```
├── app/                 # Next.js app directory
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── src/                # Source code
│   ├── components/     # React components
│   ├── pages/          # Page components
│   └── App.tsx         # Main app component
├── __tests__/          # Test files
├── next.config.mjs     # Next.js configuration
└── .env.local.example  # Environment variables template
```

## Deployment

For Cloudflare Pages deployment:
```bash
npm run build
npm run deploy
```

## Features

- **Dashboard**: Overview with analytics and metrics
- **Content Management**: AI-powered content creation
- **Influencer Matching**: Connect with relevant influencers
- **Analytics**: Performance tracking and insights
- **Onboarding**: Guided setup flow
- **Responsive Design**: Mobile-first approach