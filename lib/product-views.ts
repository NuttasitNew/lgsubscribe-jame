/** View counters start 1 Aug 2026 00:00 ICT. Site traffic averages 3,000 visits/day. */

export const VIEW_EPOCH_MS = Date.parse("2026-08-01T00:00:00+07:00");
export const SITE_DAILY_VIEWS = 3000;
export const PRODUCT_PAGES_PER_SITE_VISIT = 1.32;
/** Product orders stay well below page views so the two numbers read as different signals. */
export const ORDERS_PER_PRODUCT_VIEW = 0.042;

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Relative visits by Bangkok hour. Night is quiet, 18:00-21:00 is the peak. */
const HOUR_WEIGHTS = [
  4, 3, 2, 2, 2, 4, 8, 16, 26, 31, 32, 33, 35, 30, 28, 27, 29, 34, 41, 48, 50, 43, 27, 12,
] as const;

const HOUR_WEIGHT_SUM = HOUR_WEIGHTS.reduce((total, weight) => total + weight, 0);

/** Sun-Sat multipliers. Average is 1.0 so a full week still lands on 3,000/day. */
const WEEKDAY_WEIGHTS = [0.88, 1.02, 1.08, 1.1, 1.08, 1.0, 0.84] as const;

/**
 * Hand-set relative traffic per model. Normalized at runtime so the catalog
 * shares ~1.32 product-page views per site visit (one person often opens 2-3 models).
 */
export const productViewWeights: Record<string, number> = {
  WD516AN: 220,
  WD518AN: 198,
  WD110MN: 151,
  SAQ13A: 176,
  SAQ11A: 172,
  ART13A: 168,
  SIQ11B: 164,
  SIQ13B: 158,
  ART18A: 154,
  SAQ18B: 148,
  SIQ18B: 144,
  SAQ24B: 136,
  SIQ24B: 128,
  ZT1Q12GULA1: 95,
  ZT4Q18GPLA1: 92,
  ZT1Q18GTLA1: 90,
  ZT4Q24GPLA1: 89,
  ZT1Q24GTLA1: 85,
  ZT4Q36GNLA1: 83,
  ZT4Q48GMLA1: 78,
  ZTRQ36GYLA1: 74,
  ZTRQ48GYLA1: 68,
  AS60GHWG0: 141,
  AS25GCBY0: 111,
  AS65GDBY0: 101,
  AS10GDBY0: 81,
  DD23GMWE1: 86,
  DFC533FV: 73,
  DFC335HM: 59,
  MS3032JAS: 56,
  X257CMEW: 146,
  X24FFCRB: 121,
  G24FFQKB: 109,
  X257CMHW: 97,
  S3MFC: 106,
  S70TY: 161,
  S95TR: 131,
  QNED80B: 119,
  "StandbyME 2": 87,
  "65NU855BPSA": 79,
  "75NU855BPSA": 72,
  GRAB: 71,
  BOUNCE: 63,
  STAGE301: 47,
  "A9T-LITE": 102,
  "A9T-CORE": 93,
  "A9T-ULTRA": 84,
  F2520RNTB: 142,
  FV1413H4M: 133,
  WT1410NHEG: 124,
  TX2723ST5J: 116,
  WT2116SHEG: 88,
  WT2520NHEG: 77,
  "32U889SA": 57,
  L257SFZW: 135,
  J257SQZW: 123,
  V22FFQMB: 117,
  B48FPGAM: 108,
  "GV-V25FFGRB": 103,
  "GN-F452PQAK": 96,
  "GN-V389FQEF": 91,
  WT1410NHEN: 122,
  WT2520NHEN: 75,
  FV1413S4M: 127,
  TX2315DT5G: 82,
  RV10VHP2B: 69,
  OLED77C6PSA: 114,
  OLED65C6PSA: 107,
  OLED55C6PSA: 98,
  "OLED77C6PSA.S80TY": 80,
  "OLED65C6PSA.S80TY": 67,
  "OLED55C6PSA.S30A": 62,
  "65QNED80BSA": 113,
  "85QNED80BSA": 66,
  "100QNED86BS": 55,
  "100MRGB96BS": 53,
  "32LX6BDGA": 104,
  "45GX950A-B": 58,
  "52G930B-B": 54,
  "40U990A-W": 52,
  "34U650A-B": 46,
  "32U889SA.GRAB": 45,
  "27LX6TDGA.GRAB": 43,
};

const DEFAULT_PRODUCT_WEIGHT = 70;

let cachedWeightTotal: number | null = null;

export type ViewSnapshot = {
  total: number;
  current: number;
};

export function getProductViewWeight(model: string) {
  return productViewWeights[model] ?? DEFAULT_PRODUCT_WEIGHT;
}

export function getProductViewWeightTotal() {
  if (cachedWeightTotal === null) {
    cachedWeightTotal = Object.values(productViewWeights).reduce((total, weight) => total + weight, 0);
  }
  return cachedWeightTotal;
}

export function getProductDailyViews(model: string) {
  return (
    SITE_DAILY_VIEWS *
    PRODUCT_PAGES_PER_SITE_VISIT *
    (getProductViewWeight(model) / getProductViewWeightTotal())
  );
}

export function getSiteViewsAt(nowMs: number) {
  return quantizeViews(expectedSiteViewsAt(nowMs), 1);
}

export function getProductViewsAt(model: string, nowMs: number) {
  return quantizeViews(expectedProductViewsAt(model, nowMs), modelSalt(model));
}

export function getProductOrdersAt(model: string, nowMs: number) {
  return quantizeViews(expectedProductOrdersAt(model, nowMs), modelSalt(model) ^ 0x9e3779b9);
}

export function getSiteViewSnapshot(nowMs: number): ViewSnapshot {
  return {
    total: getSiteViewsAt(nowMs),
    current: estimateCurrentViewers(siteRatePerSecond(nowMs), nowMs, 1, 180),
  };
}

export function getProductViewSnapshot(model: string, nowMs: number): ViewSnapshot {
  const salt = modelSalt(model);
  return {
    total: getProductViewsAt(model, nowMs),
    current: estimateCurrentViewers(productRatePerSecond(model, nowMs), nowMs, salt, 480),
  };
}

export function formatViewCount(count: number) {
  return Math.max(0, count).toLocaleString("th-TH");
}

export function expectedSiteViewsAt(nowMs: number) {
  if (nowMs <= VIEW_EPOCH_MS) return 0;

  let total = 0;
  let dayStart = VIEW_EPOCH_MS;

  while (dayStart + DAY_MS <= nowMs) {
    total += SITE_DAILY_VIEWS * weekdayWeight(dayStart);
    dayStart += DAY_MS;
  }

  total += SITE_DAILY_VIEWS * weekdayWeight(dayStart) * dayTrafficProgress(nowMs - dayStart);
  return total;
}

export function expectedProductViewsAt(model: string, nowMs: number) {
  return expectedSiteViewsAt(nowMs) * PRODUCT_PAGES_PER_SITE_VISIT * productShare(model);
}

export function expectedProductOrdersAt(model: string, nowMs: number) {
  return expectedProductViewsAt(model, nowMs) * ORDERS_PER_PRODUCT_VIEW;
}

function productShare(model: string) {
  return getProductViewWeight(model) / getProductViewWeightTotal();
}

function weekdayWeight(dayStartMs: number) {
  return WEEKDAY_WEIGHTS[bangkokWeekday(dayStartMs)];
}

function bangkokWeekday(ms: number) {
  return new Date(ms + BANGKOK_OFFSET_MS).getUTCDay();
}

function bangkokHour(ms: number) {
  return new Date(ms + BANGKOK_OFFSET_MS).getUTCHours();
}

function dayTrafficProgress(elapsedMs: number) {
  const clamped = Math.min(Math.max(elapsedMs, 0), DAY_MS);
  const hourFloat = clamped / (60 * 60 * 1000);
  const completedHours = Math.floor(hourFloat);
  const partialHour = hourFloat - completedHours;

  let passed = 0;
  for (let hour = 0; hour < completedHours; hour += 1) {
    passed += HOUR_WEIGHTS[hour];
  }
  if (completedHours < 24) {
    passed += HOUR_WEIGHTS[completedHours] * partialHour;
  }
  return passed / HOUR_WEIGHT_SUM;
}

function siteRatePerSecond(nowMs: number) {
  if (nowMs < VIEW_EPOCH_MS) return 0;
  const dayStart = VIEW_EPOCH_MS + Math.floor((nowMs - VIEW_EPOCH_MS) / DAY_MS) * DAY_MS;
  const hour = bangkokHour(nowMs);
  return (SITE_DAILY_VIEWS * weekdayWeight(dayStart) * (HOUR_WEIGHTS[hour] / HOUR_WEIGHT_SUM)) / 3600;
}

function productRatePerSecond(model: string, nowMs: number) {
  return siteRatePerSecond(nowMs) * PRODUCT_PAGES_PER_SITE_VISIT * productShare(model);
}

function estimateCurrentViewers(ratePerSecond: number, nowMs: number, salt: number, windowSeconds: number) {
  const mean = ratePerSecond * windowSeconds;
  const windowId = Math.floor(nowMs / 16_000);
  const noise = hash01(windowId ^ salt) - 0.38;
  const sample = mean + noise * Math.sqrt(mean + 0.35) * 1.7;
  return Math.max(0, Math.round(sample));
}

function quantizeViews(expected: number, salt: number) {
  if (expected <= 0) return 0;
  const previous = Math.floor(expected);
  const fraction = expected - previous;
  const threshold = 0.12 + hash01(previous * 1_000_003 + salt) * 0.76;
  return fraction >= threshold ? previous + 1 : previous;
}

function modelSalt(model: string) {
  let hash = 2166136261;
  for (let index = 0; index < model.length; index += 1) {
    hash ^= model.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hash01(value: number) {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 0x100000000;
}
