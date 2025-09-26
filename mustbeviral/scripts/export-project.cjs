const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const archiver = require('archiver');

// Files and directories to exclude from the zip
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.vscode',
  '.idea',
  'coverage',
  '.nyc_output',
  'playwright-report',
  'test-results',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '.bolt/prompt',
  '.bolt/config.json'
];

function shouldExclude(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(relativePath);
    }
    
    // Check if the path starts with or contains the exclude pattern
    return relativePath.includes(pattern) || relativePath.startsWith(pattern);
  });
}

function addDirectoryToArchive(archive, dirPath, basePath = '') {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const relativePath = path.join(basePath, item);
    
    if (shouldExclude(fullPath)) {
      console.log(`Excluding: ${relativePath}`);
      continue;
    }
    
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      addDirectoryToArchive(archive, fullPath, relativePath);
    } else {
      console.log(`Adding: ${relativePath}`);
      archive.file(fullPath, { name: relativePath });
    }
  }
}

async function exportProject() {
  console.log('Starting project export...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const zipFileName = `must-be-viral-export-${timestamp}.zip`;
  const outputPath = path.join(process.cwd(), zipFileName);
  
  // Create a file to stream archive data to
  const output = createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Listen for all archive data to be written
  output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Export completed successfully!`);
    console.log(`📦 File: ${zipFileName}`);
    console.log(`📊 Size: ${sizeInMB} MB`);
    console.log(`📁 Location: ${outputPath}`);
  });
  
  // Handle warnings
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err.message);
    } else {
      throw err;
    }
  });
  
  // Handle errors
  archive.on('error', (err) => {
    console.error('Archive error:', err);
    throw err;
  });
  
  // Pipe archive data to the file
  archive.pipe(output);
  
  // Add project files to archive
  console.log('\nAdding files to archive...');
  addDirectoryToArchive(archive, process.cwd());
  
  // Add a README for the exported project
  const exportReadme = `# Must Be Viral - Exported Project

This is an exported version of the Must Be Viral AI-powered content creation platform.

## Project Structure

- \`src/\` - Main application source code
- \`src/lib/\` - Core libraries and services
- \`src/components/\` - React components
- \`src/agents/\` - AI agent implementations
- \`src/app/\` - Next.js app router pages and API routes
- \`__tests__/\` - Test files (unit and e2e)
- \`supabase/\` - Database migrations

## Key Features

1. **AI Agent System** - 6-agent workflow for content creation
2. **Gamification** - Points, levels, badges, and achievements
3. **Revenue Tools** - Commission tracking for influencers
4. **Analytics** - Real-time engagement tracking
5. **Trend Monitoring** - Google Trends integration
6. **Security** - Bias detection and compliance checking

## Setup Instructions

1. Install dependencies: \`npm install\`
2. Set up environment variables (see .env.example if provided)
3. Configure Supabase database using the migration files
4. Run development server: \`npm run dev\`

## Testing

- Unit tests: \`npm run test:unit\`
- E2E tests: \`npm run test:e2e\`
- All tests: \`npm test\`

## Deployment

The project is configured for Cloudflare Workers deployment using Wrangler.

Export created on: ${new Date().toISOString()}
`;

  archive.append(exportReadme, { name: 'EXPORT_README.md' });
  
  // Finalize the archive
  await archive.finalize();
  
  return new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });
}

// Run the export
exportProject().catch(console.error);