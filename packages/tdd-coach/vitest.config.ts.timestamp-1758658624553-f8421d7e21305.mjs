// vitest.config.ts
import { resolve } from 'node:path';
import tsconfigPaths from 'file:///Users/jamiecraik/.Cortex-OS/node_modules/.pnpm/vite-tsconfig-paths@5.1.4_typescript@5.9.2_vite@7.1.5_@types+node@22.18.1_jiti@2.5.1_le_6bf67ef1cadebafb04a4d58a7cff2970/node_modules/vite-tsconfig-paths/dist/index.js';
import { defineConfig } from 'file:///Users/jamiecraik/.Cortex-OS/node_modules/.pnpm/vitest@2.1.9_@types+node@22.18.1_jsdom@26.1.0_less@4.4.1_lightningcss@1.30.1_msw@2.11.3_9a0ff8328e24ba06a9cd59a852b08a59/node_modules/vitest/dist/config.js';
var __vite_injected_original_dirname = '/Users/jamiecraik/.Cortex-OS/packages/tdd-coach';
var vitest_config_default = defineConfig({
	plugins: [tsconfigPaths({ projects: ['../../tsconfig.json'] })],
	test: {
		globals: true,
		environment: 'node',
		include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
		exclude: ['node_modules', 'dist'],
	},
	resolve: {
		alias: {
			'@': './src',
			'@cortex-os/a2a-core': resolve(__vite_injected_original_dirname, '../a2a/a2a-core/src'),
			'@cortex-os/a2a-contracts': resolve(
				__vite_injected_original_dirname,
				'../a2a/a2a-contracts/src',
			),
			'@cortex-os/a2a-transport': resolve(
				__vite_injected_original_dirname,
				'../a2a/a2a-transport/src',
			),
			'@cortex-os/contracts': resolve(
				__vite_injected_original_dirname,
				'../../libs/typescript/contracts/src/index.ts',
			),
		},
	},
});
export { vitest_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9qYW1pZWNyYWlrLy5Db3J0ZXgtT1MvcGFja2FnZXMvdGRkLWNvYWNoXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvamFtaWVjcmFpay8uQ29ydGV4LU9TL3BhY2thZ2VzL3RkZC1jb2FjaC92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9qYW1pZWNyYWlrLy5Db3J0ZXgtT1MvcGFja2FnZXMvdGRkLWNvYWNoL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gJ3ZpdGUtdHNjb25maWctcGF0aHMnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG5cdHBsdWdpbnM6IFt0c2NvbmZpZ1BhdGhzKHsgcHJvamVjdHM6IFsnLi4vLi4vdHNjb25maWcuanNvbiddIH0pXSxcblx0dGVzdDoge1xuXHRcdGdsb2JhbHM6IHRydWUsXG5cdFx0ZW52aXJvbm1lbnQ6ICdub2RlJyxcblx0XHRpbmNsdWRlOiBbJ19fdGVzdHNfXy8qKi8qLnRlc3QudHMnLCAnc3JjLyoqLyoudGVzdC50cyddLFxuXHRcdGV4Y2x1ZGU6IFsnbm9kZV9tb2R1bGVzJywgJ2Rpc3QnXSxcblx0fSxcblx0cmVzb2x2ZToge1xuXHRcdGFsaWFzOiB7XG5cdFx0XHQnQCc6ICcuL3NyYycsXG5cdFx0XHQnQGNvcnRleC1vcy9hMmEtY29yZSc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vYTJhL2EyYS1jb3JlL3NyYycpLFxuXHRcdFx0J0Bjb3J0ZXgtb3MvYTJhLWNvbnRyYWN0cyc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vYTJhL2EyYS1jb250cmFjdHMvc3JjJyksXG5cdFx0XHQnQGNvcnRleC1vcy9hMmEtdHJhbnNwb3J0JzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9hMmEvYTJhLXRyYW5zcG9ydC9zcmMnKSxcblx0XHRcdCdAY29ydGV4LW9zL2NvbnRyYWN0cyc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vbGlicy90eXBlc2NyaXB0L2NvbnRyYWN0cy9zcmMvaW5kZXgudHMnKSxcblx0XHR9LFxuXHR9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1VLFNBQVMsZUFBZTtBQUMzVixPQUFPLG1CQUFtQjtBQUMxQixTQUFTLG9CQUFvQjtBQUY3QixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMzQixTQUFTLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUM7QUFBQSxFQUM5RCxNQUFNO0FBQUEsSUFDTCxTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixTQUFTLENBQUMsMEJBQTBCLGtCQUFrQjtBQUFBLElBQ3RELFNBQVMsQ0FBQyxnQkFBZ0IsTUFBTTtBQUFBLEVBQ2pDO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUixPQUFPO0FBQUEsTUFDTixLQUFLO0FBQUEsTUFDTCx1QkFBdUIsUUFBUSxrQ0FBVyxxQkFBcUI7QUFBQSxNQUMvRCw0QkFBNEIsUUFBUSxrQ0FBVywwQkFBMEI7QUFBQSxNQUN6RSw0QkFBNEIsUUFBUSxrQ0FBVywwQkFBMEI7QUFBQSxNQUN6RSx3QkFBd0IsUUFBUSxrQ0FBVyw4Q0FBOEM7QUFBQSxJQUMxRjtBQUFBLEVBQ0Q7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
