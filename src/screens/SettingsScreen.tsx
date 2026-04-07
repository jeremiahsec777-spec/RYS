import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen() {
  const { geminiApiKey, setGeminiApiKey, whisperModel, setWhisperModel, notes, importNotes } = useStore();
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);

  const saveApiKey = () => {
    setGeminiApiKey(apiKeyInput);
    Alert.alert('Saved', 'Gemini API Key saved.');
  };

  const handleExport = async () => {
    try {
      const data = JSON.stringify(notes);
      const file = new File(Paths.document, 'notes_export.json');
      file.write(data);
      await Sharing.shareAsync(file.uri);
    } catch (error) {
      Alert.alert('Export Failed', String(error));
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;
      const fileUri = result.assets[0].uri;
      const file = new File(fileUri);
      const data = await file.text();

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

  const handleDownloadModel = (model: string) => {
    setWhisperModel(model);
    Alert.alert('Model Downloaded', `${model} model is now selected.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Settings</Text>

        <GlassContainer style={styles.section}>
          <Text style={styles.sectionTitle}>Gemini API Key (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter API Key"
            placeholderTextColor="#888"
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={saveApiKey}>
            <Text style={styles.buttonText}>Save Key</Text>
          </TouchableOpacity>
        </GlassContainer>

        <GlassContainer style={styles.section}>
          <Text style={styles.sectionTitle}>Whisper Models (Offline)</Text>
          <Text style={styles.currentModel}>Current: {whisperModel}</Text>
          <View style={styles.row}>
            {['tiny', 'base', 'small', 'medium'].map(model => (
              <TouchableOpacity key={model} style={styles.modelButton} onPress={() => handleDownloadModel(model)}>
                <Text style={styles.buttonText}>{model}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassContainer>

        <GlassContainer style={styles.section}>
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
    backgroundColor: '#111',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    margin: 20,
  },
  section: {
    margin: 15,
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#0A84FF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  currentModel: {
    color: '#aaa',
    marginBottom: 15,
  },
  flexButton: {
    flex: 1,
  },
});
