import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RecordingOverlayProps {
  visible: boolean;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  isPaused: boolean;
  durationMillis: number;
}

export function RecordingOverlay({
  visible,
  onStop,
  onPause,
  onResume,
  isPaused,
  durationMillis
}: RecordingOverlayProps) {
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [visible, isPaused]);

  if (!visible) return null;

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#1A2A4A', '#2B4B8A', '#4A76D6', '#87A8F8']}
          locations={[0, 0.4, 0.6, 0.8, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: glowOpacity }
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(135, 168, 248, 0.5)', 'rgba(255, 255, 255, 0.8)']}
            locations={[0.5, 0.8, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.timerText}>{formatTime(durationMillis)}</Text>
            {isPaused && <Text style={styles.pausedText}>Paused</Text>}
          </View>

          <View style={styles.controlsContainer}>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={[styles.button, styles.holdButton]}
                onPress={isPaused ? onResume : onPause}
              >
                <Text style={styles.iconText}>{isPaused ? '▶' : '⏸'}</Text>
              </TouchableOpacity>
              <Text style={styles.buttonLabel}>{isPaused ? 'Resume' : 'Hold'}</Text>
            </View>

            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={[styles.button, styles.endButton]}
                onPress={onStop}
              >
                <Text style={styles.iconText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.buttonLabel}>End</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  timerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    opacity: 0.8,
  },
  pausedText: {
    color: '#ff453a',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
    gap: 60,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  holdButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  endButton: {
    backgroundColor: '#ff453a',
  },
  iconText: {
    color: '#fff',
    fontSize: 24,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
});
