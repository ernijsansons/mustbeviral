#!/usr/bin/env node

/**
 * Secure Secret Generation Script
 * Generates cryptographically secure secrets for production use
 * Run: node scripts/generate-secrets.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// SECURITY: Generate cryptographically secure random secrets
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

// Generate a secure password with special characters
function generatePassword(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(crypto.randomInt(0, charset.length));
  }
  return password;
}

console.log('🔐 Generating secure secrets for Must Be Viral V2...\n');

const secrets = {
  // JWT Secrets (Base64 encoded for URL safety)
  JWT_SECRET: generateSecret(32),
  JWT_REFRESH_SECRET: generateSecret(32),
  ENCRYPTION_KEY: generateSecret(32),
  SESSION_SECRET: generateSecret(32),
  
  // Database Passwords
  POSTGRES_PASSWORD: generatePassword(32),
  REDIS_PASSWORD: generatePassword(32),
  
  // Monitoring Passwords
  GRAFANA_PASSWORD: generatePassword(16),
  
  // SMTP Password (generate new one if not provided)
  SMTP_PASS: generatePassword(24)
};

console.log('✅ Generated secure secrets:\n');

// Display secrets with security warnings
Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n⚠️  SECURITY WARNINGS:');
console.log('1. These secrets are displayed ONCE - copy them immediately');
console.log('2. Never commit these secrets to version control');
console.log('3. Store them in a secure password manager');
console.log('4. Use environment variables or secure secret management in production');
console.log('5. Rotate these secrets regularly (every 90 days recommended)');

// Optionally save to a temporary file (with warning)
const saveOption = process.argv.includes('--save');
if (saveOption) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `secrets-${timestamp}.env`;
  const secretsContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(filename, secretsContent);
  console.log(`\n📁 Secrets saved to: ${filename}`);
  console.log('⚠️  DELETE this file after copying the secrets!');
  console.log('⚠️  This file contains sensitive information!');
}

console.log('\n🔧 Next steps:');
console.log('1. Copy the secrets above to your secure environment configuration');
console.log('2. Update your .env files with these values');
console.log('3. Verify all services can connect with the new secrets');
console.log('4. Remove any temporary files containing secrets');

process.exit(0);