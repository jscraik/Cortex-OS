# 🏗️ Insula Structure Guard - @ Commands

## Description

**Insula** (Structure Guard) is an automated repository organization GitHub App that maintains clean architecture and enforces organizational standards. It monitors file placements, directory structures, naming conventions, and automatically suggests or applies fixes to keep your codebase well-organized and maintainable.

### Key Features

- **Automated Structure Validation**: Monitors repository structure on every commit
- **Smart Auto-Fix Engine**: Suggests and applies structural improvements
- **Cortex-OS Architecture Enforcement**: Ensures compliance with Cortex-OS patterns
- **Directory Organization**: Prevents clutter and maintains logical file placement
- **Naming Convention Validation**: Enforces consistent naming across the codebase
- **Architecture Compliance**: Validates package structure and dependencies

---

## @ Commands

### Structure Analysis

#### `@insula analyze`

Performs a comprehensive structure analysis of the repository

```bash
@insula analyze
```

**What it does:**

- Validates directory structure against Cortex-OS rules
- Checks file placement and naming conventions
- Generates structure compliance score (0-100)
- Identifies misplaced files and suggests relocations

#### `@insula analyze --path <directory>`

Analyzes a specific directory or path

```bash
@insula analyze --path "packages/"
@insula analyze --path "apps/cortex-cli/"
```

#### `@insula analyze --severity <level>`

Filters analysis results by severity level

```bash
@insula analyze --severity error
@insula analyze --severity warning,error
```

### Auto-Fix Actions

#### `@insula fix`

Generates auto-fix suggestions for structure violations

```bash
@insula fix
```

**What it does:**

- Creates a comprehensive fix plan
- Shows before/after file movements
- Estimates impact and safety of changes
- Runs in dry-run mode by default

#### `@insula fix --apply`

Applies auto-fixes to the repository (creates PR)

```bash
@insula fix --apply
```

**What it does:**

- Executes approved structural improvements
- Creates a new branch with fixes
- Opens pull request with detailed changes
- Includes safety checks and rollback options

#### `@insula fix --files <pattern>`

Fixes specific files or directories

```bash
@insula fix --files "src/**/*.ts"
@insula fix --files "misplaced-file.js"
```

### Validation & Rules

#### `@insula rules`

Lists all active structure rules and their descriptions

```bash
@insula rules
```

**Shows:**

- Application placement rules
- Package organization standards
- Naming convention requirements
- Directory structure guidelines

#### `@insula validate`

Validates current structure against all rules

```bash
@insula validate
```

**What it does:**

- Runs all 11 Cortex-OS structure rules
- Reports violations with detailed explanations
- Provides compliance score and recommendations

#### `@insula validate --rule <name>`

Validates against a specific rule

```bash
@insula validate --rule "applications-placement"
@insula validate --rule "package-structure"
```

### Reporting & Insights

#### `@insula score`

Shows current repository structure score and trends

```bash
@insula score
```

**Displays:**

- Overall structure compliance score (0-100)
- Breakdown by violation type
- Trend analysis and improvements over time
- Comparison with Cortex-OS standards

#### `@insula report`

Generates a detailed structure report

```bash
@insula report
```

**Includes:**

- Complete structure analysis
- Violation details with file locations
- Auto-fix recommendations
- Architecture compliance assessment

#### `@insula history`

Shows structure evolution and fix history

```bash
@insula history
```

### Quick Actions

#### `@insula quick`

Performs a fast structure check focusing on critical issues

```bash
@insula quick
```

**What it does:**

- Checks for severely misplaced files
- Validates critical directory structure
- Reports urgent violations only

#### `@insula clean`

Identifies and suggests cleanup for directory clutter

```bash
@insula clean
```

**What it does:**

- Finds directories with too many files
- Suggests file reorganization
- Identifies unused or orphaned files

### Configuration

#### `@insula enable <rule>`

Enables additional structure rules

```bash
@insula enable strict-naming
@insula enable dependency-validation
```

#### `@insula disable <rule>`

Temporarily disables specific rules

```bash
@insula disable package-limits
@insula disable naming-conventions
```

#### `@insula config`

Shows current configuration and enabled rules

```bash
@insula config
```

### Help & Info

#### `@insula help`

Shows available commands and usage examples

```bash
@insula help
```

#### `@insula status`

Displays current structure guard status and recent activity

```bash
@insula status
```

#### `@insula version`

Shows Insula version and rule definitions

```bash
@insula version
```

---

## Usage Examples

### Common Workflows

**Pre-commit Structure Check:**

```bash
@insula quick
```

**Complete Repository Audit:**

```bash
@insula analyze
@insula report
```

**Auto-fix with Preview:**

```bash
@insula fix
# Review suggestions
@insula fix --apply
```

**Clean Up Specific Area:**

```bash
@insula analyze --path "packages/"
@insula fix --files "packages/**"
```

**Monitor Structure Health:**

```bash
@insula score
@insula history
```

---

## Structure Rules

### Active Cortex-OS Rules

1. **applications-placement** - Apps in `apps/` directory
2. **package-organization** - Packages in `packages/` hierarchy
3. **library-placement** - Libraries in `libs/` directory
4. **source-structure** - Source files in `src/` directories
5. **config-organization** - Config files in appropriate locations
6. **test-placement** - Test files co-located or in `tests/`
7. **documentation-structure** - Docs in `docs/` directory
8. **build-artifacts** - Build outputs in `dist/` or `build/`
9. **naming-conventions** - Consistent kebab-case naming
10. **directory-limits** - Prevent directory clutter
11. **architecture-compliance** - Enforce Cortex-OS patterns

### Violation Types

- **misplaced_file** - File in wrong directory
- **naming_violation** - Incorrect naming convention
- **directory_clutter** - Too many files in directory
- **missing_file** - Required file not found
- **architecture_violation** - Breaks Cortex-OS patterns

---

## Response Format

Insula responds with:

- **Structure Score**: 0-100 compliance rating
- **Violation Summary**: Count by type and severity
- **Fix Suggestions**: Specific recommendations with file paths
- **Auto-fix Plan**: Preview of proposed changes
- **Safety Analysis**: Impact assessment and rollback options

---

## Integration Details

- **Webhook URL**: `https://insula-github.brainwav.io/webhook`
- **Port**: 3003
- **Supported Events**: `push`, `pull_request`, `issue_comment`
- **PM2 Process**: `cortex-structure-github`

---

## Auto-Fix Safety

### Safety Features

- **Dry-Run Mode**: Preview changes before applying
- **Limited Scope**: Maximum fixes per PR for safety
- **Backup Creation**: Maintains change history
- **Rollback Support**: Easy reversion of changes
- **Validation Checks**: Ensures fixes don't break builds

### Fix Categories

- ✅ **Safe Fixes** - File moves, renames (auto-applied)
- ⚠️ **Cautious Fixes** - Directory restructuring (manual review)
- 🔄 **Complex Fixes** - Architecture changes (requires approval)

---

*For structure rule customization or architecture guidance, contact the development team.*
