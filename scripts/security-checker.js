#!/usr/bin/env node

/**
 * Security Configuration Checker
 * Validates security settings across the application
 * Run: node scripts/security-checker.js
 */

const fs = require('fs');
const path = require('path');

class SecurityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  checkFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      this.issues.push(`❌ File not found: ${filePath}`);
      return null;
    }
  }

  checkEnvSecurity() {
    console.log('🔍 Checking environment configuration security...');
    
    const envFiles = ['.env', 'mustbeviral/.env.local', 'env.template'];
    
    envFiles.forEach(file => {
      const content = this.checkFile(file);
      if (!content) return;

      // Check for hardcoded secrets
      const hardcodedPatterns = [
        /JWT_SECRET=[A-Za-z0-9+/]{20,}/,
        /ENCRYPTION_KEY=[A-Za-z0-9+/]{20,}/,
        /POSTGRES_PASSWORD=(?!your_|placeholder)[A-Za-z0-9+/]{8,}/,
        /REDIS_PASSWORD=(?!your_|placeholder)[A-Za-z0-9+/]{8,}/
      ];

      const foundHardcoded = hardcodedPatterns.some(pattern => pattern.test(content));
      if (foundHardcoded && file !== 'env.template') {
        this.issues.push(`❌ Hardcoded secrets found in ${file}`);
      } else {
        this.passed.push(`✅ No hardcoded secrets in ${file}`);
      }

      // Check for weak default values
      const weakDefaults = [
        'password123',
        'admin',
        'secret',
        'changeme',
        'your_secret_here'
      ];

      const hasWeakDefaults = weakDefaults.some(weak => content.includes(weak));
      if (hasWeakDefaults) {
        this.warnings.push(`⚠️  Weak default values detected in ${file}`);
      }
    });
  }

  checkDatabaseSecurity() {
    console.log('🔍 Checking database security configuration...');
    
    const pgConfig = this.checkFile('database/postgresql-performance.conf');
    if (pgConfig) {
      if (pgConfig.includes("listen_addresses = '*'")) {
        this.issues.push("❌ PostgreSQL listening on all interfaces");
      } else if (pgConfig.includes("listen_addresses = 'localhost")) {
        this.passed.push("✅ PostgreSQL properly restricted");
      }

      if (!pgConfig.includes('ssl_')) {
        this.warnings.push("⚠️  SSL not configured for PostgreSQL");
      }
    }
  }

  checkNginxSecurity() {
    console.log('🔍 Checking Nginx security configuration...');
    
    const nginxConfig = this.checkFile('nginx/nginx.conf');
    if (nginxConfig) {
      // Check for security headers
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options', 
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy'
      ];

      securityHeaders.forEach(header => {
        if (nginxConfig.includes(header)) {
          this.passed.push(`✅ ${header} configured`);
        } else {
          this.issues.push(`❌ Missing security header: ${header}`);
        }
      });

      // Check for unsafe CSP directives
      if (nginxConfig.includes("'unsafe-inline'")) {
        this.issues.push("❌ CSP allows 'unsafe-inline'");
      } else {
        this.passed.push("✅ CSP properly hardened");
      }

      if (nginxConfig.includes("'unsafe-eval'")) {
        this.issues.push("❌ CSP allows 'unsafe-eval'");
      }

      // Check SSL configuration
      if (nginxConfig.includes('ssl_protocols TLSv1.0') || nginxConfig.includes('ssl_protocols TLSv1.1')) {
        this.issues.push("❌ Weak SSL protocols enabled");
      } else if (nginxConfig.includes('ssl_protocols TLSv1.2')) {
        this.passed.push("✅ Strong SSL protocols configured");
      }
    }
  }

  checkDockerSecurity() {
    console.log('🔍 Checking Docker security configuration...');
    
    const dockerfiles = ['Dockerfile', 'Dockerfile.optimized', 'Dockerfile.cloudflare'];
    
    dockerfiles.forEach(dockerfile => {
      const content = this.checkFile(dockerfile);
      if (!content) return;

      if (content.includes('USER nextjs') || content.includes('USER nodejs')) {
        this.passed.push(`✅ ${dockerfile} runs as non-root user`);
      } else {
        this.issues.push(`❌ ${dockerfile} may run as root`);
      }

      if (content.includes('HEALTHCHECK')) {
        this.passed.push(`✅ ${dockerfile} includes health checks`);
      } else {
        this.warnings.push(`⚠️  ${dockerfile} missing health checks`);
      }
    });
  }

  checkServerSecurity() {
    console.log('🔍 Checking server.js security configuration...');
    
    const serverContent = this.checkFile('server.js');
    if (serverContent) {
      // Check for security middleware
      if (serverContent.includes('rateLimitMiddleware')) {
        this.passed.push('✅ Rate limiting implemented');
      } else {
        this.issues.push('❌ Missing rate limiting');
      }

      // Check for input validation
      if (serverContent.includes('ipRegex') && serverContent.includes('test(ip)')) {
        this.passed.push('✅ IP address validation implemented');
      } else {
        this.issues.push('❌ Missing IP address validation');
      }

      // Check for security headers
      const securityHeadersInCode = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection'
      ];

      securityHeadersInCode.forEach(header => {
        if (serverContent.includes(header)) {
          this.passed.push(`✅ Server sets ${header}`);
        } else {
          this.warnings.push(`⚠️  Server missing ${header}`);
        }
      });
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 SECURITY AUDIT REPORT');
    console.log('='.repeat(60));

    if (this.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      this.issues.forEach(issue => console.log(`   ${issue}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (this.passed.length > 0) {
      console.log('\n✅ PASSED CHECKS:');
      this.passed.forEach(pass => console.log(`   ${pass}`));
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   Issues: ${this.issues.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    console.log(`   Passed: ${this.passed.length}`);

    const totalChecks = this.issues.length + this.warnings.length + this.passed.length;
    const securityScore = Math.round((this.passed.length / totalChecks) * 100);
    
    console.log(`   Security Score: ${securityScore}%`);

    if (this.issues.length === 0) {
      console.log('\n🎉 No critical security issues found!');
      return true;
    } else {
      console.log('\n⚠️  Please address critical issues before deployment.');
      return false;
    }
  }

  run() {
    console.log('🔐 Must Be Viral V2 - Security Configuration Checker');
    console.log('='.repeat(60));

    this.checkEnvSecurity();
    this.checkDatabaseSecurity();
    this.checkNginxSecurity(); 
    this.checkDockerSecurity();
    this.checkServerSecurity();

    return this.generateReport();
  }
}

// Run security check
const checker = new SecurityChecker();
const passed = checker.run();

process.exit(passed ? 0 : 1);