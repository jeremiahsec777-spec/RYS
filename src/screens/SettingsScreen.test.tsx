import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import SettingsScreen from './SettingsScreen';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({children}: any) => <>{children}</> }));
jest.mock('../components/GlassContainer', () => ({ GlassContainer: ({children}: any) => <>{children}</> }));
import { useStore } from '../store/useStore';

// Mock dependencies
jest.mock('expo-file-system', () => ({
  get documentDirectory() { return (global as any).__mockDocumentDirectory; },
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn().mockResolvedValue({exists: true}),
  deleteAsync: jest.fn()
}));
jest.mock('expo-sharing');
jest.mock('expo-document-picker');
jest.mock('../store/useStore');
jest.spyOn(Alert, 'alert');

describe('SettingsScreen', () => {
  const mockNotes = [
    { id: '1', text: 'Test note', categoryId: '1',
    categoryName: 'General', timestamp: 1234567890 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as unknown as jest.Mock).mockReturnValue({
      geminiApiKey: '',
      setGeminiApiKey: jest.fn(),
      whisperModel: 'base',
      setWhisperModel: jest.fn(),
      notes: mockNotes,
      importNotes: jest.fn(),
    });
  });

  describe('handleExport', () => {
    it('successfully exports notes', async () => {
      // Mock FileSystem.documentDirectory
      (global as any).__mockDocumentDirectory = 'file://mock/document/dir/';
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValueOnce(undefined);
      (Sharing.shareAsync as jest.Mock).mockResolvedValueOnce(undefined);

      const { getByText } = render(<SettingsScreen />);

      const exportButton = getByText('Export Data');
      fireEvent.press(exportButton);

      await waitFor(() => {
        expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
          'file://mock/document/dir/notes_export.json',
          JSON.stringify(mockNotes),
          { encoding: 'utf8' }
        );
        expect(Sharing.shareAsync).toHaveBeenCalledWith('file://mock/document/dir/notes_export.json');
        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });

    it('shows error alert when documentDirectory is missing', async () => {
      (global as any).__mockDocumentDirectory = null;

      const { getByText } = render(<SettingsScreen />);

      const exportButton = getByText('Export Data');
      fireEvent.press(exportButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Export Failed',
          'Document directory is not available.'
        );
        expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
        expect(Sharing.shareAsync).not.toHaveBeenCalled();
      });
    });

    it('shows error alert when file writing fails', async () => {
      (global as any).__mockDocumentDirectory = 'file://mock/document/dir/';
      (global as any).__mockDocumentDirectory = 'file://mock/document/dir/';
      (FileSystem as any).documentDirectory = 'file://mock/directory/';
      const errorMessage = 'Write error';
      (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const { getByText } = render(<SettingsScreen />);

      const exportButton = getByText('Export Data');
      fireEvent.press(exportButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Export Failed',
          `Error: ${errorMessage}`
        );
        expect(Sharing.shareAsync).not.toHaveBeenCalled();
      });
    });

    it('shows error alert when sharing fails', async () => {
      (FileSystem as any).documentDirectory = 'file://mock/directory/';
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValueOnce(undefined);
      const errorMessage = 'Share error';
      (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const { getByText } = render(<SettingsScreen />);

      const exportButton = getByText('Export Data');
      fireEvent.press(exportButton);

      await waitFor(() => {
        expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Export Failed',
          `Error: ${errorMessage}`
        );
      });
    });
  });
});
