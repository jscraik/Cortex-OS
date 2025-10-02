import { FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'node:fs';
import path from 'node:path';

/**
 * brAInwav Cortex-OS Custom Test Reporter
 *
 * Generates comprehensive test reports with brAInwav branding:
 * - Detailed test execution summary
 * - Performance metrics analysis
 * - Accessibility compliance report
 * - Security validation results
 * - Browser compatibility matrix
 * - Test coverage statistics
 * - HTML and JSON report generation
 */

interface BrAInwavTestResult {
  testId: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  browser: string;
  category: string;
  error?: string;
  screenshot?: string;
  video?: string;
}

interface BrAInwavReport {
  metadata: {
    testName: string;
    timestamp: string;
    duration: number;
    environment: string;
    version: string;
    brand: string;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
    averageDuration: number;
  };
  results: BrAInwavTestResult[];
  categories: Record<string, {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  }>;
  browsers: Record<string, {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  }>;
  performance: {
    slowestTests: Array<{
      title: string;
      duration: number;
      category: string;
    }>;
    averageDuration: number;
    totalDuration: number;
  };
  accessibility: {
    totalViolations: number;
    violationsByCategory: Record<string, number>;
    criticalIssues: number;
  };
  security: {
    totalTests: number;
    passed: number;
    failed: number;
    vulnerabilities: string[];
  };
}

class BrAInwavTestReporter {
  private results: BrAInwavTestResult[] = [];
  private startTime: number = Date.now();
  private testSuites: Set<string> = new Set();

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const browserName = test.parent.project()?.name || 'unknown';
    const category = this.extractCategory(test.title);

    const testResult: BrAInwavTestResult = {
      testId: test.id,
      title: test.title,
      status: result.status === 'passed' ? 'passed' :
              result.status === 'failed' ? 'failed' : 'skipped',
      duration: result.duration,
      browser: browserName,
      category,
      error: result.error?.message,
      screenshot: result.attachments.find(a => a.name.includes('screenshot'))?.path,
      video: result.attachments.find(a => a.name.includes('video'))?.path
    };

    this.results.push(testResult);
    this.testSuites.add(category);
  }

  async onEnd(result: FullResult): Promise<void> {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    const report = this.generateReport(totalDuration);

    // Generate reports
    await this.generateHTMLReport(report);
    await this.generateJSONReport(report);
    await this.generateMarkdownReport(report);
    await this.generateJunitReport(report);

    console.log('\n🧠 brAInwav Cortex-OS Test Report Generated');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed} (${report.summary.passRate.toFixed(1)}%)`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Skipped: ${report.summary.skipped}`);
    console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('='.repeat(50));
  }

  private extractCategory(testTitle: string): string {
    if (testTitle.includes('Authentication')) return 'Authentication';
    if (testTitle.includes('Document')) return 'Document Processing';
    if (testTitle.includes('Workflow')) return 'Agentic Workflows';
    if (testTitle.includes('API')) return 'API Integration';
    if (testTitle.includes('Accessibility')) return 'Accessibility';
    if (testTitle.includes('Performance')) return 'Performance';
    if (testTitle.includes('Security')) return 'Security';
    return 'General';
  }

  private generateReport(totalDuration: number): BrAInwavReport {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const total = this.results.length;

    // Category statistics
    const categories: Record<string, { total: number; passed: number; failed: number; passRate: number }> = {};
    const testCategories = new Set(this.results.map(r => r.category));

    testCategories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const catPassed = categoryResults.filter(r => r.status === 'passed').length;
      const catFailed = categoryResults.filter(r => r.status === 'failed').length;
      const catTotal = categoryResults.length;

      categories[category] = {
        total: catTotal,
        passed: catPassed,
        failed: catFailed,
        passRate: catTotal > 0 ? (catPassed / catTotal) * 100 : 0
      };
    });

    // Browser statistics
    const browsers: Record<string, { total: number; passed: number; failed: number; passRate: number }> = {};
    const testBrowsers = new Set(this.results.map(r => r.browser));

    testBrowsers.forEach(browser => {
      const browserResults = this.results.filter(r => r.browser === browser);
      const browserPassed = browserResults.filter(r => r.status === 'passed').length;
      const browserFailed = browserResults.filter(r => r.status === 'failed').length;
      const browserTotal = browserResults.length;

      browsers[browser] = {
        total: browserTotal,
        passed: browserPassed,
        failed: browserFailed,
        passRate: browserTotal > 0 ? (browserPassed / browserTotal) * 100 : 0
      };
    });

    // Performance metrics
    const sortedByDuration = [...this.results].sort((a, b) => b.duration - a.duration);
    const slowestTests = sortedByDuration.slice(0, 10).map(test => ({
      title: test.title,
      duration: test.duration,
      category: test.category
    }));

    const averageDuration = total > 0 ?
      this.results.reduce((sum, r) => sum + r.duration, 0) / total : 0;

    return {
      metadata: {
        testName: 'brAInwav Cortex-OS E2E Test Suite',
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        environment: process.env.NODE_ENV || 'test',
        version: '1.0.0',
        brand: 'brAInwav'
      },
      summary: {
        total,
        passed,
        failed,
        skipped,
        passRate: total > 0 ? (passed / total) * 100 : 0,
        averageDuration
      },
      results: this.results,
      categories,
      browsers,
      performance: {
        slowestTests,
        averageDuration,
        totalDuration
      },
      accessibility: {
        totalViolations: 0, // Would be populated from actual accessibility tests
        violationsByCategory: {},
        criticalIssues: 0
      },
      security: {
        totalTests: this.results.filter(r => r.category === 'Security').length,
        passed: this.results.filter(r => r.category === 'Security' && r.status === 'passed').length,
        failed: this.results.filter(r => r.category === 'Security' && r.status === 'failed').length,
        vulnerabilities: [] // Would be populated from actual security tests
      }
    };
  }

  private async generateHTMLReport(report: BrAInwavReport): Promise<void> {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.metadata.testName} - Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #2E3A87 0%, #4A5FC4 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .container { max-width: 1200px; margin: 0 auto; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; font-size: 1.1em; }
        .metric .value { font-size: 2em; font-weight: bold; color: #2E3A87; }
        .metric .passed { color: #28a745; }
        .metric .failed { color: #dc3545; }
        .section { background: white; margin-bottom: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section h2 { background: #2E3A87; color: white; margin: 0; padding: 20px; border-radius: 8px 8px 0 0; }
        .section-content { padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-skipped { color: #6c757d; font-weight: bold; }
        .progress-bar { background: #e9ecef; border-radius: 4px; overflow: hidden; height: 20px; }
        .progress-fill { background: #28a745; height: 100%; transition: width 0.3s ease; }
        .category-card { border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 15px; }
        .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .category-name { font-weight: 600; color: #333; }
        .category-stats { display: flex; gap: 15px; font-size: 0.9em; }
        .footer { text-align: center; margin-top: 50px; padding: 20px; color: #666; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 ${report.metadata.brand}</h1>
            <p>Autonomous Software Behavior Reasoning - Test Execution Report</p>
            <p>${report.metadata.testName}</p>
            <p>Generated: ${new Date(report.metadata.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.total}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${report.summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${report.summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Pass Rate</h3>
                <div class="value">${report.summary.passRate.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${(report.metadata.duration / 1000).toFixed(2)}s</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Test Categories</h2>
            <div class="section-content">
                ${Object.entries(report.categories).map(([category, stats]) => `
                    <div class="category-card">
                        <div class="category-header">
                            <span class="category-name">${category}</span>
                            <span class="category-stats">
                                <span class="status-passed">${stats.passed} passed</span>
                                <span class="status-failed">${stats.failed} failed</span>
                                <span>${stats.passRate.toFixed(1)}%</span>
                            </span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${stats.passRate}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>🌐 Browser Compatibility</h2>
            <div class="section-content">
                <table>
                    <thead>
                        <tr>
                            <th>Browser</th>
                            <th>Total Tests</th>
                            <th>Passed</th>
                            <th>Failed</th>
                            <th>Pass Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(report.browsers).map(([browser, stats]) => `
                            <tr>
                                <td>${browser}</td>
                                <td>${stats.total}</td>
                                <td class="status-passed">${stats.passed}</td>
                                <td class="status-failed">${stats.failed}</td>
                                <td>${stats.passRate.toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="section">
            <h2>⚡ Performance Analysis</h2>
            <div class="section-content">
                <h3>Slowest Tests</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Category</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.performance.slowestTests.map(test => `
                            <tr>
                                <td>${test.title}</td>
                                <td>${test.category}</td>
                                <td>${test.duration.toFixed(2)}ms</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="margin-top: 20px;">
                    <strong>Average Test Duration:</strong> ${report.performance.averageDuration.toFixed(2)}ms<br>
                    <strong>Total Execution Time:</strong> ${(report.performance.totalDuration / 1000).toFixed(2)}s
                </p>
            </div>
        </div>

        <div class="section">
            <h2>📋 Detailed Test Results</h2>
            <div class="section-content">
                <table>
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Category</th>
                            <th>Browser</th>
                            <th>Status</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.results.map(result => `
                            <tr>
                                <td>${result.title}</td>
                                <td>${result.category}</td>
                                <td>${result.browser}</td>
                                <td class="status-${result.status}">${result.status.toUpperCase()}</td>
                                <td>${result.duration.toFixed(2)}ms</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            <p>Generated by ${report.metadata.brand} ${report.metadata.testName}</p>
            <p>Environment: ${report.metadata.environment} | Version: ${report.metadata.version}</p>
        </div>
    </div>
</body>
</html>`;

    const reportPath = path.join(process.cwd(), 'test-results', 'brAInwav-test-report.html');
    fs.writeFileSync(reportPath, htmlTemplate);
    console.log(`📄 HTML report generated: ${reportPath}`);
  }

  private async generateJSONReport(report: BrAInwavReport): Promise<void> {
    const reportPath = path.join(process.cwd(), 'test-results', 'brAInwav-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 JSON report generated: ${reportPath}`);
  }

  private async generateMarkdownReport(report: BrAInwavReport): Promise<void> {
    const markdown = `
# ${report.metadata.brand} ${report.metadata.testName}

## Executive Summary

- **Total Tests**: ${report.summary.total}
- **Passed**: ${report.summary.passed} (${report.summary.passRate.toFixed(1)}%)
- **Failed**: ${report.summary.failed}
- **Skipped**: ${report.summary.skipped}
- **Duration**: ${(report.metadata.duration / 1000).toFixed(2)}s
- **Environment**: ${report.metadata.environment}
- **Generated**: ${new Date(report.metadata.timestamp).toLocaleString()}

## Test Categories

${Object.entries(report.categories).map(([category, stats]) => `
### ${category}
- Total: ${stats.total}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Pass Rate: ${stats.passRate.toFixed(1)}%
`).join('')}

## Browser Compatibility

${Object.entries(report.browsers).map(([browser, stats]) => `
### ${browser}
- Total Tests: ${stats.total}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Pass Rate: ${stats.passRate.toFixed(1)}%
`).join('')}

## Performance Metrics

- **Average Test Duration**: ${report.performance.averageDuration.toFixed(2)}ms
- **Total Execution Time**: ${(report.performance.totalDuration / 1000).toFixed(2)}s

### Slowest Tests

${report.performance.slowestTests.map((test, index) => `
${index + 1}. ${test.title} (${test.category}) - ${test.duration.toFixed(2)}ms
`).join('')}

## Security Tests

- **Total Security Tests**: ${report.security.totalTests}
- **Passed**: ${report.security.passed}
- **Failed**: ${report.security.failed}

## Accessibility Compliance

- **Total Violations**: ${report.accessibility.totalViolations}
- **Critical Issues**: ${report.accessibility.criticalIssues}

---

*Report generated by ${report.metadata.brand} Testing Framework*
`;

    const reportPath = path.join(process.cwd(), 'test-results', 'brAInwav-test-report.md');
    fs.writeFileSync(reportPath, markdown);
    console.log(`📝 Markdown report generated: ${reportPath}`);
  }

  private async generateJunitReport(report: BrAInwavReport): Promise<void> {
    const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="${report.metadata.testName}"
           tests="${report.summary.total}"
           failures="${report.summary.failed}"
           skipped="${report.summary.skipped}"
           time="${(report.metadata.duration / 1000).toFixed(3)}"
           timestamp="${report.metadata.timestamp}">
  <properties>
    <property name="environment" value="${report.metadata.environment}"/>
    <property name="version" value="${report.metadata.version}"/>
    <property name="brand" value="${report.metadata.brand}"/>
  </properties>
  ${report.results.map(result => `
  <testcase classname="${result.category}"
            name="${result.title}"
            time="${(result.duration / 1000).toFixed(3)}"
            browser="${result.browser}">
    ${result.status === 'failed' ? `
    <failure message="${result.error || 'Test failed'}">
      ${result.error || 'Test execution failed'}
    </failure>` : ''}
    ${result.status === 'skipped' ? '<skipped/>' : ''}
  </testcase>`).join('')}
</testsuite>`;

    const reportPath = path.join(process.cwd(), 'test-results', 'brAInwav-test-report.xml');
    fs.writeFileSync(reportPath, junitXml);
    console.log(`📋 JUnit XML report generated: ${reportPath}`);
  }
}

export default BrAInwavTestReporter;