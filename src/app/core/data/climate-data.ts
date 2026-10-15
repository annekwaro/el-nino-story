/* ==========================================================================
   Data contract for the preprocessing script.

   Files live in src/assets/data/ and are served at assets/data/.
   Every file is plain JSON matching one of the *File interfaces below.
   The parse* functions check that contract at runtime and throw a message
   naming the file and the first problem found, so a bad export fails loudly.
   ========================================================================== */

/** Calendar month as 'YYYY-MM', zero-padded: '1997-12'. */
export type MonthKey = string;

export type EnsoPhase = 'el-nino' | 'la-nina';

/* ---------- assets/data/nino34-index.json ---------- */

export interface Nino34IndexFile {
  /** Provenance for the credits, e.g. "NOAA ERSSTv5, Niño 3.4 region (5°N–5°S, 170°W–120°W)". */
  source: string;
  /** Climatology the anomalies are relative to, e.g. "1991–2020". */
  baseline: string;
  /**
   * One entry per calendar month, ascending, with no gaps and no duplicates.
   * Expected span: 1950-01 through 2024-12 (900 entries).
   */
  months: Nino34Month[];
}

export interface Nino34Month {
  month: MonthKey;
  /** Monthly Niño 3.4 SST anomaly in °C. Always a finite number, never null. */
  anomaly: number;
}

/* ---------- assets/data/sst-anomaly-{YYYYMM}.json ----------
   One file per month the page can show, e.g. sst-anomaly-199712.json.
   At minimum: every month listed in ENSO_EVENTS. */

export interface SstAnomalyFile {
  /** Must match the file name: sst-anomaly-199712.json → '1997-12'. */
  month: MonthKey;
  source: string;
  baseline: string;
  /**
   * Cell-centre latitudes in °N (south is negative), evenly spaced and strictly monotonic.
   * Either direction works; the map puts north at the top. Suggested: 30°S to 30°N.
   */
  lats: number[];
  /**
   * Cell-centre longitudes in °E on a 0–360 scale (so the Pacific doesn't wrap at the
   * dateline), evenly spaced and strictly increasing. Suggested: 120°E to 290°E (70°W).
   */
  lons: number[];
  /**
   * values[i][j] is the anomaly in °C at lats[i], lons[j].
   * Exactly lats.length rows of lons.length entries. null means land or no data.
   * Do not clip: the map clamps to its own ±3 °C colour range.
   */
  values: (number | null)[][];
}

/* ---------- URLs ---------- */

export const NINO34_INDEX_URL = 'assets/data/nino34-index.json';

export function sstAnomalyUrl(month: MonthKey): string {
  return `assets/data/sst-anomaly-${month.replace('-', '')}.json`;
}

/* ---------- Loading ---------- */

export async function fetchJson(url: string, abortSignal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal: abortSignal });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  // Dev servers can answer a missing asset with index.html and a 200.
  if (!(res.headers.get('content-type') ?? '').includes('json')) {
    throw new Error(`${url}: not found`);
  }
  return res.json();
}

/* ---------- Validation ---------- */

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parseNino34Index(raw: unknown, url: string): Nino34IndexFile {
  const fail = (problem: string): never => {
    throw new Error(`${url}: ${problem}`);
  };
  const file = raw as Nino34IndexFile;
  if (!file || !Array.isArray(file.months) || file.months.length === 0) fail('missing "months"');

  let previous: MonthKey | null = null;
  for (const entry of file.months) {
    if (!MONTH_PATTERN.test(entry?.month)) fail(`bad month ${JSON.stringify(entry)}`);
    if (!Number.isFinite(entry.anomaly)) fail(`non-numeric anomaly at ${entry.month}`);
    if (previous && entry.month !== nextMonth(previous)) {
      fail(`expected ${nextMonth(previous)} after ${previous}, got ${entry.month}`);
    }
    previous = entry.month;
  }
  return file;
}

export function parseSstAnomaly(raw: unknown, month: MonthKey, url: string): SstAnomalyFile {
  const fail = (problem: string): never => {
    throw new Error(`${url}: ${problem}`);
  };
  const file = raw as SstAnomalyFile;
  if (!file || file.month !== month) fail(`"month" should be ${month}`);
  if (!isMonotonic(file.lats)) fail('"lats" must be strictly monotonic, length ≥ 2');
  if (!isMonotonic(file.lons) || file.lons[1] < file.lons[0]) {
    fail('"lons" must be strictly increasing, length ≥ 2');
  }
  if (!Array.isArray(file.values) || file.values.length !== file.lats.length) {
    fail(`"values" needs ${file.lats.length} rows`);
  }
  file.values.forEach((row, i) => {
    if (!Array.isArray(row) || row.length !== file.lons.length) {
      fail(`row ${i} needs ${file.lons.length} values`);
    }
    if (!row.every((v) => v === null || Number.isFinite(v))) fail(`row ${i} has a non-numeric value`);
  });
  return file;
}

function isMonotonic(values: unknown): values is number[] {
  if (!Array.isArray(values) || values.length < 2) return false;
  const sign = Math.sign(values[1] - values[0]);
  return sign !== 0 && values.every((v, i) => i === 0 || Math.sign(v - values[i - 1]) === sign);
}

/* ---------- Month helpers ---------- */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function nextMonth(month: MonthKey): MonthKey {
  const [year, m] = month.split('-').map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;
}

export function monthToDate(month: MonthKey): Date {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1);
}

/** '1997-12' → 'Dec 1997' */
export function formatMonth(month: MonthKey): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

/** 2.41 → '+2.4 °C', −1.6 → '−1.6 °C' (true minus sign). */
export function formatAnomaly(value: number, digits = 1, unit = ' °C'): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}${unit}`;
}
