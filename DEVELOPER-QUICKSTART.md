# Must Be Viral V2 - Developer Quick Start Guide

> Get up and running with Must Be Viral V2 in under 10 minutes

## 🚀 Quick Setup (5 Minutes)

### Prerequisites Checklist
- ✅ **Node.js 20+** installed ([Download](https://nodejs.org/))
- ✅ **Docker & Docker Compose** installed ([Download](https://docs.docker.com/get-docker/))
- ✅ **Git** installed and configured
- ✅ **VS Code** or preferred editor with extensions

### 1. Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/your-org/must-be-viral-v2.git
cd must-be-viral-v2

# Install dependencies (this may take 1-2 minutes)
npm install

# Setup development environment
npm run setup
```

### 2. Choose Your Development Mode

#### Option A: Full Docker Stack (Recommended for beginners)
```bash
# Start everything with Docker
npm run docker:compose

# ✅ This gives you:
# - Full application stack
# - PostgreSQL database
# - Redis caching
# - Nginx proxy
# - Monitoring dashboards
```

#### Option B: Local Development Server (Faster for development)
```bash
# Start local development server
npm run dev

# ✅ This gives you:
# - Hot reload for fast development
# - Direct database access
# - Faster startup times
```

### 3. Verify Installation

Open your browser and visit:
- **Main App**: http://localhost:3000
- **Health Check**: http://localhost:3000/health  
- **API Metrics**: http://localhost:3000/metrics

If using Docker mode, also check:
- **Grafana Dashboard**: http://localhost:3001 (admin/admin)

## 🛠️ Development Workflow

### Daily Development Commands

```bash
# Start development (choose one)
npm run dev                    # Local server with hot reload
npm run docker:compose         # Full Docker stack

# Run tests while developing
npm run test:watch            # Watch mode for continuous testing
npm run test:unit             # Quick unit tests only

# Code quality checks
npm run lint                  # Check code style
npm run type-check            # TypeScript validation

# View logs and monitoring
npm run docker:logs           # View all Docker service logs
npm run health:all            # Check all service health
```

### Project Navigation

```
📁 must-be-viral-v2/
├── 🚀 mustbeviral/           # Main application
│   ├── 📱 app/               # Next.js pages (start here for UI)
│   ├── ⚙️  src/              # React components and utilities
│   ├── 🔧 server/            # Backend API (start here for API)
│   └── 🧪 __tests__/         # Test files (comprehensive test suite)
├── 🔌 services/              # Microservices (advanced)
├── 🐳 docker-compose*.yml    # Docker configurations
└── 📚 docs/                  # Documentation
```

### Key Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `mustbeviral/app/page.tsx` | Main app entry point | UI changes |
| `mustbeviral/server/api/` | API endpoints | Backend features |
| `mustbeviral/src/components/` | React components | UI components |
| `mustbeviral/shared/schema.ts` | Database schema | Data model changes |
| `server.js` | Main Node.js server | Server configuration |

## 🧪 Testing Your Changes

### Quick Test Commands

```bash
# Run all tests (takes 2-3 minutes)
npm test

# Run specific test types
npm run test:unit             # Unit tests (fastest - 30s)
npm run test:integration      # Integration tests (1-2 min)
npm run test:e2e             # End-to-end tests (2-3 min)

# Test with coverage report
npm run test:coverage

# Test specific component/feature
npm test -- --testNamePattern="authentication"
npm test -- --testPathPattern="components"
```

### Creating Your First Test

```javascript
// Example: __tests__/unit/my-feature.test.js
describe('My New Feature', () => {
  test('should work correctly', () => {
    // Your test code here
    expect(true).toBe(true);
  });
});
```

## 🎯 Common Development Tasks

### 1. Add a New API Endpoint

Create a new endpoint in `mustbeviral/server/api/`:

```javascript
// mustbeviral/server/api/my-feature.mjs
import express from 'express';
import { verifyToken } from './auth.mjs';

const router = express.Router();

// GET /api/my-feature
router.get('/', verifyToken, async (req, res) => {
  try {
    // Your API logic here
    res.json({ success: true, data: "Hello World" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

Then register it in the main server file.

### 2. Add a New React Component

Create components in `mustbeviral/src/components/`:

```tsx
// mustbeviral/src/components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return (
    <div className="p-4 bg-blue-100 rounded-lg">
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
};
```

### 3. Modify Database Schema

Update the schema in `mustbeviral/shared/schema.ts`:

```typescript
// Add new table or modify existing tables
export const myNewTable = pgTable('my_table', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

Then create and run migrations as needed.

### 4. Add New AI Model

Update the AI tools manager in `mustbeviral/src/lib/ai-tools.ts`:

```typescript
// Add new model to the models array
{
  id: 'new-model',
  name: 'New AI Model',
  type: 'text',
  provider: 'openai',
  endpoint: 'new-model-endpoint',
  cost_multiplier: 2.0,
  max_tokens: 8192
}
```

## 🐛 Debugging & Troubleshooting

### Common Issues & Solutions

#### 1. Port Already in Use
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

#### 2. Docker Issues
```bash
# Clean Docker system
npm run docker:clean

# Rebuild containers from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 3. Database Connection Issues
```bash
# Check if PostgreSQL is running (Docker mode)
docker-compose ps

# View database logs
docker-compose logs postgres

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

#### 4. Node Module Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment
export DEBUG=*
export LOG_LEVEL=debug

# Start with debug logging
npm run dev
```

### Useful Debug Commands

```bash
# Check all services health
npm run health:all

# View application metrics
curl http://localhost:3000/metrics

# Check Docker container status
docker-compose ps

# View real-time logs
npm run docker:logs

# Database connection test
docker-compose exec postgres psql -U postgres -d mustbeviral -c "SELECT NOW();"
```

## 🔧 VS Code Setup (Recommended)

### Essential Extensions

Install these VS Code extensions for the best development experience:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode-remote.remote-containers"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

### Useful VS Code Shortcuts

- `Ctrl+Shift+P` - Command palette
- `Ctrl+`` ` - Toggle integrated terminal
- `F5` - Start debugging
- `Ctrl+Shift+E` - File explorer
- `Ctrl+Shift+F` - Global search

## 📚 Learning Path for New Developers

### Week 1: Getting Familiar
1. ✅ Set up development environment
2. ✅ Run the application and explore the UI
3. ✅ Read through the main README.md
4. ✅ Make a small UI change and see it reflected
5. ✅ Run the test suite and understand the structure

### Week 2: Understanding the Codebase
1. 📖 Read the API documentation
2. 🏗️ Study the architecture documentation
3. 🧪 Write your first test
4. 🔧 Make a small API change
5. 🤖 Try the AI features and understand the tier system

### Week 3: Contributing
1. 🐛 Fix a small bug or implement a minor feature
2. 📝 Add documentation for your changes
3. ✅ Ensure all tests pass
4. 🔄 Submit your first pull request

## 💡 Pro Tips for Development

### Performance Tips
- Use `npm run test:unit` for quick testing during development
- Use `npm run dev` instead of Docker for faster iteration
- Enable hot reload for instant feedback on changes
- Use browser dev tools for debugging frontend issues

### Code Quality Tips
- Run `npm run lint:fix` before committing
- Use TypeScript interfaces for better code documentation
- Write tests for new features as you develop them
- Use meaningful commit messages following conventional commits

### Productivity Tips
- Set up your editor with the recommended extensions
- Use the health check endpoints to verify your changes
- Leverage the comprehensive test suite to catch issues early
- Use Docker compose for testing the full stack integration

## 🆘 Getting Help

### Self-Service Resources
1. **Error Messages**: Most error messages include helpful context
2. **Health Endpoints**: Check `/health` and `/metrics` for system status
3. **Logs**: Use `npm run docker:logs` to see detailed logs
4. **Documentation**: Comprehensive docs in the `/docs` folder

### Community Support
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-org/must-be-viral-v2/issues)
- 💬 **Questions**: [Discord #dev-help channel](https://discord.gg/mustbeviral)
- 📧 **Direct Contact**: dev-support@mustbeviral.com

### Contribution Guidelines
- Fork the repository and create a feature branch
- Write tests for your changes
- Follow the existing code style (enforced by ESLint/Prettier)
- Update documentation for significant changes
- Submit pull requests with clear descriptions

## ✅ Development Checklist

Before submitting code changes:

- [ ] ✅ All tests pass (`npm test`)
- [ ] 🎨 Code is properly formatted (`npm run lint:fix`)
- [ ] 🔍 TypeScript validation passes (`npm run type-check`)
- [ ] 🏥 Health checks pass (`npm run health:all`)
- [ ] 📝 Documentation updated if needed
- [ ] 🧪 New features have tests
- [ ] 🔒 Security considerations addressed

---

## 🎉 You're Ready to Develop!

Congratulations! You now have a fully functional development environment for Must Be Viral V2. Start by exploring the codebase, making small changes, and gradually working on more complex features.

**Next Steps:**
1. Try modifying a component in `mustbeviral/src/components/`
2. Add a simple API endpoint in `mustbeviral/server/api/`
3. Run the test suite and understand the testing patterns
4. Join the Discord community to connect with other developers

Happy coding! 🚀

---

*Last Updated: January 2025 | For support: dev-support@mustbeviral.com*