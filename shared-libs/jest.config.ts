import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/projects/**/*.spec.ts'],
  collectCoverageFrom: ['projects/**/*.ts', '!projects/**/*.spec.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|html)$': 'jest-preset-angular'
  }
};

export default config;
