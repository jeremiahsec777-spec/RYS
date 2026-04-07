import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { useStore } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';

export default function MapScreen() {
  const { notes } = useStore();
  const [initialRegion, setInitialRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setInitialRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        mapType="none" // To use only UrlTile
      >
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {notes.map((note) => {
          if (note.latitude && note.longitude) {
            return (
              <Marker
                key={note.id}
                coordinate={{ latitude: note.latitude, longitude: note.longitude }}
              >
                <GlassContainer style={styles.markerContainer}>
                  <Text style={styles.markerText} numberOfLines={1}>
                    {note.text}
                  </Text>
                </GlassContainer>
              </Marker>
            );
          }
          return null;
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    padding: 5,
    maxWidth: 100,
    borderRadius: 10,
  },
  markerText: {
    color: '#fff',
    fontSize: 10,
  },
});
