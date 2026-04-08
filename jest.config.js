const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset({ tsconfig: 'tsconfig.test.json', diagnostics: false }).transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^expo/src/winter/runtime\\.native$": "<rootDir>/jest.setup.js",
    "^expo/src/winter/runtime\\.native\\.ts$": "<rootDir>/jest.setup.js"
  }
};
