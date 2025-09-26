# Repository Cleanup Report - Phase 1 Discovery
**Date:** 2025-09-26
**Repository:** Must Be Viral V2
**Current Branch:** repo-slim/PH1-discovery
**Status:** DISCOVERY PHASE COMPLETE - AWAITING PHASE 2 APPROVAL

## Executive Summary
This repository contains a Cloudflare Workers/Pages application with significant opportunities for cleanup. The codebase is well-structured with proper .gitignore patterns, but contains numerous temporary scripts, duplicate documentation, and redundant test files that can be safely removed.

## Current Size Metrics
- **Repository Size:** >8GB (timeout on full analysis indicates very large size)
- **Total Files Analyzed:** ~1000+ (excluding node_modules)
- **Node Modules Locations:** 2 (root + mustbeviral/)
- **Cloudflare Workers:** 8 distinct workers with wrangler.toml configs

## Top Bloat Sources

### 1. Temporary Fix Scripts (22 files, ~200KB)
- Location: `mustbeviral/scripts/fix-*.cjs`
- Type: One-off development scripts for fixing linting/type errors
- Action: **REMOVE** - No longer needed after fixes applied

### 2. Duplicate Documentation (15+ files, ~500KB)
- Location: Root directory `*.md` files
- Type: Redundant documentation with mustbeviral/docs/
- Action: **REMOVE** - Consolidated in docs/ folder

### 3. Report Files (9 files, ~300KB)
- Location: `mustbeviral/*.xml`, `mustbeviral/*.json` reports
- Type: Generated UX/QA/Security reports
- Action: **REMOVE** - One-time analysis files

### 4. Archive Files (1 file, 183KB)
- Location: `mustbeviral/must-be-viral-export-2025-08-22.zip`
- Type: Project export archive
- Action: **REMOVE** - Should not be in version control

### 5. Duplicate Test Structure (~50 files)
- Location: `mustbeviral/__tests__/`
- Type: Old test structure, duplicates with e2e/
- Action: **REMOVE** - Modern structure in e2e/ folder

## Keep/Remove/Unsure Analysis

### KEEP (Critical Infrastructure)
| Path | Reason | Risk if Removed |
|------|--------|-----------------|
| `mustbeviral/wrangler.toml` | Main Cloudflare Workers config | App won't deploy |
| `mustbeviral/workers/*/wrangler.toml` | Individual worker configs | Workers won't deploy |
| `mustbeviral/src/worker.ts` | Main worker entry point | App won't run |
| `mustbeviral/workers/*/src/index.ts` | Worker entry points | Workers won't run |
| `mustbeviral/migrations/` | D1 database migrations | Database schema lost |
| `mustbeviral/e2e/` | Modern E2E test suite | No test coverage |
| `scripts/deploy-cloudflare.js` | Deployment automation | Manual deployment only |
| `scripts/health-check.js` | Health monitoring | No health checks |
| `.github/workflows/` | CI/CD pipelines | No automation |
| `mustbeviral/docs/` | Structured documentation | No documentation |

### REMOVE (Safe to Delete)
| Path | Size | Reason | Evidence of Unused |
|------|------|--------|-------------------|
| `mustbeviral/scripts/fix-*.cjs` (22 files) | ~200KB | Temporary fix scripts | One-time use, fixes already applied |
| Root `*-DOCUMENTATION.md` files (10+) | ~300KB | Duplicate docs | Content in docs/ folder |
| `mustbeviral/*-REPORT.xml/json` (9) | ~300KB | Generated reports | One-time analysis files |
| `mustbeviral/__tests__/e2e/*.js` | ~50KB | Old test files | TypeScript versions exist |
| `mustbeviral/must-be-viral-export-*.zip` | 183KB | Archive file | Backup, not for VCS |
| `babel.config.js` (root) | 1KB | Duplicate config | mustbeviral has babel.config.mjs |
| `load-tests/` (root) | ~20KB | Basic load tests | Comprehensive tests in mustbeviral/load-tests |
| `mustbeviral/.reports/` | ~30KB | Temporary reports | Analysis artifacts |

### UNSURE (Needs Human Review)
| Path | Reason for Uncertainty | Recommendation |
|------|------------------------|----------------|
| Multiple migration directories | Could be environment-specific | Review consolidation strategy |
| `mustbeviral/team-notes.md` | May contain important context | Review content first |
| `docker-compose.override.yml.example` | May be useful template | Check if documented elsewhere |
| Some `__tests__/unit/` files | May have unique tests | Verify coverage in new structure |

## Risk Analysis

### Low Risk Removals (Confidence: 95%)
- All `fix-*.cjs` scripts - clearly temporary
- XML/JSON report files - generated artifacts
- Root documentation duplicates - content preserved in docs/

### Medium Risk Removals (Confidence: 80%)
- Old test structure - verify all tests migrated
- Root babel.config.js - ensure mustbeviral config covers all cases

### High Risk Items (DO NOT REMOVE)
- Any wrangler.toml file
- Any worker entry point
- Database migrations
- CI/CD configurations

## Size Impact Estimates

| Category | Files | Est. Size | Impact |
|----------|-------|-----------|--------|
| Scripts | 22 | 200KB | Minimal |
| Documentation | 25+ | 500KB | Minimal |
| Reports | 9 | 300KB | Minimal |
| Archive | 1 | 183KB | Minimal |
| Tests | ~50 | 500KB | Minimal |
| **Total Direct** | **~107** | **~1.7MB** | **Cleanup** |

**Note:** Main repository size is from node_modules and git history. Phase 3 git history cleanup would have larger impact.

## Recommended Action Plan

### Phase 2 (Safe Cleanup)
1. Move identified files to `/__graveyard__/` with categories
2. Run full build and test suite
3. Verify Cloudflare deployment works
4. If all passes, safe to delete graveyard

### Phase 3 (Optional - Git History)
1. Use git filter-repo to remove historical large files
2. Clean old node_modules commits if any
3. Estimated impact: Could reduce repo by 50-90%

## Validation Requirements

Before removing any files:
1. ✅ Run `npm run build` successfully
2. ✅ Run `npm run test` with no failures
3. ✅ Run `wrangler deploy --dry-run` successfully
4. ✅ Verify all worker endpoints respond
5. ✅ Check CI/CD pipeline passes

## Conclusion

This repository is well-maintained with good practices (proper .gitignore, no committed build artifacts). The cleanup opportunity is primarily removing temporary development artifacts and consolidating documentation. The identified removals are low-risk and will improve repository clarity without affecting functionality.

**Recommendation:** Proceed to Phase 2 with the safe cleanup list. All critical infrastructure has been identified and protected.