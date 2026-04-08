import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useStore, Note } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const { notes } = useStore();

  const playSound = async (uri: string | undefined) => {
    if (!uri) return;

    if (!uri.startsWith('file://')) {
      Alert.alert('Playback Failed', 'Invalid audio source.');
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();

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

  const renderNote = ({ item }: { item: Note }) => (
    <View style={styles.noteWrapper}>
      <GlassContainer style={styles.noteCard} intensity={60}>
        <View style={styles.noteHeader}>
          <Text style={styles.noteCategory}>{item.category}</Text>
          <Text style={styles.noteDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.noteText}>{item.text}</Text>

        {item.audioUri && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => playSound(item.audioUri)}
          >
            <Text style={styles.playButtonText}>▶ Play Audio</Text>
          </TouchableOpacity>
        )}
      </GlassContainer>
    </View>
  );

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => b.timestamp - a.timestamp);
  }, [notes]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}}>
        <Text style={styles.title}>History</Text>
        <FlatList
          data={sortedNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
             <Text style={styles.emptyText}>No notes yet. Tap Cocoon to record one.</Text>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Off-white to match
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  list: {
    padding: 16,
    paddingBottom: 100, // Tab bar padding
  },
  noteWrapper: {
    marginBottom: 16,
  },
  noteCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  noteCategory: {
    color: '#007AFF', // Theme blue
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  noteDate: {
    color: '#8E8E93',
    fontSize: 12,
  },
  noteText: {
    color: '#333',
    fontSize: 16,
    lineHeight: 24,
  },
  playButton: {
    marginTop: 15,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  }
});
