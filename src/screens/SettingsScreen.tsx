import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useStore } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system/build/legacy/FileSystem";
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

const WHISPER_MODELS: Record<string, string> = {
  tiny: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  base: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
  small: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  medium: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
};

export default function SettingsScreen() {
  const { geminiApiKey, setGeminiApiKey, whisperModel, setWhisperModel, notes, importNotes, autoCategorize, setAutoCategorize } = useStore();
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [downloading, setDownloading] = useState<string | null>(null);

  const saveApiKey = () => {
    setGeminiApiKey(apiKeyInput);
    Alert.alert('Saved', 'Gemini API Key saved.');
  };

  const handleExport = async () => {
    try {
      const data = JSON.stringify(notes);
      const fileUri = (Paths.document.uri || "" || "") + 'notes_export.json';
      await FileSystem.writeAsStringAsync(fileUri, data, { encoding: 'utf8' });
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert('Export Failed', String(error));
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;
      const fileUri = result.assets[0].uri;
      const data = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });

      const parsedNotes = JSON.parse(data);
      if (Array.isArray(parsedNotes)) {
        importNotes(parsedNotes);
        Alert.alert('Imported', 'Data imported successfully.');
      } else {
        Alert.alert('Import Failed', 'Invalid data format.');
      }
    } catch (error) {
      Alert.alert('Import Failed', String(error));
    }
  };

  const handleDownloadModel = async (model: string) => {
    setDownloading(model);
    try {
      const url = WHISPER_MODELS[model];
      const destUri = (Paths.document.uri || "" || "") + `ggml-${model}.bin`;
      const downloadRes = await FileSystem.downloadAsync(url, destUri);

      if (downloadRes.status === 200) {
        setWhisperModel(model);
        Alert.alert('Success', `${model} model downloaded successfully for offline transcription.`);
      } else {
        throw new Error("Bad status: " + downloadRes.status);
      }
    } catch (error) {
      Alert.alert('Download Failed', String(error));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        <GlassContainer style={styles.section} intensity={60}>
          <Text style={styles.sectionTitle}>Gemini API Key (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter API Key"
            placeholderTextColor="#8E8E93"
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={saveApiKey}>
            <Text style={styles.buttonText}>Save Key</Text>
          </TouchableOpacity>
        </GlassContainer>

        <GlassContainer style={styles.section} intensity={60}>
          <Text style={styles.sectionTitle}>Smart Features</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-Categorize with Voice/AI</Text>
            <Switch
              value={autoCategorize}
              onValueChange={setAutoCategorize}
              trackColor={{ false: '#767577', true: '#34C759' }}
            />
          </View>
        </GlassContainer>

        <GlassContainer style={styles.section} intensity={60}>
          <Text style={styles.sectionTitle}>Whisper Models (Offline)</Text>
          <Text style={styles.currentModel}>Current: {whisperModel}</Text>
          <View style={styles.row}>
            {['tiny', 'base', 'small', 'medium'].map(model => (
              <TouchableOpacity
                key={model}
                style={[styles.modelButton, downloading === model && { opacity: 0.5 }]}
                onPress={() => handleDownloadModel(model)}
                disabled={downloading !== null}
              >
                {downloading === model ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>{model}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </GlassContainer>

        <GlassContainer style={styles.section} intensity={60}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.flexButton]} onPress={handleExport}>
              <Text style={styles.buttonText}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.flexButton, { marginLeft: 10 }]} onPress={handleImport}>
              <Text style={styles.buttonText}>Import Data</Text>
            </TouchableOpacity>
          </View>
        </GlassContainer>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // deep black background to make glass pop
  },
  scrollContent: {
    paddingBottom: 100, // accommodate transparent tab bar
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  currentModel: {
    color: '#8E8E93',
    marginBottom: 15,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  switchLabel: {
    color: "#fff",
    fontSize: 16,
  },
  flexButton: {
    flex: 1,
  },
});
