import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { useStore } from '../store/useStore';

export default function MapScreen() {
  const { notes, categories } = useStore();
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

      try {
        let location = await Location.getCurrentPositionAsync({});
        setInitialRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.log('Error fetching location in MapScreen:', error);
      }
    })();
  }, []);

  // Cluster or group logic.
  // For simplicity we just round coords to 3 decimals to group close notes roughly
  const clusteredNotes = useMemo(() => {
    const groups = new Map<string, { categoryId: string, count: number, lat: number, lng: number }>();

    for (const note of notes) {
      if (note.latitude && note.longitude) {
        const key = `${note.latitude.toFixed(3)},${note.longitude.toFixed(3)}-${note.categoryId}`;
        if (groups.has(key)) {
          const group = groups.get(key)!;
          group.count += 1;
        } else {
          groups.set(key, {
            categoryId: note.categoryId,
            count: 1,
            lat: note.latitude,
            lng: note.longitude
          });
        }
      }
    }
    return Array.from(groups.values());
  }, [notes]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        mapType="none" // OpenStreetMap tiles only
      >
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {clusteredNotes.map((cluster, idx) => {
          const category = categories.find(c => c.id === cluster.categoryId);
          const color = category ? category.color : '#007AFF';
          const name = category ? category.name : 'Unknown';
          const size = 60 + (cluster.count * 5); // Dynamic size similar to main screen

          return (
            <Marker
              key={idx}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
            >
              <View style={[
                styles.bubbleMarker,
                {
                  backgroundColor: color,
                  width: size,
                  height: size,
                  borderRadius: size / 2
                }
              ]}>
                <Text style={styles.markerText} numberOfLines={1}>
                  {name}
                </Text>
                {cluster.count > 1 && (
                  <Text style={styles.markerCount}>{cluster.count}</Text>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  bubbleMarker: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  markerCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 2,
  }
});
