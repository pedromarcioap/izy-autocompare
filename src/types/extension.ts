export type Platform = 'Shopee' | 'AliExpress';

export interface ProductSlot {
  id: number; // 1 to 5
  platform: Platform;
  title: string;
  price: number;
  shipping: number;
  image: string;
  specs: Record<string, string>;
  rawText?: string;
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
  category: string;
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

export type ComparisonStatus = 'equal' | 'divergent' | 'missing';

export interface SlotComparisonItem {
  value: string;
  status: ComparisonStatus;
}

export interface DynamicComparisonRow {
  attribute_name: string;
  slot_1_value: string;
  comparisons: {
    slot_2?: SlotComparisonItem;
    slot_3?: SlotComparisonItem;
    slot_4?: SlotComparisonItem;
    slot_5?: SlotComparisonItem;
    [key: string]: SlotComparisonItem | undefined;
  };
}

export interface DynamicComparisonResult {
  detected_category: string;
  comparison_matrix: DynamicComparisonRow[];
  executive_summary: string;
}
