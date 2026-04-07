import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({ children, style, intensity = 50 }) => {
  return (
    <View style={[styles.outerContainer, style]}>
      <BlurView intensity={intensity} tint="dark" style={styles.blurContainer}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.15)', // light frosted reflection top
            'rgba(142, 142, 147, 0.05)', // mid space gray
            'rgba(28, 28, 30, 0.3)'      // darker space gray bottom
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          {children}
        </LinearGradient>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 35, // large, pill-like rounding based on image reference
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // bright soft edge border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'rgba(50, 50, 50, 0.1)', // subtle base
  },
  blurContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
});
