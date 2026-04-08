jest.mock('expo', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {},
  requireNativeModule: jest.fn(() => ({})),
  requireNativeViewManager: jest.fn(() => ({})),
}));

// This line usually fixes the specific Expo winter runtime error in Jest
global.__expo_winter_installGlobal = false;
