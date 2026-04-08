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

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

jest.mock('expo-modules-core', () => {
  return {
    NativeModulesProxy: {},
    requireNativeViewManager: jest.fn(),
    requireNativeModule: jest.fn().mockReturnValue({
      setValueWithKeyAsync: jest.fn(),
      getItemAsync: jest.fn(),
      deleteItemAsync: jest.fn(),
    }),
    EventEmitter: jest.fn(),
    CodedError: jest.fn(),
  };
});

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
