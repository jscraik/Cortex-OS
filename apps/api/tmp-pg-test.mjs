import { PostgreSqlContainer } from '@testcontainers/postgresql';

const container = await new PostgreSqlContainer('postgres:13.3-alpine')
	.withDatabase('auth_db')
	.withUsername('auth_user')
	.withPassword('auth_pass')
	.start();

console.log('started', container.getConnectionUri());
await container.stop();
console.log('stopped');
