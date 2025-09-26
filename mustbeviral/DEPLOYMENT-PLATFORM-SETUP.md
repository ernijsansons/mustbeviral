# 🚀 Deployment Platform Setup Guide

## For Vite + React Project (Must Be Viral V2)

### ⚠️ Important: Your Project Uses Vite, Not Next.js!

Your project is built with **Vite + React**, not Next.js. Make sure to configure the deployment platform accordingly.

---

## 📋 Platform Configuration Settings

### **Basic Project Settings:**

| Setting | Value | Notes |
|---------|-------|-------|
| **Project Name** | `mustbeviral` | ✅ Correct |
| **Framework Preset** | `Vite` or `React` | ❌ Change from "Next.js" |
| **Development Server Port** | `5173` | ❌ Change from "3000" |
| **Setup Script** | `npm install` | ✅ Correct |
| **Development Server Command** | `npm run dev` | ✅ Correct |
| **Main Branch Name** | `main` | ✅ Correct |

### **Environment Variables:**

Add these to your deployment platform:

```bash
# Builder.io Configuration
VITE_BUILDER_API_KEY=your-builder-api-key-here

# Application Configuration
VITE_APP_ENV=development
VITE_PORT=5173
VITE_HOST=true
VITE_OPEN=true

# Feature Flags
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true

# API Endpoints
VITE_API_URL=http://localhost:3000
VITE_ANALYTICS_URL=http://localhost:3000/api/analytics
```

### **Include Patterns:**

Since your project has a nested structure, use:

```
mustbeviral/**/*
```

This will include all files in the `mustbeviral` directory.

### **Preview URL Template:**

```
https://$HOSTNAME:$PORT$PATHNAME
```

### **Design Mode Selector:**

Leave empty for default behavior, or use:

```
#root
```

---

## 🔧 Manual Configuration Steps

If the platform doesn't have a "Vite" preset, follow these steps:

### 1. **Choose "React" Framework Preset**

### 2. **Update Build Configuration**

Create a custom build script in your `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "dev": "vite"
  }
}
```

### 3. **Configure Output Directory**

Set the build output directory to `dist` (Vite's default).

### 4. **Configure Static File Serving**

Make sure the platform serves static files from the `dist` directory.

---

## 🐳 Docker Configuration (if needed)

If you need Docker support, here's a basic Dockerfile for your Vite project:

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app
COPY mustbeviral/package*.json ./
RUN npm ci --only=production

COPY mustbeviral/ .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🚀 Deployment Commands

### **Development:**
```bash
cd mustbeviral
npm install
npm run dev
```

### **Production Build:**
```bash
cd mustbeviral
npm install
npm run build
npm run preview
```

---

## 🔍 Troubleshooting

### **Port Issues:**
- Vite uses port `5173` by default, not `3000`
- Make sure your platform is configured for the correct port

### **Build Issues:**
- Ensure the platform is running `npm run build` (not `next build`)
- Check that the output directory is set to `dist`

### **Environment Variables:**
- All environment variables must be prefixed with `VITE_`
- Make sure `VITE_BUILDER_API_KEY` is set for Builder.io integration

### **File Structure:**
- Your main application is in the `mustbeviral/` subdirectory
- Use include patterns to ensure all necessary files are included

---

## 📚 Next Steps

1. **Get Builder.io API Key:**
   - Sign up at [builder.io](https://builder.io)
   - Create a new space
   - Copy your API key to `VITE_BUILDER_API_KEY`

2. **Test the Setup:**
   - Run `npm run dev` locally
   - Verify the app loads at `http://localhost:5173`
   - Check that Builder.io integration works

3. **Deploy:**
   - Push your changes to the main branch
   - The platform should automatically build and deploy

---

## 🆘 Need Help?

If you encounter issues:

1. Check the platform's logs for build errors
2. Verify all environment variables are set correctly
3. Ensure the correct port (5173) is configured
4. Make sure the build command is `npm run build` (not `next build`)

Your project is a sophisticated Vite + React application with Builder.io integration, so make sure the deployment platform is configured for Vite, not Next.js!




