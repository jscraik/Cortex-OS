# Root Directory Files

This document explains why certain files must remain in the project root directory.

## Configuration Files Required in Root

### Package Management
- `package.json` - Required by npm/pnpm/yarn at project root
- `pnpm-workspace.yaml` - Required by pnpm at project root
- `pnpm-lock.yaml` - Lock file must be at project root

### Build Tools
- `turbo.json` - Required by Turborepo at project root
- `nx.json` - Required by Nx at project root
- `Makefile` - Build scripts conventionally in root

### TypeScript Configuration
- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.base.json` - Base TypeScript configuration
- `tsconfig.eslint.json` - ESLint TypeScript configuration

### Python Configuration
- `pyproject.toml` - Python project configuration
- `uv.toml` - UV Python tool configuration
- `uv.lock` - UV Python lock file

### Testing Configuration
- `vitest.config.ts` - Vitest main configuration
- `vitest.workspace.ts` - Vitest workspace configuration
- `vitest.basic.config.ts` - Vitest basic tests configuration
- `vitest.fuzz.config.ts` - Vitest fuzz tests configuration
- `vitest.policy.config.ts` - Vitest policy tests configuration
- `vitest.simple-tests.config.ts` - Vitest simple tests configuration

### Documentation
- `README.md` - Main project documentation
- `LICENSE` - License file
- `NOTICE` - Legal notices
- `SECURITY.md` - Security policy
- `AGENTS.md` - Agents documentation
- `CLAUDE.md` - Claude-specific documentation
- `CODE_OF_CONDUCT.md` - Code of conduct
- `COMMERCIAL-LICENSE.md` - Commercial license
- `CONTRIBUTING.md` - Contribution guidelines
- `CODESTYLE.md` - Code style guidelines

### Tool Configuration
- `biome.json` - Biome formatter/linter configuration
- `eslint.config.js` - ESLint configuration
- `knip.jsonc` - Knip dead code detection
- `renovate.json` - Renovate bot configuration
- `commitlint.config.cjs` - Commit message linting
- `semantic-release.config.js` - Semantic release configuration

### Version Control
- `.gitignore` - Git ignore patterns
- `.gitattributes` - Git attributes
- `.gitmodules` - Git submodules

### Development Environment
- `.editorconfig` - Editor configuration
- `.npmrc` - npm configuration
- `.tool-versions` - Tool versions
- `.env*` - Environment files
- `.dockerignore` - Docker ignore patterns

These files must remain in the root directory because various tools and frameworks expect to find them there. Moving them would break tooling integrations and make the project incompatible with standard development practices.