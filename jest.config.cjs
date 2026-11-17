module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/lib/__tests__/*.test.ts"],
  transform: { "^.+\\.tsx?$": "<rootDir>/test/typescript-transform.cjs" },
};
