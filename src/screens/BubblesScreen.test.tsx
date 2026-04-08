import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import BubblesScreen from './BubblesScreen';
import { useStore } from '../store/useStore';

// Mock dependencies
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: {
      createAsync: jest.fn(),
    },
    Sound: {
      createAsync: jest.fn(),
    },
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

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => <>{children}</>,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => <>{children}</>,
}));

describe('BubblesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles sound playback failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock store to provide a note with an audio uri
    (useStore as unknown as jest.Mock).mockReturnValue({
      notes: [
        {
          id: '1',
          text: 'Test note',
          audioUri: 'file://test/audio.m4a',
          category: 'General',
          timestamp: 123456789,
        },
      ],
      addNote: jest.fn(),
      geminiApiKey: 'test-key',
      whisperModel: 'none',
    });

    // Mock Audio.Sound.createAsync to throw an error
    const testError = new Error('Test playback error');
    (Audio.Sound.createAsync as jest.Mock).mockRejectedValue(testError);

    const { getByText } = render(<BubblesScreen />);

    // Find and press the play button
    const playButton = getByText('▶ Play');
    fireEvent.press(playButton);

    // Wait for the async playback to fail and handle error
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to play sound', testError);
      expect(Alert.alert).toHaveBeenCalledWith('Playback Failed', 'Could not play the recorded audio.');
    });
  });
});
