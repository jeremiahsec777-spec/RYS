import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Platform, ActionSheetIOS } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useStore, Note, CategoryData } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { processAudioWithGemini, processAudioWithWhisper } from '../utils/audioProcessor';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS, withTiming, withRepeat } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Matter from 'matter-js';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Minimum bubble size, grows by some factor based on noteCount
const BASE_BUBBLE_SIZE = 100;
const MAIN_RECORD_SIZE = 80;

const CategoryBubble = ({
  category,
  engine,
  onRecord,
  isRecordingMode
}: {
  category: CategoryData,
  engine: Matter.Engine,
  onRecord: (categoryName: string) => void,
  isRecordingMode: boolean
}) => {
  const { updateCategoryPosition } = useStore();

  // Dynamic radius based on note count
  const size = useMemo(() => BASE_BUBBLE_SIZE + (category.noteCount * 10), [category.noteCount]);
  const radius = size / 2;

  const translateX = useSharedValue(category.x);
  const translateY = useSharedValue(category.y);

  // Physics body
  const bodyRef = useRef<Matter.Body | null>(null);

  useEffect(() => {
    // Create circular physics body
    const body = Matter.Bodies.circle(
      category.x + radius, // Matter uses center of mass
      category.y + radius,
      radius,
      {
        restitution: 0.8, // Bounciness
        frictionAir: 0.1,
        friction: 0.5,
        density: 0.05,
      }
    );
    bodyRef.current = body;
    Matter.Composite.add(engine.world, body);

    return () => {
      Matter.Composite.remove(engine.world, body);
    };
  }, [engine, size]); // Re-create if size changes

  useEffect(() => {
    // Game loop subscription to update shared values from physics
    const updatePosition = () => {
      if (bodyRef.current) {
        // Shared values are top-left to match typical React Native positioning
        translateX.value = bodyRef.current.position.x - radius;
        translateY.value = bodyRef.current.position.y - radius;
      }
      requestAnimationFrame(updatePosition);
    };
    const animId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animId);
  }, [radius]);


  const savePosition = (x: number, y: number) => {
    updateCategoryPosition(category.id, x, y);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
       // Disable physics briefly while dragging
       if (bodyRef.current) {
          Matter.Body.setStatic(bodyRef.current, true);
       }
    })
    .onUpdate((event) => {
      if (bodyRef.current) {
         // Move the body physically
         Matter.Body.setPosition(bodyRef.current, {
           x: event.absoluteX,
           y: event.absoluteY
         });
      }
    })
    .onEnd((event) => {
      if (bodyRef.current) {
        // Re-enable physics and apply velocity from drag
        Matter.Body.setStatic(bodyRef.current, false);
        Matter.Body.setVelocity(bodyRef.current, {
          x: event.velocityX / 20, // scale down velocity
          y: event.velocityY / 20
        });

        // Save the final resting position asynchronously
        runOnJS(savePosition)(bodyRef.current.position.x - radius, bodyRef.current.position.y - radius);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: radius,
      opacity: isRecordingMode ? 0 : 1, // Hide bubbles when immersive recording
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onRecord(category.name)}
          style={[styles.categoryBubble, { backgroundColor: category.color }]}
        >
          <Text style={styles.categoryText}>{category.name}</Text>
          <Text style={styles.countText}>{category.noteCount}</Text>
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

  // Physics engine setup
  const engineRef = useRef(Matter.Engine.create({
    gravity: { x: 0, y: 0.1, scale: 0.001 } // Very light gravity
  }));

  useEffect(() => {
    const engine = engineRef.current;

    // Screen boundaries (walls)
    const wallOptions = { isStatic: true, friction: 0 };
    const thickness = 50;

    // Bottom wall should be higher to account for tab bar
    const bottomTabHeight = 150;

    const topWall = Matter.Bodies.rectangle(SCREEN_WIDTH / 2, -thickness / 2, SCREEN_WIDTH, thickness, wallOptions);
    const bottomWall = Matter.Bodies.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT - bottomTabHeight + (thickness / 2), SCREEN_WIDTH, thickness, wallOptions);
    const leftWall = Matter.Bodies.rectangle(-thickness / 2, SCREEN_HEIGHT / 2, thickness, SCREEN_HEIGHT, wallOptions);
    const rightWall = Matter.Bodies.rectangle(SCREEN_WIDTH + (thickness / 2), SCREEN_HEIGHT / 2, thickness, SCREEN_HEIGHT, wallOptions);

    Matter.Composite.add(engine.world, [topWall, bottomWall, leftWall, rightWall]);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    return () => {
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []);


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
         text = await processAudioWithWhisper(uri!, whisperModel);
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
        categoryId: categories.find(c => c.name === categoryToSave)?.id || '1',
        categoryName: categoryToSave,
        text: finalText,
        audioUri: uri || undefined,
        timestamp: Date.now(),
        latitude,
        longitude,
      };

      addNote(newNote);
      setIsProcessing(false);
      setActiveCategory(null);
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
        // Simple fallback for Android
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

  // Immersive recording logic
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.2, { duration: 1000 }),
        -1, // infinite
        true // reverse
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isRecording]);

  const activeCategoryData = categories.find(c => c.name === activeCategory);
  const immersiveBgColor = activeCategoryData ? activeCategoryData.color : '#007AFF'; // fallback blue

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  return (
    <View style={[styles.container, isRecording ? { backgroundColor: immersiveBgColor } : {}]}>
      <SafeAreaView style={{flex: 1}}>
        {!isRecording && <Text style={styles.title}>Cocoon</Text>}

        {/* Physics Canvas for categories */}
        <View style={styles.bubbleContainer}>
           {categories.map((category) => (
             <CategoryBubble
               key={category.id}
               category={category}
               engine={engineRef.current}
               onRecord={startRecording}
               isRecordingMode={isRecording}
             />
           ))}
        </View>

        {/* Immersive Recording Overlay */}
        {isRecording && (
          <View style={styles.immersiveRecordingView} pointerEvents="none">
            <Animated.View style={[styles.pulseCircle, pulseStyle]}>
              {/* Wireframe styling effect */}
              <View style={styles.wireframeOuter} />
              <View style={styles.wireframeInner} />
            </Animated.View>
            <Text style={styles.listeningText}>Listening...</Text>
          </View>
        )}

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
          <BlurView intensity={80} tint={isRecording ? "light" : "dark"} style={[styles.recordButton, isRecording && styles.recordingButton]}>
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
    backgroundColor: '#FAF9F6', // Minimalist off-white canvas
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
    overflow: 'hidden',
  },
  categoryBubble: {
    width: '100%',
    height: '100%',
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
  countText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
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
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
  },
  recordingButton: {
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // bright white during immersive mode
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
  },
  immersiveRecordingView: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  listeningText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: 40,
    letterSpacing: 2,
  },
  pulseCircle: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wireframeOuter: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
  },
  wireframeInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  }
});
