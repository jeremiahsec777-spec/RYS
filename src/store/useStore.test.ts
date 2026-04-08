import { renderHook, act } from '@testing-library/react-native';
import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useStore());
    act(() => {
      useStore.setState({ notes: [], categories: [{ id: '1', name: 'General', x: 0, y: 0, color: '#000', noteCount: 0 }] });
    });
  });

  it('adds a note successfully', () => {
    const { result } = renderHook(() => useStore());

    const testNote = {
      id: '1',
      text: 'Test note',
      categoryId: '1', categoryName: 'General',
      timestamp: 1234567890,
    };

    act(() => {
      result.current.addNote(testNote);
    });

    expect(result.current.notes).toContainEqual(testNote);
    expect(result.current.notes.length).toBe(1);
  });

  it('adds a category successfully', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.addCategory('Test Category', 10, 20);
    });

    expect(result.current.categories.find(c => c.name === 'Test Category')).toBeDefined();
    expect(result.current.categories.find(c => c.name === 'Test Category')?.x).toBe(10);
  });

  it('updates a category position', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.addCategory('Move Me', 10, 10);
    });

    act(() => {
      const id = result.current.categories.find(c => c.name === 'Move Me')?.id || '0';
      result.current.updateCategoryPosition(id, 50, 60);
    });

    expect(result.current.categories.find(c => c.name === 'Move Me')?.x).toBe(50);
    expect(result.current.categories.find(c => c.name === 'Move Me')?.y).toBe(60);
  });

  it('does not add duplicate categories', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.addCategory('Duplicate');
    });

    const initialLength = result.current.categories.length;

    act(() => {
      result.current.addCategory('Duplicate');
    });

    expect(result.current.categories.length).toBe(initialLength);
  });
});
