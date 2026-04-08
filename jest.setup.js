// Pre-read globals to bypass Expo lazy getter bugs in Jest
try { global.structuredClone; } catch (e) {}
try { global.URL; } catch (e) {}
try { global.URLSearchParams; } catch (e) {}
try { global.__ExpoImportMetaRegistry; } catch (e) {}
try { global.TextDecoder; } catch (e) {}
try { global.TextDecoderStream; } catch (e) {}
try { global.TextEncoderStream; } catch (e) {}

jest.mock('expo', () => ({
  __esModule: true,
  default: {},
}));
