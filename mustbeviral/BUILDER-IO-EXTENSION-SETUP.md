# 🔧 Builder.io Extension Setup Guide

## Complete Installation & Configuration

This guide will help you install and configure the Builder.io VS Code extension for your Must Be Viral V2 project.

---

## 📋 **Prerequisites**

1. **VS Code** installed on your system
2. **Builder.io account** with API key
3. **Node.js** 18+ installed
4. **Your project** running locally

---

## 🚀 **Step 1: Install Builder.io Extension**

### **Method 1: VS Code Extensions Marketplace**
1. Open VS Code
2. Go to **Extensions** (Ctrl+Shift+X)
3. Search for **"Builder.io"**
4. Install the **Builder.io** extension by Builder.io
5. Reload VS Code when prompted

### **Method 2: Command Line** (if marketplace fails)
```bash
# Try installing via command line
code --install-extension builderio.builder
```

### **Method 3: Manual Installation**
1. Download the extension from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=builderio.builder)
2. Install the `.vsix` file manually

---

## ⚙️ **Step 2: Configure Extension Settings**

The extension settings are already configured in `.vscode/settings.json`:

```json
{
  "builder.io.apiKey": "${env:VITE_BUILDER_API_KEY}",
  "builder.io.spaceId": "${env:VITE_BUILDER_SPACE_ID}",
  "builder.io.enablePreview": true,
  "builder.io.autoSync": true,
  "builder.io.previewUrl": "http://localhost:5173"
}
```

---

## 🔑 **Step 3: Set Up Environment Variables**

### **Create Environment File**
Create a `.env.local` file in your `mustbeviral` directory:

```bash
# Builder.io Configuration
VITE_BUILDER_API_KEY=your-actual-api-key-here
VITE_BUILDER_SPACE_ID=your-space-id-here

# Application Configuration
VITE_APP_ENV=development
VITE_PORT=5173
VITE_HOST=true
VITE_OPEN=true
```

### **Get Your API Key**
1. Go to [builder.io](https://builder.io)
2. Sign in to your account
3. Go to **Settings** → **API Keys**
4. Copy your **Public API Key**
5. Copy your **Space ID**

---

## 🎨 **Step 4: Register Custom Components**

Your custom components are already set up in `src/components/builder/`:

- **ViralHero**: Hero sections with cosmic styling
- **FeatureGrid**: Feature showcases with animations
- **TestimonialCarousel**: Social proof carousels
- **CTASection**: Call-to-action sections

### **Import Components in Your App**
Add this to your main App component or layout:

```typescript
// Import Builder.io components
import './components/builder';
```

---

## 🔧 **Step 5: Configure Builder.io Workspace**

### **Builder.io Configuration File**
The `builder.config.json` file is already configured with:

- **Project settings** (name, framework, build tool)
- **Component models** (page, hero-section, feature-section)
- **Custom components** (ViralHero, FeatureGrid, etc.)
- **Design system** (colors, fonts, animations)

### **Update Configuration**
Edit `builder.config.json` with your actual values:

```json
{
  "apiKey": "your-actual-api-key-here",
  "spaceId": "your-space-id-here",
  "previewUrl": "http://localhost:5173"
}
```

---

## 🧪 **Step 6: Test the Integration**

### **Start Your Development Server**
```bash
npm run dev
```

### **Test Builder.io Extension**
1. Open VS Code Command Palette (Ctrl+Shift+P)
2. Type **"Builder.io"**
3. You should see Builder.io commands available
4. Try **"Builder.io: Open Visual Editor"**

### **Verify Connection**
1. Check the VS Code status bar for Builder.io icon
2. Look for Builder.io panel in the sidebar
3. Verify your API key is loaded (green indicator)

---

## 🎯 **Step 7: Create Your First Content**

### **Using Builder.io Visual Editor**
1. Go to [builder.io](https://builder.io) in your browser
2. Create a new page or section
3. Use the visual editor to design content
4. Publish your content

### **Using VS Code Extension**
1. Open Command Palette (Ctrl+Shift+P)
2. Run **"Builder.io: Create New Page"**
3. Use the visual editor within VS Code
4. Save and preview your content

---

## 🔍 **Troubleshooting**

### **Extension Not Loading**
- Restart VS Code
- Check if extension is enabled
- Verify API key is correct
- Check VS Code console for errors

### **API Key Issues**
- Verify API key is valid
- Check environment variables are loaded
- Ensure `.env.local` file exists
- Restart development server

### **Preview Not Working**
- Ensure dev server is running on port 5173
- Check `previewUrl` in settings
- Verify CORS settings
- Check browser console for errors

### **Components Not Showing**
- Verify components are imported
- Check Builder.io component registration
- Ensure TypeScript compilation is successful
- Check for console errors

---

## 📚 **Usage Examples**

### **Creating a Hero Section**
```typescript
// In Builder.io visual editor, use:
<ViralHero
  title="Go Viral with AI"
  subtitle="Create content that spreads like wildfire"
  ctaText="Start Creating"
  ctaVariant="viral"
  backgroundVariant="cosmic"
  animation="float"
/>
```

### **Creating a Feature Grid**
```typescript
// In Builder.io visual editor, use:
<FeatureGrid
  title="Amazing Features"
  features={[
    {
      icon: "🚀",
      title: "AI-Powered",
      description: "Create viral content with AI",
      variant: "cosmic"
    }
  ]}
  columns={3}
  animation="float"
/>
```

---

## 🎉 **Success Indicators**

You'll know the setup is working when:

✅ **VS Code Extension**: Builder.io icon appears in status bar  
✅ **API Connection**: Green indicator shows connected  
✅ **Preview**: Content previews correctly in browser  
✅ **Components**: Custom components appear in Builder.io editor  
✅ **Sync**: Changes sync between Builder.io and your app  

---

## 🆘 **Need Help?**

- **Builder.io Docs**: [builder.io/docs](https://builder.io/docs)
- **VS Code Extension**: [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=builderio.builder)
- **Community**: [builder.io/community](https://builder.io/community)
- **Support**: [builder.io/support](https://builder.io/support)

---

## 🚀 **Next Steps**

1. **Create your first page** in Builder.io
2. **Design viral content** using your custom components
3. **Test the preview** functionality
4. **Publish content** and see it live
5. **Iterate and improve** your Builder.io workflow

Your Builder.io extension is now fully configured and ready to create viral content! 🎨✨




