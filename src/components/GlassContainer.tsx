import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface GlassContainerProps {
  children: ReactNode;
  style?: ViewStyle;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({ children, style }) => {
  return (
    <LinearGradient
      colors={['rgba(80, 80, 80, 0.4)', 'rgba(40, 40, 40, 0.6)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <BlurView intensity={30} tint="dark" style={styles.blur}>
        {children}
      </BlurView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blur: {
    padding: 15,
  },
});
