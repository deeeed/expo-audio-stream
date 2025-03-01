/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/e2e/**/*.test.(js|ts|tsx)'],
  transform: {
    '^.+\\.[jt]sx?$': 'ts-jest',
  },
  testTimeout: 120000,
  // preset: 'jest-expo',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
    },
  },
  maxWorkers: 1,
  verbose: true,
}
