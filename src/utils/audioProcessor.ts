import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
