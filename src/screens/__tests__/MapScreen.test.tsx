import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import MapScreen from '../MapScreen';
import { useStore } from '../../store/useStore';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = (props: any) => {
    return <View testID="map-view" {...props}>{props.children}</View>;
  };
  MockMapView.Marker = (props: any) => <View testID="map-marker" {...props} />;
  MockMapView.UrlTile = (props: any) => <View testID="map-url-tile" {...props} />;

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMapView.Marker,
    UrlTile: MockMapView.UrlTile,
  };
});

// Mock the store
jest.mock('../../store/useStore', () => ({
  useStore: jest.fn(),
}));

// Mock GlassContainer
jest.mock('../../components/GlassContainer', () => ({
  GlassContainer: (props: any) => {
    const { View } = require('react-native');
    return <View testID="glass-container" {...props} />;
  },
}));

describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as unknown as jest.Mock).mockReturnValue({
      notes: [],
    });
  });

  it('handles denied location permission gracefully', async () => {
    // Mock permission denied
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    render(<MapScreen />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    // Verify getCurrentPositionAsync was NOT called
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('fetches location if permission is granted', async () => {
    // Mock permission granted
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    // Mock location
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
    });

    render(<MapScreen />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({});
    });
  });
});
