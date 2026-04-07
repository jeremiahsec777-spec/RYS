import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { File } from 'expo-file-system';
import { useStore, Note } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function BubblesScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { notes, addNote, geminiApiKey, whisperModel } = useStore();

  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
    })();
  }, []);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const processAudioWithGemini = async (uri: string): Promise<string> => {
    if (!geminiApiKey) throw new Error("Gemini API key is not set");

    // Read audio file as base64
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    // Note: To use audio, we need the gemini-1.5-flash or pro model.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Please transcribe this audio accurately.";

    const audioPart = {
      inlineData: {
        data: base64Audio,
        mimeType: "audio/m4a" // Matches high quality preset format
      }
    };

    const result = await model.generateContent([prompt, audioPart]);
    return result.response.text();
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setIsProcessing(true);

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    let text = "Transcription unavailable";

    try {
      if (whisperModel !== 'none') {
         // Offline whisper is requested. In a real bare workflow app, we would call whisper.rn here.
         // For Expo Go compatibility, we'll notify the user.
         text = `[Simulated Offline Whisper ${whisperModel} Transcription] Note created offline.`;
      } else if (geminiApiKey) {
         text = await processAudioWithGemini(uri!);
      } else {
         text = "Please set a Gemini API Key or download an offline model in Settings to enable transcription.";
      }
    } catch (error) {
      console.error(error);
      text = "Transcription failed: " + String(error);
    }

    // Get location safely
    let latitude = undefined;
    let longitude = undefined;
    try {
      let location = await Location.getCurrentPositionAsync({});
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
    } catch (e) {
      console.log('Could not fetch location');
    }

    const newNote: Note = {
      id: Date.now().toString(),
      text,
      audioUri: uri || undefined,
      category: 'General',
      timestamp: Date.now(),
      latitude,
      longitude,
    };

    addNote(newNote);
    setIsProcessing(false);
    Alert.alert('Note added', 'Your note has been saved.');
  };

  const renderBubble = ({ item }: { item: Note }) => (
    <View style={styles.bubbleWrapper}>
      <GlassContainer style={styles.bubble}>
        <Text style={styles.bubbleText}>{item.text}</Text>
        <Text style={styles.dateText}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      </GlassContainer>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Notes</Text>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderBubble}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
      />

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Transcribing...</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Text style={styles.recordText}>{isRecording ? 'Stop' : 'Record'}</Text>
      </TouchableOpacity>
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
  list: {
    padding: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  bubbleWrapper: {
    flex: 1,
    margin: 10,
    maxWidth: '45%',
  },
  bubble: {
    padding: 15,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  dateText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 10,
  },
  recordButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  recordingButton: {
    backgroundColor: 'rgba(255,0,0,0.5)',
    borderColor: 'red',
  },
  recordText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  processingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
  }
});
