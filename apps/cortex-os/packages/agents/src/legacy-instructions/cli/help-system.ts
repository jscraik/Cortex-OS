/**
 * @file CLI Help System
 * @description Comprehensive help and documentation system for Claude-Flow CLI
 * @split_from simple-cli.ts
 */

import { CLIUtilities } from './utilities.js';
import type { CLIFlags } from './types/index.js';

const VERSION = "2.0.0";

export class CLIHelpSystem {
  /**
   * Print main help documentation
   */
  static printMainHelp(): void {
    console.log(`
🌊 Claude-Flow v${VERSION} - Enterprise-Grade AI Agent Orchestration Platform

🎯 ENTERPRISE FEATURES: Complete ruv-swarm integration with 27 MCP tools, neural networking, and production-ready infrastructure

USAGE:
  claude-flow <command> [options]

🚀 INSTALLATION & ENTERPRISE SETUP:
  npx claude-flow@2.0.0 init --sparc  # Enterprise SPARC + ruv-swarm integration
  
  The --sparc flag creates:
  • Complete ruv-swarm integration with 27 MCP tools
  • Neural network processing with WASM optimization
  • Multi-agent coordination (hierarchical, mesh, ring, star topologies)
  • Cross-session memory and persistent learning
  • GitHub workflow automation (6 specialized modes)
  • Production-ready Docker infrastructure
  • Enterprise security and compliance features

🧠 SWARM INTELLIGENCE COMMANDS (v2.0.0):
  swarm "objective" [--strategy] [--mode] [--max-agents N] [--parallel] [--monitor]
    --strategy: research, development, analysis, testing, optimization, maintenance
    --mode: centralized, distributed, hierarchical, mesh, hybrid
    --parallel: Enable parallel execution (2.8-4.4x speed improvement)
    --monitor: Real-time swarm monitoring and performance tracking

🐙 GITHUB WORKFLOW AUTOMATION (v2.0.0):
  github gh-coordinator        # GitHub workflow orchestration and coordination
  github pr-manager           # Pull request management with multi-reviewer coordination
  github issue-tracker        # Issue management and project coordination
  github release-manager      # Release coordination and deployment pipelines
  github repo-architect       # Repository structure optimization
  github sync-coordinator     # Multi-package synchronization and version alignment

🏗️ CORE ENTERPRISE COMMANDS:
  init [--sparc]              # Initialize with enterprise environment + ruv-swarm
  start [--ui] [--swarm]      # Start orchestration with swarm intelligence
  spawn <type> [--name]       # Create AI agent with swarm coordination
  agent <subcommand>          # Advanced agent management with neural patterns
  sparc <subcommand>          # 17 SPARC modes with neural enhancement
  memory <subcommand>         # Cross-session persistent memory with neural learning
  status                      # Comprehensive system status with performance metrics

🤖 NEURAL AGENT TYPES (ruv-swarm Integration):
  researcher     # Research with web access and data analysis
  coder          # Code development with neural patterns
  analyst        # Performance analysis and optimization
  architect      # System design with enterprise patterns
  tester         # Comprehensive testing with automation
  coordinator    # Multi-agent orchestration and workflow management
  reviewer       # Code review with security and quality checks
  optimizer      # Performance optimization and bottleneck analysis

🎮 ENTERPRISE QUICK START:
  # Initialize enterprise environment
  npx claude-flow@2.0.0 init --sparc
  
  # Start enterprise orchestration with swarm intelligence
  ./claude-flow start --ui --swarm
  
  # Deploy intelligent multi-agent development workflow
  ./claude-flow swarm "build enterprise API" --strategy development --parallel --monitor
  
  # GitHub workflow automation
  ./claude-flow github pr-manager "coordinate release with automated testing"
  
  # Neural memory management
  ./claude-flow memory store "architecture" "microservices with API gateway pattern"
  
  # Real-time system monitoring
  ./claude-flow status --verbose

🏢 ENTERPRISE COMMAND CATEGORIES:
  Core Intelligence:    swarm, agent, sparc, memory, neural
  GitHub Automation:    github (6 specialized modes)
  Development:          init, start, status, config, workflow
  Infrastructure:       mcp, terminal, session, docker
  Enterprise:           project, deploy, cloud, security, analytics, audit

🧠 NEURAL NETWORK FEATURES (v2.0.0):
  • WASM-powered cognitive patterns with SIMD optimization
  • 27 MCP tools for comprehensive workflow automation
  • Cross-session learning and adaptation
  • Real-time performance monitoring (sub-10ms response times)
  • 32.3% token usage reduction through intelligent coordination
  • Self-healing workflows with automatic error recovery

📊 ENTERPRISE PERFORMANCE METRICS:
  • 84.8% SWE-Bench solve rate through coordinated intelligence
  • 2.8-4.4x speed improvement with parallel execution
  • 60% Docker build performance improvement
  • 100% test success rate with comprehensive validation
  • Sub-10ms MCP response times

🔗 INTEGRATION & COMPATIBILITY:
  • Node.js 20+ optimization for enterprise environments
  • Complete Claude Code integration with enhanced capabilities
  • Multi-platform support (Windows, macOS, Linux)
  • Enterprise security with access control and audit logging
  • Cross-package synchronization and dependency management

GET DETAILED HELP:
  claude-flow help <command>           # Command-specific enterprise documentation
  claude-flow <command> --help         # Alternative help syntax
  
  Examples:
    claude-flow help swarm             # Swarm intelligence coordination
    claude-flow help github            # GitHub workflow automation
    claude-flow help neural            # Neural network processing
    claude-flow help enterprise        # Enterprise features and compliance

COMMON OPTIONS:
  --verbose, -v                        Enable detailed output with performance metrics
  --help                               Show command help with enterprise features
  --config <path>                      Use custom enterprise configuration
  --parallel                           Enable parallel execution (default for swarms)
  --monitor                            Real-time monitoring and performance tracking

📚 Documentation: https://github.com/ruvnet/claude-code-flow
🐝 ruv-swarm: https://github.com/ruvnet/ruv-FANN/tree/main/ruv-swarm

🚀 Enterprise-Grade AI Agent Orchestration - Built with ❤️ by rUv for the Claude community
`);
  }

  /**
   * Print version information
   */
  static printVersion(): void {
    console.log(`Claude-Flow v${VERSION}`);
  }

  /**
   * Print command-specific help
   */
  static printCommandHelp(command: string): void {
    const helpTexts = this.getCommandHelpTexts();
    
    if (helpTexts[command]) {
      console.log(helpTexts[command]);
    } else {
      CLIUtilities.printError(`No help available for command: ${command}`);
      console.log('Available commands:');
      Object.keys(helpTexts).forEach(cmd => {
        console.log(`  ${cmd}`);
      });
    }
  }

  /**
   * Show help with available commands list
   */
  static showHelpWithCommands(): void {
    this.printMainHelp();
    console.log('\nUse "claude-flow help <command>" for detailed usage information');
  }

  /**
   * Get command-specific help texts
   */
  private static getCommandHelpTexts(): Record<string, string> {
    return {
      swarm: `
🧠 SWARM INTELLIGENCE COORDINATION

USAGE:
  claude-flow swarm "objective" [options]

DESCRIPTION:
  Deploy intelligent multi-agent swarms for complex objectives using advanced
  coordination patterns and neural networking.

OPTIONS:
  --strategy <type>     Swarm strategy (research, development, analysis, testing, optimization, maintenance)
  --mode <pattern>      Coordination pattern (centralized, distributed, hierarchical, mesh, hybrid)
  --max-agents <n>      Maximum number of agents (default: 5, max: 20)
  --parallel           Enable parallel execution (2.8-4.4x speed improvement)
  --monitor            Real-time swarm monitoring and performance tracking
  --timeout <ms>       Execution timeout in milliseconds
  --verbose, -v        Detailed output and performance metrics

STRATEGIES:
  research      Web research, data analysis, information gathering
  development   Code generation, implementation, feature development
  analysis      Performance analysis, code review, quality assessment
  testing       Test generation, validation, quality assurance
  optimization  Performance tuning, bottleneck analysis, efficiency improvements
  maintenance   Bug fixes, updates, system maintenance

COORDINATION MODES:
  centralized   Single coordinator, hierarchical command structure
  distributed   Peer-to-peer coordination, autonomous agents
  hierarchical  Multi-level management, specialized roles
  mesh          Full connectivity, maximum collaboration
  hybrid        Adaptive coordination based on task requirements

EXAMPLES:
  # Research and analysis swarm
  claude-flow swarm "analyze microservices architecture" --strategy research --parallel

  # Development swarm with monitoring
  claude-flow swarm "implement user authentication API" --strategy development --monitor

  # Testing swarm with specific coordination
  claude-flow swarm "comprehensive test suite" --strategy testing --mode hierarchical

  # Performance optimization
  claude-flow swarm "optimize database queries" --strategy optimization --max-agents 3
`,

      github: `
🐙 GITHUB WORKFLOW AUTOMATION

USAGE:
  claude-flow github <subcommand> [options]

DESCRIPTION:
  Comprehensive GitHub workflow automation with intelligent coordination
  and multi-repository management capabilities.

SUBCOMMANDS:
  gh-coordinator      GitHub workflow orchestration and coordination
  pr-manager         Pull request management with multi-reviewer coordination
  issue-tracker      Issue management and project coordination
  release-manager    Release coordination and deployment pipelines
  repo-architect     Repository structure optimization
  sync-coordinator   Multi-package synchronization and version alignment

OPTIONS:
  --repo <url>        Repository URL or path
  --token <token>     GitHub access token
  --config <path>     Custom configuration file
  --verbose, -v       Detailed output and logging
  --dry-run          Preview actions without executing

EXAMPLES:
  # Coordinate pull request reviews
  claude-flow github pr-manager --repo myorg/myrepo --token $GITHUB_TOKEN

  # Manage release coordination
  claude-flow github release-manager "v2.0.0 release" --config release.json

  # Optimize repository structure
  claude-flow github repo-architect --repo . --verbose

  # Synchronize multi-package versions
  claude-flow github sync-coordinator --config packages.json
`,

      agent: `
🤖 ADVANCED AGENT MANAGEMENT

USAGE:
  claude-flow agent <subcommand> [options]

DESCRIPTION:
  Advanced AI agent management with neural patterns, coordination,
  and persistent learning capabilities.

SUBCOMMANDS:
  spawn <type>        Create new agent with specified type
  list               List all active agents
  info <agent-id>    Get detailed agent information
  terminate <id>     Terminate specific agent
  coordinate         Enable multi-agent coordination
  monitor            Real-time agent performance monitoring

AGENT TYPES:
  researcher         Research with web access and data analysis
  coder             Code development with neural patterns
  analyst           Performance analysis and optimization
  architect         System design with enterprise patterns
  tester            Comprehensive testing with automation
  coordinator       Multi-agent orchestration and workflow management
  reviewer          Code review with security and quality checks
  optimizer         Performance optimization and bottleneck analysis

OPTIONS:
  --name <name>       Agent identifier name
  --config <path>     Agent configuration file
  --capabilities      List of agent capabilities
  --memory-namespace  Memory namespace for persistent learning
  --verbose, -v       Detailed output and monitoring

EXAMPLES:
  # Spawn a research agent
  claude-flow agent spawn researcher --name research-01 --verbose

  # Create development team
  claude-flow agent spawn coder --name dev-lead
  claude-flow agent spawn tester --name qa-lead
  claude-flow agent coordinate

  # Monitor agent performance
  claude-flow agent monitor --verbose
`,

      memory: `
🧠 CROSS-SESSION PERSISTENT MEMORY

USAGE:
  claude-flow memory <subcommand> [options]

DESCRIPTION:
  Advanced memory management with neural learning, cross-session persistence,
  and intelligent knowledge organization.

SUBCOMMANDS:
  store <key> <value>  Store information in persistent memory
  retrieve <key>       Retrieve stored information
  search <query>       Search memory with intelligent matching
  list [namespace]     List stored memories
  clear [namespace]    Clear memory namespace
  stats               Memory usage statistics
  backup              Create memory backup
  restore <backup>    Restore from backup

OPTIONS:
  --namespace <ns>     Memory namespace (default: 'default')
  --type <type>        Memory type (fact, procedure, experience, pattern)
  --tags <tags>        Comma-separated tags for organization
  --ttl <duration>     Time-to-live for memory entries
  --verbose, -v        Detailed memory operations

MEMORY TYPES:
  fact                Factual information and data
  procedure           Step-by-step procedures and workflows
  experience          Learning from past interactions
  pattern             Recognized patterns and insights

EXAMPLES:
  # Store architectural decisions
  claude-flow memory store "architecture" "microservices with API gateway" --type fact

  # Store procedures
  claude-flow memory store "deployment" "docker build && docker push" --type procedure

  # Search for patterns
  claude-flow memory search "authentication" --namespace security

  # View memory statistics
  claude-flow memory stats --verbose
`,

      status: `
📊 COMPREHENSIVE SYSTEM STATUS

USAGE:
  claude-flow status [options]

DESCRIPTION:
  Comprehensive system status with performance metrics, health monitoring,
  and detailed operational insights.

OPTIONS:
  --verbose, -v       Detailed status information
  --json             Output in JSON format
  --watch            Continuous monitoring mode
  --interval <ms>    Monitoring interval (default: 5000ms)

STATUS CATEGORIES:
  System             Overall system health and performance
  Agents             Active agents and their status
  Memory             Memory usage and performance
  Network            Network connectivity and latency
  Storage            Storage usage and performance
  MCP                MCP server status and tool availability

EXAMPLES:
  # Basic status check
  claude-flow status

  # Detailed system information
  claude-flow status --verbose

  # Continuous monitoring
  claude-flow status --watch --interval 3000

  # JSON output for scripting
  claude-flow status --json
`
    };
  }
}