import { Category, CategoryWithRelations } from "../types";

export const buildCategoryTree = (
  categories: Category[],
  rootId: number
): CategoryWithRelations[] => {
  // Create a map for O(1) lookups - this eliminates nested loops
  const categoryMap = new Map<number, CategoryWithRelations>();

  // Initialize all categories with empty children arrays
  categories.forEach((category) => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // Build the tree structure in O(n) time instead of O(n²)
  const rootChildren: CategoryWithRelations[] = [];

  categories.forEach((category) => {
    const categoryWithChildren = categoryMap.get(category.id)!;

    if (category.parentId === rootId) {
      // Direct child of the root category
      rootChildren.push(categoryWithChildren);
    } else if (category.parentId && categoryMap.has(category.parentId)) {
      // Child of another category in our dataset
      const parent = categoryMap.get(category.parentId)!;
      if (parent.children) {
        parent.children.push(categoryWithChildren);
      }
    }
  });

  return rootChildren;
};
