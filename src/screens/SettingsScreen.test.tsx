import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from './SettingsScreen';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../store/useStore';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('../components/GlassContainer', () => ({
  GlassContainer: ({ children }: any) => children,
}));

jest.mock('../store/useStore', () => ({
  useStore: jest.fn(),
}));

describe('SettingsScreen Import', () => {
  const mockImportNotes = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as unknown as jest.Mock).mockReturnValue({
      geminiApiKey: '',
      setGeminiApiKey: jest.fn(),
      whisperModel: 'tiny',
      setWhisperModel: jest.fn(),
      notes: [],
      importNotes: mockImportNotes,
    });
    jest.spyOn(Alert, 'alert');
  });

  it('imports valid JSON array correctly', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://mock/path.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(JSON.stringify([{ id: '1', text: 'test', category: 'test', timestamp: 123 }]));

    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Import Data'));

    await waitFor(() => {
      expect(mockImportNotes).toHaveBeenCalledWith([{ id: '1', text: 'test', category: 'test', timestamp: 123 }]);
      expect(Alert.alert).toHaveBeenCalledWith('Imported', 'Data imported successfully.');
    });
  });

  it('fails to import non-array JSON data', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://mock/path.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(JSON.stringify({ id: '1', text: 'test' }));

    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Import Data'));

    await waitFor(() => {
      expect(mockImportNotes).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Import Failed', 'Invalid data format.');
    });
  });

  it('handles invalid JSON string', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://mock/path.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('invalid json');

    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Import Data'));

    await waitFor(() => {
      expect(mockImportNotes).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Import Failed', expect.stringContaining('SyntaxError'));
    });
  });

  it('does nothing if import is canceled', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: true,
    });

    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Import Data'));

    await waitFor(() => {
      expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
      expect(mockImportNotes).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});
