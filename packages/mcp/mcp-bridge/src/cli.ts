#!/usr/bin/env node
/**
 * @file MCP Bridge CLI
 * @description Command-line interface for MCP transport bridging
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { McpBridge, bridgeStdioToHttp, bridgeHttpToStdio, type BridgeConfig } from './bridge.js';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const program = new Command();

program
  .name('mcp-bridge')
  .description('Bridge between MCP transport types (stdio ↔ Streamable HTTP)')
  .version('1.0.0');

/**
 * Bridge stdio client to Streamable HTTP server
 */
program
  .command('stdio-to-http')
  .description('Bridge stdio clients to a Streamable HTTP MCP server')
  .requiredOption('-u, --url <url>', 'Streamable HTTP server URL')
  .option('-H, --header <header...>', 'HTTP headers (format: "Key: Value")')
  .option('--no-logging', 'Disable logging')
  .action(async (options) => {
    const spinner = ora('Starting stdio to HTTP bridge...').start();
    
    try {
      // Parse headers
      const headers: Record<string, string> = {};
      if (options.header) {
        for (const header of options.header) {
          const [key, ...valueParts] = header.split(':');
          if (key && valueParts.length > 0) {
            headers[key.trim()] = valueParts.join(':').trim();
          }
        }
      }

      const bridge = await bridgeStdioToHttp(options.url, {
        headers,
        logging: options.logging !== false,
      });

      spinner.succeed(`Bridge started: ${chalk.blue(options.url)} → stdio`);
      console.log(chalk.gray('Bridge is running. Press Ctrl+C to stop.'));

      // Handle graceful shutdown
      const shutdown = async () => {
        console.log(chalk.yellow('\n🛑 Shutting down bridge...'));
        await bridge.stop();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Keep the process alive
      await new Promise(() => {});
    } catch (error) {
      spinner.fail('Failed to start bridge');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Bridge Streamable HTTP client to stdio server
 */
program
  .command('http-to-stdio')
  .description('Bridge Streamable HTTP clients to a stdio MCP server')
  .requiredOption('-c, --command <command>', 'Command to run stdio server')
  .option('-a, --args <args...>', 'Arguments for the stdio command')
  .option('-p, --port <port>', 'HTTP server port', '8080')
  .option('--host <host>', 'HTTP server host', 'localhost')
  .option('-e, --env <env...>', 'Environment variables (format: "KEY=value")')
  .option('--no-logging', 'Disable logging')
  .action(async (options) => {
    const spinner = ora('Starting HTTP to stdio bridge...').start();
    
    try {
      // Parse environment variables
      const env: Record<string, string> = {};
      if (options.env) {
        for (const envVar of options.env) {
          const [key, ...valueParts] = envVar.split('=');
          if (key && valueParts.length > 0) {
            env[key] = valueParts.join('=');
          }
        }
      }

      const bridge = await bridgeHttpToStdio(options.command, options.args, {
        port: parseInt(options.port),
        host: options.host,
        env,
        logging: options.logging !== false,
      });

      const url = `http://${options.host}:${options.port}`;
      spinner.succeed(`Bridge started: ${chalk.blue(options.command)} → ${chalk.blue(url)}`);
      console.log(chalk.gray('Bridge is running. Press Ctrl+C to stop.'));

      // Handle graceful shutdown
      const shutdown = async () => {
        console.log(chalk.yellow('\n🛑 Shutting down bridge...'));
        await bridge.stop();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Keep the process alive
      await new Promise(() => {});
    } catch (error) {
      spinner.fail('Failed to start bridge');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Start bridge from configuration file
 */
program
  .command('start')
  .description('Start bridge from configuration file')
  .option('-c, --config <file>', 'Configuration file path', 'mcp-bridge.json')
  .action(async (options) => {
    const spinner = ora('Loading bridge configuration...').start();
    
    try {
      if (!existsSync(options.config)) {
        throw new Error(`Configuration file not found: ${options.config}`);
      }

      const configData = await readFile(options.config, 'utf-8');
      const config: BridgeConfig = JSON.parse(configData);
      
      spinner.text = 'Starting bridge...';
      const bridge = new McpBridge(config);
      await bridge.start();

      const sourceDesc = config.source.type === 'stdio' 
        ? `${config.source.command}` 
        : config.source.url;
      const targetDesc = config.target.type === 'stdio' 
        ? 'stdio' 
        : `${config.target.host}:${config.target.port}`;

      spinner.succeed(`Bridge started: ${chalk.blue(sourceDesc)} → ${chalk.blue(targetDesc)}`);
      console.log(chalk.gray('Bridge is running. Press Ctrl+C to stop.'));

      // Handle graceful shutdown
      const shutdown = async () => {
        console.log(chalk.yellow('\n🛑 Shutting down bridge...'));
        await bridge.stop();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Keep the process alive
      await new Promise(() => {});
    } catch (error) {
      spinner.fail('Failed to start bridge');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Generate example configuration
 */
program
  .command('init')
  .description('Generate example bridge configuration')
  .option('-o, --output <file>', 'Output file path', 'mcp-bridge.json')
  .action(async (options) => {
    const exampleConfig: BridgeConfig = {
      source: {
        type: 'streamableHttp',
        url: 'https://api.example.com/mcp',
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE',
        },
      },
      target: {
        type: 'stdio',
      },
      options: {
        timeout: 30000,
        retries: 3,
        logging: true,
      },
    };

    try {
      await writeFile(options.output, JSON.stringify(exampleConfig, null, 2));
      console.log(chalk.green(`✅ Example configuration written to ${options.output}`));
      console.log(chalk.gray('Edit the configuration file and run:'));
      console.log(chalk.blue(`  mcp-bridge start --config ${options.output}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Health check command
 */
program
  .command('health')
  .description('Check health of running bridge instance')
  .option('-p, --port <port>', 'Bridge health check port', '8081')
  .action(async (options) => {
    const spinner = ora('Checking bridge health...').start();
    
    try {
      const response = await fetch(`http://localhost:${options.port}/health`);
      const health = await response.json();
      
      if (health.healthy) {
        spinner.succeed('Bridge is healthy');
        console.log(chalk.green('✅ Status: Healthy'));
      } else {
        spinner.warn('Bridge is unhealthy');
        console.log(chalk.yellow('⚠️  Status: Unhealthy'));
      }
      
      console.log(chalk.gray('Details:'));
      console.log(JSON.stringify(health.details, null, 2));
    } catch (error) {
      spinner.fail('Unable to check bridge health');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});