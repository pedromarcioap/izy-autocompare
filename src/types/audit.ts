export type Platform = 'Shopee' | 'AliExpress' | 'Mercado Livre' | 'Amazon' | 'Shein' | 'Outro';

export interface ProductInput {
  name: string;
  price: string; // user input string, parsed to number
  shipping: string; // user input string, parsed to number
  platform: Platform;
  rawText: string;
}

export type SpecStatus = 'identical' | 'divergent' | 'missing_1' | 'missing_2' | 'both_missing';

export interface SpecItem {
  id: string;
  category: string;
  key: string;
  label: string;
  val1: string;
  val2: string;
  status: SpecStatus;
  diffNote?: string;
  winner?: 'p1' | 'p2' | 'tie' | 'neutral';
  isCustom?: boolean;
}

export interface FinancialComparison {
  p1Base: number;
  p1Ship: number;
  p1Total: number;
  p2Base: number;
  p2Ship: number;
  p2Total: number;
  diffNominal: number; // absolute difference
  diffPercent: number; // percentage relative to the more expensive or base
  cheaperSlot: 'p1' | 'p2' | 'equal';
  summaryText: string;
}

export interface ExecutiveVerdict {
  strengthsP1: string[];
  strengthsP2: string[];
  verdictTitle: string;
  costBenefitVerdict: string;
  recommendation: 'p1' | 'p2' | 'situational' | 'tie';
  targetAudienceP1?: string;
  targetAudienceP2?: string;
}

export interface AuditResult {
  product1: {
    name: string;
    platform: Platform;
    totalPrice: number;
  };
  product2: {
    name: string;
    platform: Platform;
    totalPrice: number;
  };
  financial: FinancialComparison;
  specs: SpecItem[];
  verdict: ExecutiveVerdict;
  generatedAt: string;
  stats: {
    totalSpecs: number;
    identicalCount: number;
    divergentCount: number;
    missingCount: number;
  };
}
