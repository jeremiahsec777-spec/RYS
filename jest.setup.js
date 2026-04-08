jest.mock('expo', () => {
  return {
    __esModule: true,
    default: {},
  };
});
globalThis.__ExpoImportMetaRegistry = {};
globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
