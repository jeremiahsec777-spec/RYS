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
        <GlassContainer style={styles.categoryCard}>
          <Text style={styles.categoryTitle}>{item}</Text>
          <Text style={styles.categoryCount}>{categoryNotes.length} notes</Text>
        </GlassContainer>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Categories</Text>
      <FlatList
        data={categories}
        keyExtractor={(item) => item}
        renderItem={renderCategory}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    margin: 20,
  },
  list: {
    padding: 10,
  },
  categoryWrapper: {
    marginBottom: 15,
  },
  categoryCard: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  categoryCount: {
    color: '#aaa',
    fontSize: 14,
  },
});
