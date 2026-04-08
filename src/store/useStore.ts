import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Note {
  id: string;
  text: string;
  audioUri?: string;
  category: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
}

export interface CategoryData {
  name: string;
  x: number;
  y: number;
  color: string;
}

interface AppState {
  notes: Note[];
  categories: CategoryData[];
  geminiApiKey: string;
  whisperModel: string;
  categorizationKeyword: string;
  addNote: (note: Note) => void;
  addCategory: (categoryName: string, x?: number, y?: number) => void;
  updateCategoryPosition: (name: string, x: number, y: number) => void;
  setGeminiApiKey: (key: string) => void;
  setWhisperModel: (model: string) => void;
  setCategorizationKeyword: (keyword: string) => void;
  importNotes: (importedNotes: Note[]) => void;
}

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

const getRandomColor = () => {
  const colors = [
    '#FF3B30', // Red
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#4CD964', // Green
    '#5AC8FA', // Light Blue
    '#007AFF', // Blue
    '#5856D6', // Purple
    '#FF2D55', // Pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      notes: [],
      categories: [
        { name: 'General', x: 50, y: 100, color: '#FF3B30' },
        { name: 'Work', x: 200, y: 150, color: '#007AFF' },
        { name: 'Ideas', x: 80, y: 300, color: '#4CD964' },
        { name: 'Todos', x: 250, y: 400, color: '#FF9500' }
      ],
      geminiApiKey: '',
      whisperModel: 'none',
      categorizationKeyword: 'Cocoon',

      addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),

      addCategory: (categoryName, x = 100, y = 100) => set((state) => {
        if (!state.categories.find(c => c.name === categoryName)) {
          return {
            categories: [
              ...state.categories,
              { name: categoryName, x, y, color: getRandomColor() }
            ]
          };
        }
        return state;
      }),

      updateCategoryPosition: (name, x, y) => set((state) => ({
        categories: state.categories.map(c =>
          c.name === name ? { ...c, x, y } : c
        )
      })),

      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setWhisperModel: (model) => set({ whisperModel: model }),
      setCategorizationKeyword: (keyword) => set({ categorizationKeyword: keyword }),

      importNotes: (importedNotes) => set((state) => {
        const existingIds = new Set<string>();
        for (const note of state.notes) {
          existingIds.add(note.id);
        }
        const newNotes = importedNotes.filter(n => !existingIds.has(n.id));
        return { notes: [...state.notes, ...newNotes] };
      }),
    }),
    {
      name: 'notes-storage',
      storage: createJSONStorage(() => secureStorage),
      // Only persist specific fields, or handle migration for old string[] categories
      migrate: (persistedState: any, version: number) => {
        if (persistedState.categories && Array.isArray(persistedState.categories) && typeof persistedState.categories[0] === 'string') {
          // migrate old string[] categories to CategoryData[]
          persistedState.categories = persistedState.categories.map((c: string, index: number) => ({
             name: c,
             x: 50 + (index * 30),
             y: 100 + (index * 50),
             color: getRandomColor()
          }));
        }
        if (!persistedState.categorizationKeyword) {
          persistedState.categorizationKeyword = 'Cocoon';
        }
        return persistedState;
      }
    }
  )
);
