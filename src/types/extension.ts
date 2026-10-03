export type Platform = 'Shopee' | 'AliExpress';

export interface ProductSlot {
  id: number; // 1 to 5
  platform: Platform;
  title: string;
  price: number;
  shipping: number;
  image: string;
  specs: Record<string, string>;
  raw_specs?: string;
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
  raw_specs?: string;
  specs: Record<string, string>;
  description: string;
}

export type ComparisonStatus = 'base' | 'equal' | 'superior' | 'inferior' | 'divergent' | 'missing';

export interface SlotComparisonItem {
  value: string;
  status: ComparisonStatus;
  statusLabel?: string;
  diffNote?: string;
  isAdvantage?: boolean;
}

export interface SpecAIInterpretation {
  summary: string;
  winner_slot?: number | null;
  practical_impact?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface DynamicComparisonRow {
  id?: string;
  category?: string;
  attribute_name: string;
  description?: string;
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
  ai_interpretation?: SpecAIInterpretation;
  cross_analysis?: {
    identical_groups?: string[];
    divergences?: string[];
    has_disparity?: boolean;
    winner_slot?: number;
  };
}

export interface KeyFindingAdvantage {
  slot_id: number;
  title: string;
  detail: string;
}

export interface KeyFindingWarning {
  title: string;
  detail: string;
  affected_slots: number[];
}

export interface KeyFindings {
  top_advantages: KeyFindingAdvantage[];
  critical_warnings: KeyFindingWarning[];
  convergences: string[];
}

export interface SlotScore {
  slot_id: number;
  advantages_count: number;
  draws_count: number;
  disadvantages_count: number;
  missing_count: number;
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

export interface SpecsMatrixRow {
  category?: string;
  attribute: string;
  slot_1: string;
  slot_2?: string;
  slot_3?: string;
  slot_4?: string;
  slot_5?: string;
  ai_insight?: string;
  winner?: string;
  [key: string]: string | undefined;
}

export interface AIAuditResponse {
  category: string;
  reference_slot: number;
  specs_matrix?: SpecsMatrixRow[];
  comparison_matrix?: DynamicComparisonRow[];
  technical_verdict: string;
  key_findings?: KeyFindings;
  scores_by_slot?: SlotScore[];
}

export interface DynamicComparisonResult {
  detected_category: string;
  base_slot_id: number;
  comparison_matrix: DynamicComparisonRow[];
  specs_matrix?: SpecsMatrixRow[];
  technical_verdict?: string;
  executive_summary: string;
  key_findings?: KeyFindings;
  scores_by_slot?: SlotScore[];
  categories_summary?: {
    category: string;
    count: number;
    divergentCount: number;
  }[];
  pairwise_matrix?: Record<string, PairwiseComparison>;
}

