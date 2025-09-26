# Must Be Viral

## Overview

Must Be Viral is an AI-powered content creation and influencer matching platform that automates viral content generation and connects content creators with influencers. The platform features a comprehensive suite of AI agents, analytics dashboards, and monetization tools designed to help users create engaging content and scale their reach through strategic influencer partnerships.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Component-based architecture with TypeScript for type safety
- **Vite**: Modern build tool providing fast development and optimized production builds
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Mobile-First Design**: All components are designed with mobile responsiveness as a priority

### Backend Architecture
- **Express.js Server**: RESTful API server handling authentication, content management, and business logic
- **Modular Architecture**: Separate modules for different concerns (auth, content, analytics, revenue)
- **AI Agent System**: Orchestrated agents for CMO, Creative, SEO, Compliance, and Influencer matching
- **Event-Driven Processing**: Engagement tracking and analytics processing using event queues

### Database Design
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **Neon Database**: Serverless PostgreSQL database for production
- **Schema Structure**:
  - Users table: Authentication and profile data with JSON storage for gamification
  - Content table: AI-generated and user content with metadata
  - Matches table: Influencer-content matching with scoring algorithms

### Authentication & Security
- **JWT-based Authentication**: Secure token-based auth using JOSE library
- **Tiered Security Features**: Basic, Standard, and Premium security levels
- **Password Hashing**: bcryptjs for secure password storage
- **SSO Integration**: OAuth2 providers for enterprise customers

### AI Integration
- **Multi-Provider Support**: Cloudflare, HuggingFace, OpenAI, and Stability AI
- **Tiered AI Access**: Free, Standard, and Premium tiers with different model access
- **Agent Orchestration**: Coordinated AI agents for different content creation phases
- **Quality Controls**: Ethics checking and bias detection built into AI workflows

### Analytics & Engagement
- **Real-time Analytics**: WebSocket-based live engagement tracking
- **Comprehensive Metrics**: Conversion funnels, match analytics, and performance tracking
- **Trend Monitoring**: Google Trends API integration for viral content opportunities
- **Gamification System**: Points, badges, and achievements stored in user profiles

### Monetization Features
- **Stripe Integration**: Subscription billing with Free, Standard ($19), and Premium ($49) tiers
- **Commission System**: Revenue sharing for influencer partnerships
- **Payout Management**: Automated commission calculations and payouts

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Stripe**: Payment processing and subscription management
- **WebSocket (ws)**: Real-time communication for analytics and notifications

### AI Services
- **LangChain**: AI agent framework and tool orchestration
- **Google Trends API**: Trend analysis and viral content identification
- **Multiple AI Providers**: Cloudflare Workers AI, HuggingFace, OpenAI, Stability AI

### Development & Testing
- **Jest**: Unit testing framework with comprehensive test coverage
- **Playwright**: End-to-end testing across multiple browsers
- **ESLint + TypeScript**: Code quality and type checking
- **Concurrently**: Development server coordination

### Deployment & Monitoring
- **Vite**: Production build optimization
- **Express**: Production server deployment
- **Environment Configuration**: Separate development and production environments