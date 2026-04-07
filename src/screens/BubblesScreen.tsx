import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/build/legacy/FileSystem';
import { useStore, Note } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initWhisper } from 'whisper.rn';
import { BlurView } from 'expo-blur';

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
    const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "Please transcribe this audio accurately.";
    const audioPart = { inlineData: { data: base64Audio, mimeType: "audio/m4a" } };
    const result = await model.generateContent([prompt, audioPart]);
    return result.response.text();
  };

  const processAudioWithWhisper = async (uri: string): Promise<string> => {
    const modelPath = (FileSystem.documentDirectory || "") + `ggml-${whisperModel}.bin`;
    const whisperContext = await initWhisper({ filePath: modelPath });
    const { promise } = whisperContext.transcribe(uri, { language: 'en', maxLen: 1, tokenTimestamps: true });
    const result = await promise;
    await whisperContext.release();
    return result.result;
  }

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
         text = await processAudioWithWhisper(uri!);
      } else if (geminiApiKey) {
         text = await processAudioWithGemini(uri!);
      } else {
         text = "Please set a Gemini API Key or download an offline model in Settings to enable transcription.";
      }
    } catch (error) {
      console.error(error);
      text = "Transcription failed: " + String(error);
    }

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


  const playSound = async (uri: string | undefined) => {
    if (!uri) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();

      // Cleanup when finished playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Failed to play sound', error);
      Alert.alert('Playback Failed', 'Could not play the recorded audio.');
    }
  };

  const renderBubble = ({ item }: { item: Note }) => (
    <View style={styles.bubbleWrapper}>
      <GlassContainer style={styles.bubble} intensity={40}>
        <Text style={styles.bubbleText}>{item.text}</Text>
        <Text style={styles.dateText}>{new Date(item.timestamp).toLocaleDateString()}</Text>
        {item.audioUri && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => playSound(item.audioUri)}
          >
            <Text style={styles.playButtonText}>▶ Play</Text>
          </TouchableOpacity>
        )}
      </GlassContainer>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}}>
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
            <GlassContainer intensity={80} style={styles.processingGlass}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingText}>Transcribing...</Text>
            </GlassContainer>
          </View>
        )}
      </SafeAreaView>

      <View style={styles.recordButtonContainer}>
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          <BlurView intensity={80} tint="dark" style={[styles.recordButton, isRecording && styles.recordingButton]}>
            <Text style={[styles.recordText, isRecording && {color: '#ff453a'}]}>
              {isRecording ? 'Stop' : 'Record'}
            </Text>
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  list: {
    padding: 10,
    paddingBottom: 150, // leave space for absolute button & tab bar
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
    padding: 20,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30, // more pill-like / circular bubbles
  },
  bubbleText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },

  playButton: {
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 15,
  },
  recordButtonContainer: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  recordingButton: {
    borderColor: 'rgba(255, 69, 58, 0.5)',
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  recordText: {
    color: '#fff',
    fontWeight: '600',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingGlass: {
    padding: 30,
    alignItems: 'center',
    borderRadius: 25,
  },
  processingText: {
    color: '#fff',
    marginTop: 15,
    fontWeight: '600',
  }
});
