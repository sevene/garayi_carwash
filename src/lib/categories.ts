// lib/categories.ts
// TypeScript interface for Category with hierarchical support

export interface Category {
    _id: string;
    name: string;
    description?: string;
    parentId?: string | null; // null for top-level categories
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// Helper to organize categories into a tree structure
export interface CategoryTreeNode extends Category {
    children?: CategoryTreeNode[];
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // First pass: create map of all categories
    categories.forEach(cat => {
        categoryMap.set(cat._id, { ...cat, children: [] });
    });

    // Second pass: build tree structure
    categories.forEach(cat => {
        const node = categoryMap.get(cat._id)!;
        if (!cat.parentId) {
            // Top-level category
            roots.push(node);
        } else {
            // Subcategory - add to parent's children
            const parent = categoryMap.get(cat.parentId);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(node);
            } else {
                // Parent not found, treat as root
                roots.push(node);
            }
        }
    });

    return roots;
}

// Get flat list of categories for dropdowns
export function flattenCategories(categories: Category[]): { value: string; label: string; isSubcategory: boolean }[] {
    const tree = buildCategoryTree(categories);
    const result: { value: string; label: string; isSubcategory: boolean }[] = [];

    function traverse(nodes: CategoryTreeNode[], prefix = '') {
        nodes.forEach(node => {
            result.push({
                value: node._id,
                label: prefix + node.name,
                isSubcategory: !!node.parentId
            });
            if (node.children && node.children.length > 0) {
                traverse(node.children, prefix + '  ');
            }
        });
    }

    traverse(tree);
    return result;
}
