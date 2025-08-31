export default {
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    passWithNoTests: true,
    environment: 'node',
  },
};
