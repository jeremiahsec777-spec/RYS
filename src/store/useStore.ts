import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
