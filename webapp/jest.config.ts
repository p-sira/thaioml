import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/apm_modules/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/apm_modules/'],
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
const resolveConfig = createJestConfig(config);
const jestConfig = async () => {
  const resolved = await resolveConfig();
  // The Markdown visitor packages are ESM; transform them for Jest's CJS runtime.
  resolved.transformIgnorePatterns = resolved.transformIgnorePatterns?.map(pattern =>
    pattern.includes('node_modules')
      ? `(?!.*node_modules/(?:unist-util-visit|unist-util-visit-parents|unist-util-is)/)${pattern}`
      : pattern,
  );
  return resolved;
};

export default jestConfig;
