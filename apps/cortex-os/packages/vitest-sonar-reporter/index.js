import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';

const REPORTER_NAME = 'vitest-sonar-reporter';

const toArray = (value) => {
	if (!value) {
		return [];
	}

	if (Array.isArray(value)) {
		return value;
	}

	if (typeof value.values === 'function') {
		return Array.from(value.values());
	}

	return [];
};

const normalizeTests = (file) => {
	const tests = toArray(file?.result?.tests ?? file?.tasks ?? file?.result?.testResults);
	return tests
		.map((test) => {
			const name = test?.name || test?.task?.name || 'unnamed-test';
			const duration = Number(test?.result?.duration ?? test?.duration ?? 0) || 0;
			const state = test?.result?.state || test?.state || 'unknown';
			const errors = toArray(test?.result?.errors ?? test?.errors ?? []);

			return {
				name,
				duration,
				state,
				errors,
			};
		})
		.filter(Boolean);
};

const buildSonarXml = (files) => {
	const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<testExecutions version="1">'];

	for (const file of files) {
		const path = file?.filepath || file?.file?.path || file?.filepathRelative || 'unknown';
		const tests = normalizeTests(file);

		if (!tests.length) {
			continue;
		}

		lines.push(`  <file path="${path}">`);

		for (const test of tests) {
			const durationSeconds = (test.duration / 1000).toFixed(3);
			lines.push(`    <testCase name="${escapeXml(test.name)}" duration="${durationSeconds}">`);

			if (test.state === 'fail' || test.state === 'failed') {
				const error = test.errors[0];
				const message = escapeXml(error?.message || 'Test failed');
				const details = escapeXml(error?.stack || error?.message || '');
				lines.push(`      <failure message="${message}">${details}</failure>`);
			}

			if (test.state === 'skip' || test.state === 'skipped' || test.state === 'todo') {
				lines.push('      <skipped />');
			}

			lines.push('    </testCase>');
		}

		lines.push('  </file>');
	}

	lines.push('</testExecutions>');
	return lines.join('\n');
};

const escapeXml = (value) => {
	if (!value) {
		return '';
	}

	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
};

export default function vitestSonarReporter() {
	let ctx;

	return {
		getName() {
			return REPORTER_NAME;
		},

		onInit(context) {
			ctx = context;
		},

		async onFinished() {
			try {
				const outputFile = ctx?.config?.outputFile?.[REPORTER_NAME];
				if (!outputFile) {
					return;
				}

				const files = toArray(ctx?.state?.files);
				const xml = buildSonarXml(files);
				const target = resolve(ctx.config.root || process.cwd(), outputFile);

				await fs.mkdir(dirname(target), { recursive: true });
				await fs.writeFile(target, xml, 'utf8');
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('vitest-sonar-reporter failed to write report', error);
			}
		},
	};
}
