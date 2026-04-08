import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions, ActionSheetIOS, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { useStore, Note, CategoryData } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initWhisper } from 'whisper.rn';
import { BlurView } from 'expo-blur';
import { processAudioWithGemini } from '../utils/audioProcessor';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_SIZE = 100;

const CategoryBubble = ({ category, onRecord }: { category: CategoryData, onRecord: (categoryName: string) => void }) => {
  const { updateCategoryPosition } = useStore();
  const translateX = useSharedValue(category.x);
  const translateY = useSharedValue(category.y);

  const savedTranslateX = useSharedValue(category.x);
  const savedTranslateY = useSharedValue(category.y);

  const savePosition = (x: number, y: number) => {
    updateCategoryPosition(category.name, x, y);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      const maxX = SCREEN_WIDTH - BUBBLE_SIZE;
      const maxY = SCREEN_HEIGHT - BUBBLE_SIZE - 150;

      let newX = translateX.value;
      let newY = translateY.value;

      if (newX < 0) newX = 0;
      if (newX > maxX) newX = maxX;
      if (newY < 0) newY = 0;
      if (newY > maxY) newY = maxY;

      translateX.value = withSpring(newX);
      translateY.value = withSpring(newY);

      savedTranslateX.value = newX;
      savedTranslateY.value = newY;

      runOnJS(savePosition)(newX, newY);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      position: 'absolute',
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onRecord(category.name)}
        >
          <View style={[styles.categoryBubble, { backgroundColor: category.color }]}>
            <Text style={styles.categoryText}>{category.name}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};


export default function BubblesScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { notes, categories, addNote, geminiApiKey, whisperModel, categorizationKeyword } = useStore();

  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
    })();
  }, []);

  const startRecording = async (categoryName?: string) => {
    try {
      if (categoryName) {
        setActiveCategory(categoryName);
      } else {
        setActiveCategory(null);
      }

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

  const processAudioWithWhisper = async (uri: string): Promise<string> => {
    const documentDirectory = (FileSystem as unknown as { documentDirectory: string | null }).documentDirectory;
    if (!documentDirectory) {
      throw new Error("Document directory is not available");
    }
    const modelPath = documentDirectory + 'ggml-' + whisperModel + '.bin';
    const fileInfo = await FileSystem.getInfoAsync(modelPath);
    if (!fileInfo.exists) {
      throw new Error('Whisper model ' + whisperModel + ' not found. Please download it in settings.');
    }
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

    if (!uri) {
      setIsProcessing(false);
      Alert.alert('Recording Failed', 'Could not get audio URI.');
      return;
    }

    let text = "Transcription unavailable";
    try {
      if (whisperModel !== 'none') {
         text = await processAudioWithWhisper(uri!);
      } else if (geminiApiKey) {
         text = await processAudioWithGemini(uri!, geminiApiKey);
      } else {
         text = "Please set a Gemini API Key or download an offline model in Settings to enable transcription.";
      }
    } catch (error) {
      console.error(error);
      text = "Transcription failed. Please try again or check your settings.";
    }

    let latitude = undefined;
    let longitude = undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      } else {
        console.warn('Location permission not granted');
      }
    } catch (e) {
      console.error('Could not fetch location', e);
    }

    let finalCategory = activeCategory;
    let finalText = text.trim();

    // Offline Voice Categorization Logic
    if (!finalCategory) {
      const regex = new RegExp('(?:\\\\b|^)' + categorizationKeyword + '\\\\s+(\\\\w+)\\\\b', 'i');
      const match = finalText.match(regex);
      if (match && match[1]) {
        finalCategory = match[1];
        // Remove the command from the final text
        finalText = finalText.replace(match[0], '').trim();
      }
    }

    const saveNoteWithCategory = (categoryToSave: string) => {
      const newNote: Note = {
        id: Date.now().toString(),
        text: finalText,
        audioUri: uri || undefined,
        category: categoryToSave,
        timestamp: Date.now(),
        latitude,
        longitude,
      };

      addNote(newNote);
      setIsProcessing(false);
      setActiveCategory(null);
      Alert.alert('Note added', 'Saved to ' + categoryToSave + '.');
    };

    if (!finalCategory) {
      if (Platform.OS === 'ios') {
        const options = [...categories.map(c => c.name), 'Cancel'];
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: options.length - 1,
            title: 'Select Category',
            message: 'Where would you like to save this note?'
          },
          (buttonIndex) => {
            if (buttonIndex !== options.length - 1) {
              saveNoteWithCategory(categories[buttonIndex].name);
            } else {
              saveNoteWithCategory('General'); // Default on cancel
            }
          }
        );
      } else {
        // Simple fallback for Android: Alert with buttons for first 3 categories
        const buttons = categories.slice(0, 3).map(c => ({
          text: c.name,
          onPress: () => saveNoteWithCategory(c.name)
        }));
        Alert.alert(
          'Select Category',
          'Where would you like to save this note?',
          [...buttons, { text: 'General', onPress: () => saveNoteWithCategory('General') }]
        );
      }
    } else {
      saveNoteWithCategory(finalCategory);
    }
  };


  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}}>
        <Text style={styles.title}>Cocoon</Text>

        <View style={styles.bubbleContainer}>
           {categories.map((category) => (
             <CategoryBubble
               key={category.name}
               category={category}
               onRecord={startRecording}
             />
           ))}
        </View>

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
          onPress={isRecording ? stopRecording : () => startRecording()}
          disabled={isProcessing}
        >
          <BlurView intensity={80} tint="dark" style={[styles.recordButton, isRecording && styles.recordingButton]}>
            <Text style={[styles.recordText, isRecording && {color: '#ff453a'}]}>
              {isRecording ? 'Stop' : '+ Cocoon'}
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
    backgroundColor: '#FAF9F6', // Off-white light mode background to match image
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  bubbleContainer: {
    flex: 1,
    position: 'relative',
  },
  categoryBubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  recordButtonContainer: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  recordButton: {
    width: 120,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    backgroundColor: 'rgba(200, 200, 200, 0.3)', // light glass
  },
  recordingButton: {
    borderColor: 'rgba(255, 69, 58, 0.5)',
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
  },
  recordText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  processingText: {
    color: '#fff',
    marginTop: 15,
    fontWeight: '600',
  }
});
