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

export type ComparisonStatus = 'equal' | 'divergent' | 'missing' | 'base';

export interface SlotComparisonItem {
  value: string;
  status: ComparisonStatus;
  diffNote?: string;
}

export interface DynamicComparisonRow {
  attribute_name: string;
  slot_values: {
    slot_1?: string;
    slot_2?: string;
    slot_3?: string;
    slot_4?: string;
    slot_5?: string;
    [key: string]: string | undefined;
  };
  slot_1_value: string;
  comparisons: {
    slot_1?: SlotComparisonItem;
    slot_2?: SlotComparisonItem;
    slot_3?: SlotComparisonItem;
    slot_4?: SlotComparisonItem;
    slot_5?: SlotComparisonItem;
    [key: string]: SlotComparisonItem | undefined;
  };
  cross_analysis?: {
    identical_groups?: string[]; // e.g. ["Slot 1 e Slot 3 são idênticos (45 Nm)"]
    divergences?: string[]; // e.g. ["Slot 2 é 17 Nm menor", "Slot 4 é básico"]
    has_disparity?: boolean;
    winner_slot?: number;
  };
}

export interface PairwiseComparison {
  slotA: number;
  slotB: number;
  identicalCount: number;
  divergentCount: number;
  missingCount: number;
  priceDiff: number;
  priceDiffPercent: number;
  cheaperSlot: number;
  advantagesA: string[];
  advantagesB: string[];
}

export interface DynamicComparisonResult {
  detected_category: string;
  base_slot_id: number;
  comparison_matrix: DynamicComparisonRow[];
  pairwise_matrix?: Record<string, PairwiseComparison>;
  executive_summary: string;
}
