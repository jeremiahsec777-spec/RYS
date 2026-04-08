import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useStore, Note } from '../store/useStore';
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

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => b.timestamp - a.timestamp);
  }, [notes]);

  const groupNotesByDate = (notes: Note[]) => {
    const groups: { [key: string]: Note[] } = {};
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    notes.forEach(note => {
      const noteDate = new Date(note.timestamp).toLocaleDateString();
      let groupKey = noteDate;
      if (noteDate === today) groupKey = 'Today';
      else if (noteDate === yesterday) groupKey = 'Yesterday';

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(note);
    });

    return Object.entries(groups).map(([date, data]) => ({ date, data }));
  };

  const groupedData = useMemo(() => groupNotesByDate(sortedNotes), [sortedNotes]);

  const renderNote = ({ item }: { item: Note }) => (
    <View style={styles.noteCard}>
      <Text style={styles.noteCategory}>{item.categoryName.toUpperCase()}</Text>
      <Text style={styles.noteText}>{item.text}</Text>

      {item.audioUri && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => playSound(item.audioUri)}
        >
          <Text style={styles.playButtonText}>▶ Play Audio</Text>
        </TouchableOpacity>
      )}
      <View style={styles.divider} />
    </View>
  );

  const renderGroup = ({ item }: { item: { date: string, data: Note[] } }) => (
    <View style={styles.groupContainer}>
      <Text style={styles.groupHeader}>{item.date}</Text>
      {item.data.map(note => <React.Fragment key={note.id}>{renderNote({ item: note })}</React.Fragment>)}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <Text style={styles.title}>History</Text>
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.date}
          renderItem={renderGroup}
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
    backgroundColor: '#FFFFFF', // Pure minimalist white
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Tab bar padding
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  noteCard: {
    marginBottom: 16,
  },
  noteCategory: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  noteText: {
    color: '#333',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  playButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginTop: 16,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  }
});
