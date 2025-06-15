// Mock for react-dnd to avoid ES module issues
module.exports = {
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()],
  DndProvider: ({ children }) => children,
};