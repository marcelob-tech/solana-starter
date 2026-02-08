module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  roots: ["<rootDir>"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  collectCoverageFrom: [
    "cluster1/vault_init.ts",
    "cluster1/vault_deposit.ts",
    "cluster1/vault_deposit_spl.ts",
    "cluster1/vault_withdraw.ts",
    "cluster1/vault_withdraw_spl.ts",
    "cluster1/vault_deposit_nft.ts",
    "cluster1/vault_withdraw_nft.ts",
    "cluster1/vault_close.ts",
    "cluster1/vault_close_workflow.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
