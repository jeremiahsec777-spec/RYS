import React from 'react';
import { render } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import BubblesScreen from './BubblesScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureDetector: ({ children }: any) => <View>{children}</View>,
    Gesture: { Pan: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }
  };
});

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => <>{children}</>,
}));

jest.mock('../components/GlassContainer', () => ({
  GlassContainer: ({ children }: any) => <>{children}</>,
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    useSharedValue: jest.fn((v) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn((v) => v),
    runOnJS: jest.fn((fn) => fn),
    __esModule: true,
    default: {
      View: View,
    }
  };
});

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: { createAsync: jest.fn() },
    Sound: { createAsync: jest.fn() },
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  documentDirectory: 'file://document/dir/',
}));

jest.mock('../store/useStore', () => ({
  useStore: jest.fn(),
}));

jest.mock('whisper.rn', () => ({
  initWhisper: jest.fn(),
}), { virtual: true });

describe('BubblesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as unknown as jest.Mock).mockReturnValue({
      categories: [{ name: 'General', x: 50, y: 100, color: '#FF3B30' }],
      notes: [],
      addNote: jest.fn(),
      geminiApiKey: 'test-key',
      whisperModel: 'none',
      categorizationKeyword: 'Cocoon',
      updateCategoryPosition: jest.fn()
    });
  });

  it('renders correctly', () => {
    const { getByText } = render(<BubblesScreen />);
    expect(getByText('Cocoon')).toBeTruthy();
    expect(getByText('General')).toBeTruthy();
  });
});
