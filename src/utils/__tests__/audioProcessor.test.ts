import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { processAudioWithGemini } from '../audioProcessor';

jest.mock('expo-file-system');
jest.mock('@google/generative-ai');

describe('processAudioWithGemini', () => {
  const mockUri = 'mock-uri';
  const mockApiKey = 'mock-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if Gemini API key is not set', async () => {
    await expect(processAudioWithGemini(mockUri, '')).rejects.toThrow('Gemini API key is not set');
  });

  it('should transcribe audio correctly (happy path)', async () => {
    const mockBase64 = 'mock-base64';
    const mockText = 'Mocked transcription';

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64);

    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => mockText,
      },
    });

    const mockGetGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    const result = await processAudioWithGemini(mockUri, mockApiKey);

    expect(result).toBe(mockText);
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(mockUri, { encoding: 'base64' });
    expect(GoogleGenerativeAI).toHaveBeenCalledWith(mockApiKey);
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-1.5-flash' });
    expect(mockGenerateContent).toHaveBeenCalledWith([
      'Please transcribe this audio accurately.',
      { inlineData: { data: mockBase64, mimeType: 'audio/m4a' } },
    ]);
  });
});
