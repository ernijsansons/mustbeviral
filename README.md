# Must Be Viral - AI-Powered Content Creation Platform

Must Be Viral is a full-stack application with Cloudflare Workers backend that connects content creators with influencers through AI-powered matching.

## Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers with D1 Database, KV Cache, R2 Storage
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: Cloudflare D1 (SQLite-based)
- **Cache**: Cloudflare KV for session management and trends
- **Storage**: Cloudflare R2 for asset uploads

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

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

The app should load with:
- ✅ Dashboard with navigation working
- ✅ No console errors
- ✅ All pages accessible (Dashboard, Content, Matches, Onboard)

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