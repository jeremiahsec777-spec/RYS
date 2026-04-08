import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Note {
  id: string;
  categoryId: string; // Updated from category: string to categoryId
  categoryName: string; // Keeping name for backward compatibility during display/migrations easily
  text: string;
  audioUri?: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
}

export interface CategoryData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  noteCount: number; // Added to dynamically track size
}

interface AppState {
  notes: Note[];
  categories: CategoryData[];
  geminiApiKey: string;
  whisperModel: string;
  categorizationKeyword: string;
  addNote: (note: Note) => void;
  addCategory: (categoryName: string, x?: number, y?: number) => void;
  updateCategoryPosition: (id: string, x: number, y: number) => void;
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
    '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      notes: [],
      categories: [
        { id: '1', name: 'General', x: 50, y: 100, color: '#FF3B30', noteCount: 0 },
        { id: '2', name: 'Work', x: 200, y: 150, color: '#007AFF', noteCount: 0 },
        { id: '3', name: 'Ideas', x: 80, y: 300, color: '#4CD964', noteCount: 0 },
        { id: '4', name: 'Todos', x: 250, y: 400, color: '#FF9500', noteCount: 0 }
      ],
      geminiApiKey: '',
      whisperModel: 'none',
      categorizationKeyword: 'Cocoon',

      addNote: (note) => set((state) => {
        // Increment note count for the category
        const updatedCategories = state.categories.map(c =>
          c.id === note.categoryId ? { ...c, noteCount: c.noteCount + 1 } : c
        );
        return { notes: [...state.notes, note], categories: updatedCategories };
      }),

      addCategory: (categoryName, x = 100, y = 100) => set((state) => {
        if (!state.categories.find(c => c.name === categoryName)) {
          return {
            categories: [
              ...state.categories,
              {
                id: Date.now().toString(),
                name: categoryName,
                x, y,
                color: getRandomColor(),
                noteCount: 0
              }
            ]
          };
        }
        return state;
      }),

      updateCategoryPosition: (id, x, y) => set((state) => ({
        categories: state.categories.map(c =>
          c.id === id ? { ...c, x, y } : c
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

        // Recalculate noteCounts roughly
        const updatedCategories = [...state.categories];
        newNotes.forEach(note => {
          const cat = updatedCategories.find(c => c.id === note.categoryId);
          if (cat) cat.noteCount++;
        });

        return { notes: [...state.notes, ...newNotes], categories: updatedCategories };
      }),
    }),
    {
      name: 'notes-storage',
      storage: createJSONStorage(() => secureStorage),
      migrate: (persistedState: any, version: number) => {
        // Simple migration for backward compatibility
        let state = { ...persistedState };
        if (state.categories && state.categories.length > 0) {
          // If old category string array
          if (typeof state.categories[0] === 'string') {
             state.categories = state.categories.map((c: string, index: number) => ({
               id: index.toString(),
               name: c,
               x: 50 + (index * 30),
               y: 100 + (index * 50),
               color: getRandomColor(),
               noteCount: 0
             }));
          } else if (state.categories[0].id === undefined) {
             // Migrate from CategoryData without id and noteCount
             state.categories = state.categories.map((c: any, index: number) => ({
               ...c,
               id: Date.now().toString() + index,
               noteCount: 0
             }));
          }
        }

        if (state.notes) {
          state.notes = state.notes.map((n: any) => {
            if (n.category && !n.categoryId) {
               // Find category ID based on name
               const cat = state.categories.find((c: any) => c.name === n.category);
               return {
                 ...n,
                 categoryId: cat ? cat.id : '1',
                 categoryName: n.category,
                 text: n.text || ''
               };
            }
            return n;
          });

          // Fix note counts
          state.categories.forEach((cat: any) => {
            cat.noteCount = state.notes.filter((n: any) => n.categoryId === cat.id).length;
          });
        }

        if (!state.categorizationKeyword) {
          state.categorizationKeyword = 'Cocoon';
        }
        return state;
      }
    }
  )
);
