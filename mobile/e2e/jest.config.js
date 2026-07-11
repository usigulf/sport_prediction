{
  "preset": "jest-expo",
  "testTimeout": 120000,
  "maxWorkers": 1,
  "globalSetup": "detox/runners/jest/globalSetup",
  "globalTeardown": "detox/runners/jest/globalTeardown",
  "reporters": ["detox/runners/jest/reporter"],
  "testEnvironment": "detox/runners/jest/testEnvironment",
  "testMatch": ["<rootDir>/e2e/**/*.e2e.ts"],
  "verbose": true
}
