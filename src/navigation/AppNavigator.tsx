import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import BubblesScreen from '../screens/BubblesScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: 80,
    paddingBottom: 20,
  },
  tabBarOverlay: {
    backgroundColor: 'rgba(28, 28, 30, 0.4)',
  },
  tabBarBorder: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.tabBarOverlay]} />
            <View style={styles.tabBarBorder} />
          </View>
        ),
        tabBarActiveTintColor: '#0A84FF', // iOS blue
        tabBarInactiveTintColor: '#8E8E93', // iOS gray
      }}
    >
      <Tab.Screen name="Bubbles" component={BubblesScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};
