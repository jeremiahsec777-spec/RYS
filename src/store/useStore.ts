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

interface AppState {
  notes: Note[];
  categories: string[];
  geminiApiKey: string;
  whisperModel: string;
  addNote: (note: Note) => void;
  addCategory: (category: string) => void;
  setGeminiApiKey: (key: string) => void;
  setWhisperModel: (model: string) => void;
  importNotes: (importedNotes: Note[]) => void;
}


const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      notes: [],
      categories: ['General', 'Work', 'Ideas', 'Todos'],
      geminiApiKey: '',
      whisperModel: 'none', // tiny, base, small, medium, etc.

      addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
      addCategory: (category) => set((state) => {
          if (!state.categories.includes(category)) {
              return { categories: [...state.categories, category] };
          }
          return state;
      }),
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setWhisperModel: (model) => set({ whisperModel: model }),
      importNotes: (importedNotes) => set((state) => {
          // simple merge, avoid duplicates
          const existingIds = new Set(state.notes.map(n => n.id));
          const newNotes = importedNotes.filter(n => !existingIds.has(n.id));
          return { notes: [...state.notes, ...newNotes] };
      }),
    }),
    {
      name: 'notes-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
