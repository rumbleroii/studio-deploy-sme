import { Option, MatrixRow } from '../types/survey';

export interface OrderingConfig {
  type: 'fixed' | 'alphabetical' | 'random';
  randomSeed?: string;
  anchors?: {
    optionId: string | number;
    position: number | 'first' | 'last';
  }[];
  otherSpecifyPosition?: 'bottom' | 'above_exclusive';
  exclusiveAtBottom?: boolean;
}

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return function() {
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const result = [...array];
  const random = seededRandom(seed);
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

export function applyOptionOrdering(
  options: Option[],
  config?: OrderingConfig,
  metadata?: {
    randomize?: boolean;
    anchor?: (string | number)[];
    exclusiveOptions?: (string | number)[];
    hasOtherOption?: boolean;
    otherOptionId?: string | number;
  },
  respondentSeed?: string
): Option[] {
  if (!options || options.length === 0) return options;
  
  const effectiveConfig: OrderingConfig = config || {
    type: metadata?.randomize ? 'random' : 'fixed',
    anchors: metadata?.anchor?.map(id => ({ optionId: id, position: 'last' as const })),
    exclusiveAtBottom: true,
  };
  
  const anchorIds = new Set<string | number>(
    effectiveConfig.anchors?.map(a => a.optionId) || 
    metadata?.anchor?.map(id => id) || 
    []
  );
  const exclusiveIds = new Set<string | number>(metadata?.exclusiveOptions?.map(id => id) || []);
  const otherOptionId = metadata?.otherOptionId;
  
  const anchoredOptions: Option[] = [];
  const exclusiveOptions: Option[] = [];
  const otherOption: Option | undefined = options.find(
    opt => otherOptionId !== undefined && String(opt.id) === String(otherOptionId)
  );
  const regularOptions: Option[] = [];
  
  for (const opt of options) {
    if (otherOptionId !== undefined && String(opt.id) === String(otherOptionId)) {
      continue;
    } else if (exclusiveIds.has(opt.id) || exclusiveIds.has(String(opt.id)) || exclusiveIds.has(Number(opt.id))) {
      exclusiveOptions.push(opt);
    } else if (anchorIds.has(opt.id) || anchorIds.has(String(opt.id)) || anchorIds.has(Number(opt.id))) {
      anchoredOptions.push(opt);
    } else {
      regularOptions.push(opt);
    }
  }
  
  let orderedRegular: Option[];
  
  switch (effectiveConfig.type) {
    case 'alphabetical':
      orderedRegular = [...regularOptions].sort((a, b) => 
        a.label.localeCompare(b.label)
      );
      break;
    case 'random':
      const seed = respondentSeed || effectiveConfig.randomSeed || 'default';
      orderedRegular = shuffleWithSeed(regularOptions, seed);
      break;
    case 'fixed':
    default:
      orderedRegular = regularOptions;
  }
  
  const result: Option[] = [...orderedRegular];
  
  if (otherOption) {
    result.push(otherOption);
  }
  
  if (effectiveConfig.exclusiveAtBottom !== false) {
    result.push(...exclusiveOptions);
    result.push(...anchoredOptions.filter(opt => {
      return !exclusiveIds.has(opt.id) && !exclusiveIds.has(String(opt.id)) && !exclusiveIds.has(Number(opt.id));
    }));
  } else {
    result.push(...anchoredOptions, ...exclusiveOptions);
  }
  
  return result;
}

export function applyMatrixRowOrdering(
  rows: MatrixRow[],
  config?: OrderingConfig,
  respondentSeed?: string
): MatrixRow[] {
  if (!rows || rows.length === 0) return rows;
  if (!config || config.type === 'fixed') return rows;
  
  switch (config.type) {
    case 'alphabetical':
      return [...rows].sort((a, b) => a.label.localeCompare(b.label));
    case 'random':
      const seed = respondentSeed || config.randomSeed || 'default';
      return shuffleWithSeed(rows, seed);
    default:
      return rows;
  }
}

export function applyMatrixColumnOrdering(
  columns: Option[],
  config?: OrderingConfig,
  respondentSeed?: string
): Option[] {
  if (!columns || columns.length === 0) return columns;
  if (!config || config.type === 'fixed') return columns;
  
  switch (config.type) {
    case 'alphabetical':
      return [...columns].sort((a, b) => a.label.localeCompare(b.label));
    case 'random':
      const seed = respondentSeed || config.randomSeed || 'default';
      return shuffleWithSeed(columns, seed);
    default:
      return columns;
  }
}
