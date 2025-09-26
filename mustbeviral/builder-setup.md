# 🔑 Builder.io API Key Setup

## Getting Your API Key

### 1. **Sign up at Builder.io**
- Go to [builder.io](https://builder.io)
- Click "Sign Up" or "Get Started"
- Create your account

### 2. **Create a New Space**
- Choose a name like "Must Be Viral V2"
- Select your organization

### 3. **Get Your API Key**
- Go to **Settings** → **API Keys**
- Copy your **Public API Key** (starts with something like `abc123...`)

## Adding the API Key to Your Project

### **Option 1: Environment File (Recommended)**

Create a `.env.local` file in your `mustbeviral` directory:

```bash
# Builder.io API Key
VITE_BUILDER_API_KEY=your-actual-api-key-here

# Other development settings
VITE_APP_ENV=development
VITE_PORT=5173
VITE_HOST=true
VITE_OPEN=true
```

### **Option 2: Deployment Platform**

Add this environment variable to your deployment platform:

```
VITE_BUILDER_API_KEY=your-actual-api-key-here
```

### **Option 3: Direct in Code (Not Recommended for Production)**

You can temporarily hardcode it in `src/lib/builder.ts`:

```typescript
export const BUILDER_API_KEY = 'your-actual-api-key-here';
```

## Testing Your Setup

Once you have the API key set up:

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Check the browser console** for Builder.io initialization messages

3. **Look for this message:**
   ```
   ✅ Builder.io initialized successfully
   ```

## Example API Key Format

Your API key will look something like:
```
VITE_BUILDER_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

## Security Notes

- ✅ **Safe to use in frontend:** Builder.io public API keys are designed for frontend use
- ✅ **Environment variables:** Use `.env.local` for local development
- ✅ **Deployment:** Add to your deployment platform's environment variables
- ❌ **Don't commit:** Never commit your actual API key to git

## Next Steps

After setting up your API key:

1. **Create your first Builder.io content**
2. **Test the integration** in your app
3. **Start building visual content** without code changes!

## Need Help?

- Builder.io Documentation: [builder.io/docs](https://builder.io/docs)
- Builder.io Community: [builder.io/community](https://builder.io/community)
- Support: [builder.io/support](https://builder.io/support)




