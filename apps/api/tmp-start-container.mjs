import pkg from '@testcontainers/postgresql';

const { PostgreSqlContainer, PostgreSQLContainer } = pkg;

async function main() {
	console.time('start');
	const Ctor = PostgreSqlContainer ?? PostgreSQLContainer;
	if (!Ctor) {
		throw new Error('ctor missing');
	}
	console.timeLog('start', 'constructor ready');
	const container = await new Ctor()
		.withDatabase('auth_db')
		.withUsername('auth_user')
		.withPassword('auth_pass')
		.withStartupTimeout(120_000)
		.start();
	console.timeLog('start', 'container started');
	console.log('started', container.getConnectionUri());
	await container.stop();
	console.timeEnd('start');
}

main().catch((error) => {
	console.error('script error', error);
	process.exitCode = 1;
});
