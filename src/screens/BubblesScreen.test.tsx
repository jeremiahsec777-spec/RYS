import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import BubblesScreen from './BubblesScreen';

// Mock dependencies
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('../components/GlassContainer', () => ({
  GlassContainer: ({ children }: any) => children,
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    setAudioModeAsync: jest.fn(),
    Recording: {
      createAsync: jest.fn().mockResolvedValue({ recording: { getURI: () => 'file://test.m4a', stopAndUnloadAsync: jest.fn() } }),
    },
    Sound: {
      createAsync: jest.fn(),
    },
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
    },
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 0, longitude: 0 } }),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  documentDirectory: 'file://docDir/',
}));

jest.mock('whisper.rn', () => ({
  __esModule: true,
  initWhisper: jest.fn().mockResolvedValue({
    transcribe: jest.fn().mockReturnValue({ promise: Promise.resolve({ result: 'transcription' }) }),
    release: jest.fn(),
  }),
}), { virtual: true });

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({ response: { text: () => 'gemini transcription' } }),
    }),
  })),
}));

jest.mock('../store/useStore', () => ({
  useStore: () => ({
    notes: [
      {
        id: '1',
        text: 'Test Note',
        audioUri: 'file://test.m4a',
        category: 'General',
        timestamp: 1600000000000,
      },
      {
        id: '2',
        text: 'Invalid Note',
        audioUri: 'http://test.m4a',
        category: 'General',
        timestamp: 1600000000000,
      }
    ],
    addNote: jest.fn(),
    geminiApiKey: 'test-key',
    whisperModel: 'none',
  }),
}));

jest.spyOn(Alert, 'alert');
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('BubblesScreen - Play Sound', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully play a sound with a valid file:// URI', async () => {
    const mockPlayAsync = jest.fn();
    const mockSetOnPlaybackStatusUpdate = jest.fn();
    const mockUnloadAsync = jest.fn();

    (Audio.Sound.createAsync as jest.Mock).mockResolvedValueOnce({
      sound: {
        playAsync: mockPlayAsync,
        setOnPlaybackStatusUpdate: mockSetOnPlaybackStatusUpdate,
        unloadAsync: mockUnloadAsync,
      },
    });

    const { getAllByText } = render(<BubblesScreen />);

    const playButtons = getAllByText('▶ Play');
    // First button corresponds to valid Note ('file://test.m4a')
    fireEvent.press(playButtons[0]);

    await waitFor(() => {
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith({ uri: 'file://test.m4a' });
      expect(mockPlayAsync).toHaveBeenCalled();
      expect(mockSetOnPlaybackStatusUpdate).toHaveBeenCalled();
    });

    // Test the cleanup callback
    const statusCallback = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];

    // Simulate didJustFinish
    statusCallback({ isLoaded: true, didJustFinish: true });

    expect(mockUnloadAsync).toHaveBeenCalled();
  });

  it('should unload sound when playback finishes', async () => {
    const mockPlayAsync = jest.fn();
    const mockSetOnPlaybackStatusUpdate = jest.fn();
    const mockUnloadAsync = jest.fn();

    const mockSound = {
      playAsync: mockPlayAsync,
      setOnPlaybackStatusUpdate: mockSetOnPlaybackStatusUpdate,
      unloadAsync: mockUnloadAsync,
    };

    (Audio.Sound.createAsync as jest.Mock).mockResolvedValueOnce({
      sound: mockSound,
    });

    const { getAllByText } = render(<BubblesScreen />);
    const playButtons = getAllByText('▶ Play');
    fireEvent.press(playButtons[0]);

    await waitFor(() => {
      expect(mockSetOnPlaybackStatusUpdate).toHaveBeenCalled();
    });

    // Simulate status update
    const statusCallback = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];
    statusCallback({ isLoaded: true, didJustFinish: true });

    expect(mockUnloadAsync).toHaveBeenCalled();
  });

  it('should show alert and log error when Audio.Sound.createAsync fails', async () => {
    const error = new Error('Create sound failed');
    (Audio.Sound.createAsync as jest.Mock).mockRejectedValueOnce(error);

    const { getAllByText } = render(<BubblesScreen />);

    const playButtons = getAllByText('▶ Play');
    fireEvent.press(playButtons[0]);

    await waitFor(() => {
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith({ uri: 'file://test.m4a' });
      expect(console.error).toHaveBeenCalledWith('Failed to play sound', error);
      expect(Alert.alert).toHaveBeenCalledWith('Playback Failed', 'Could not play the recorded audio.');
    });
  });

  it('should reject playback if URI does not start with file://', async () => {
    const { getAllByText } = render(<BubblesScreen />);

    const playButtons = getAllByText('▶ Play');
    // Second button corresponds to invalid Note ('http://test.m4a')
    fireEvent.press(playButtons[1]);

    await waitFor(() => {
      expect(Audio.Sound.createAsync).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Invalid audio URI: must be a local file path');
      expect(Alert.alert).toHaveBeenCalledWith('Playback Failed', 'Invalid audio source.');
    });
  });
});
