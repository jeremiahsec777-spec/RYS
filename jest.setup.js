jest.mock('expo', () => ({
  __esModule: true,
  default: {},
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
