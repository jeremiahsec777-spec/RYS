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

jest.mock('react-native-worklets-core', () => {
  return {
    Worklets: {
      createRunInJSFn: jest.fn(),
      createRunInContextFn: jest.fn(),
      defaultContext: {},
      currentContext: {},
    }
  };
});
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn((v) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn((v) => v),
    runOnJS: jest.fn((fn) => fn),
    createAnimatedComponent: jest.fn((component) => component),
    default: {
      View: require('react-native').View,
      Text: require('react-native').Text,
      Image: require('react-native').Image,
      ScrollView: require('react-native').ScrollView,
      createAnimatedComponent: jest.fn((component) => component),
    }
  };
});
jest.mock('react-native-worklets', () => {
  return {};
});

jest.mock('expo-file-system', () => {
  return {
    documentDirectory: 'file://mock/document/dir/',
    cacheDirectory: 'file://mock/cache/dir/',
    readAsStringAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    deleteAsync: jest.fn(),
    getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
    makeDirectoryAsync: jest.fn(),
    downloadAsync: jest.fn(),
  };
});
