export type Platform = 'Shopee' | 'AliExpress';

export interface ProductSlot {
  id: number; // 1 to 5
  platform: Platform;
  title: string;
  price: number;
  shipping: number;
  image: string;
  specs: Record<string, string>;
  url: string;
  capturedAt: string;
}

export type SlotsState = [
  ProductSlot | null,
  ProductSlot | null,
  ProductSlot | null,
  ProductSlot | null,
  ProductSlot | null
];

export interface SimulatedTab {
  id: string;
  platform: Platform;
  title: string;
  url: string;
  price: number;
  shipping: number;
  image: string;
  sellerRating: string;
  soldCount: string;
  specs: Record<string, string>;
  description: string;
}

export interface CanonicalSpecDefinition {
  key: string;
  label: string;
  category: string;
  synonyms: string[];
}
