import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useStore } from '../store/useStore';
import { GlassContainer } from '../components/GlassContainer';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CategoriesScreen() {
  const { categories, notes } = useStore();

  const renderCategory = ({ item }: { item: string }) => {
    const categoryNotes = notes.filter((n) => n.category === item);

    return (
      <View style={styles.categoryWrapper}>
        <GlassContainer style={styles.categoryCard} intensity={60}>
          <Text style={styles.categoryTitle}>{item}</Text>
          <Text style={styles.categoryCount}>{categoryNotes.length} notes</Text>
        </GlassContainer>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}}>
        <Text style={styles.title}>Categories</Text>
        <FlatList
          data={categories}
          keyExtractor={(item) => item}
          renderItem={renderCategory}
          contentContainerStyle={styles.list}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  list: {
    padding: 16,
    paddingBottom: 100, // Tab bar padding
  },
  categoryWrapper: {
    marginBottom: 16,
  },
  categoryCard: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 24, // Matches the new smoother glass shape
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  categoryCount: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
});
