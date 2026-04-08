import { useStore } from './useStore';

// Mock AsyncStorage to avoid "window is not defined" errors during tests in Node environment
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('useStore', () => {
  beforeEach(() => {
    // Reset the store's categories to a known state before each test
    useStore.setState({ categories: ['General', 'Work', 'Ideas', 'Todos'] });
  });

  describe('addCategory', () => {
    it('should add a new category when it does not exist', () => {
      const initialState = useStore.getState();
      const initialCount = initialState.categories.length;

      useStore.getState().addCategory('NewCategory');

      const state = useStore.getState();
      expect(state.categories.length).toBe(initialCount + 1);
      expect(state.categories).toContain('NewCategory');
    });

    it('should not add a duplicate category', () => {
      const initialState = useStore.getState();
      const initialCount = initialState.categories.length;

      // Attempt to add 'Work' which already exists in the initial state
      useStore.getState().addCategory('Work');

      const state = useStore.getState();
      expect(state.categories.length).toBe(initialCount);

      // Ensure 'Work' is still only present once
      const workCount = state.categories.filter(c => c === 'Work').length;
      expect(workCount).toBe(1);
    });

    it('should correctly handle case sensitivity (i.e. allows different casing)', () => {
        const initialState = useStore.getState();
        const initialCount = initialState.categories.length;

        // Attempt to add 'work' (lowercase) when 'Work' exists
        useStore.getState().addCategory('work');

        const state = useStore.getState();
        expect(state.categories.length).toBe(initialCount + 1);
        expect(state.categories).toContain('work');
        expect(state.categories).toContain('Work');
    });
  });
});
