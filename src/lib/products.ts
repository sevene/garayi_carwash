// lib/products.ts
// This file handles data fetching for products, using a mock dataset
// if the NEXT_PUBLIC_API_URL is not available.

// =========================================================================
// INTERFACE DEFINITION
// =========================================================================

/**
 * Defines the structure for a single product returned by the API.
 * The price is defined as string | number to handle potential inconsistencies
 * from the MongoDB/Node.js backend (e.g., Decimal128 types).
 */
export interface Product {
  _id: string;
  name: string;
  sku: string;
  volume: number | string;
  price: number | string;
  cost: number | string;
  image?: string; // Optional image URL
  category?: string; // Optional category
  stock?: number; // Optional stock quantity
  threshold?: number; // Low stock threshold
  showInPOS?: boolean; // Optional flag to show in POS
  soldBy?: 'piece' | 'weight/volume'; // Unit type
}

// =========================================================================
// DATA FETCHING LOGIC
// =========================================================================

/**
 * Fetches the list of products from the configured backend API.
 * @returns A promise that resolves to an array of Product objects.
 */
export async function fetchProducts(): Promise<Product[]> {
  // Attempt to fetch data from the live backend
  const response = await fetch('/api/products', {
    // Ensure fresh data on every request (important for POS systems)
    cache: 'no-store',
  });

  if (!response.ok) {
    // Throw an error that will be caught by the calling POSPage component
    throw new Error(`Failed to fetch products: Status ${response.status} - ${response.statusText}`);
  }

  // Parse and return the data, enforcing the Product[] type
  return response.json();
}