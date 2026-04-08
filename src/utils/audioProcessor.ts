import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initWhisper } from 'whisper.rn';

export const processAudioWithGemini = async (uri: string, geminiApiKey: string): Promise<string> => {
  if (!geminiApiKey) throw new Error("Gemini API key is not set");
  const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = "Please transcribe this audio accurately.";
  const audioPart = { inlineData: { data: base64Audio, mimeType: "audio/m4a" } };
  const result = await model.generateContent([prompt, audioPart]);
  return result.response.text();
};

export const processAudioWithWhisper = async (uri: string, whisperModel: string): Promise<string> => {
  if (whisperModel === 'none' || !whisperModel) {
    throw new Error("No offline model selected.");
  }

  // Need to cast FileSystem to access documentDirectory cleanly in older expo versions vs modern types
  const fs = FileSystem as unknown as { documentDirectory: string | null };
  const documentDirectory = fs.documentDirectory;

  if (!documentDirectory) {
    throw new Error("Document directory is not available");
  }

  const modelPath = documentDirectory + `ggml-${whisperModel}.bin`;
  const fileInfo = await FileSystem.getInfoAsync(modelPath);

  if (!fileInfo.exists) {
    throw new Error(`Whisper model ${whisperModel} not found. Please download it in settings.`);
  }

  // Initialize whisper context with the local model file
  const whisperContext = await initWhisper({ filePath: modelPath });

  // Note: expo-av records in standard formats which usually whisper.rn handles directly via ffmpeg decoding bindings.
  // We pass the local URI. The transcription runs entirely ON-DEVICE, meaning zero network calls.
  const { promise } = whisperContext.transcribe(uri, {
      language: 'en',
      maxLen: 1,
      tokenTimestamps: true
  });

  const result = await promise;

  // Clean up whisper context immediately to free memory
  await whisperContext.release();

  return result.result;
};
