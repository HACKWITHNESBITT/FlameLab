/** Types mirroring docs/API.md and docs/DATA_SCHEMA.md. Thin client: no math here. */

export interface ApiErrorBody {
  code: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface RangeValue {
  min: number | null;
  max: number | null;
  source?: string;
  note?: string;
}

export interface RangeStatus {
  min: number | null;
  max: number | null;
  status: "present" | "missing";
}

export interface Environment {
  id: string;
  label: string;
  oxygen_percent: RangeValue;
  pressure_psi: RangeValue;
  airflow_cm_s: RangeValue;
  gravity: string;
  gravity_note?: string;
  pillars_emphasized?: string[];
  assumptions?: string[];
}

export type Lens = "all" | "prevention" | "detection" | "suppression";

export interface ConditionRanges {
  oxygen_percent: RangeStatus;
  pressure_psi: RangeStatus;
  airflow_cm_s: RangeStatus;
}

export interface InvestigationSummary {
  id: string;
  name: string;
  psi_id: string;
  hardware: string | null;
  fuel_class: string | null;
  pillars: string[];
  gravity_regime: string | null;
  investigation_type: string | null;
  condition_ranges: ConditionRanges;
}

export interface FactorScore {
  factor: string;
  score: number | null;
  weight: number;
  contribution: number;
  fields: string[];
  status: "evaluated" | "insufficient_data";
}

export interface RankEntry {
  id: string;
  score: number | null;
  rank_value: number;
  insufficient_data: boolean;
  evidence: {
    completeness: number;
    coverage: number;
    evaluated: string[];
    unevaluated: { factor: string; reason: string }[];
  };
  modeling_readiness: number;
  equipment_relevance: number | null;
  factors: FactorScore[];
  flags: string[];
}

export interface CompareResult {
  ids: string[];
  aligned: Record<string, Record<string, unknown>>;
  similarities: { field: string; values: Record<string, unknown> }[];
  differences: { field: string; values: Record<string, unknown> }[];
}

export interface ConditionGroup {
  label: string;
  oxygen_percent: RangeStatus;
  pressure_psi: RangeStatus;
  airflow_cm_s: RangeStatus;
}

export interface ConditionsResult {
  investigations: { id: string; groups: ConditionGroup[] }[];
  zones: {
    environment: string;
    label: string;
    oxygen_percent: RangeValue;
    pressure_psi: RangeValue;
    airflow_cm_s: RangeValue;
  }[];
}

export interface Gap {
  gap: string;
  title: string;
  detail: string;
  bounds: string[];
}

export interface SiItem {
  text: string;
  citations: string[];
}

export interface SiSummary {
  id: string;
  findings: SiItem[];
  interpretation: SiItem[];
  gaps: string[];
  verification: { passed: boolean };
}

export interface SiCompare {
  ids: string[];
  environment: string;
  similarities: SiItem[];
  differences: SiItem[];
  verification: { passed: boolean };
}

export interface AskResult {
  answer: string;
  citations: string[];
  covered: boolean;
  missing: string[];
  verification: { passed: boolean };
}

export interface ExportJson {
  ids: string[];
  fields: string[];
  rows: Record<string, unknown>[];
}

export interface ExportCsv {
  ids: string[];
  format: "csv";
  csv: string;
}

export interface EarthApplication {
  application: string;
  investigation: string | null;
  source: string;
  note: string;
}

export type FieldStatus = "read" | "inferred" | "missing" | "ambiguous";

export interface Wrapped<T = unknown> {
  value: T;
  unit?: string;
  status: FieldStatus;
  source?: Record<string, unknown>;
  note?: string;
}

/** Full curated record: plain identity fields plus wrapped schema fields. */
export interface FlamelabRecord {
  id: string;
  psi_id?: string;
  name?: string;
  acronym_expansion?: string;
  project?: string;
  platform?: string;
  psi_url?: string;
  doi_citation?: string;
  related?: string[];
  [key: string]: unknown;
}

export function isWrapped(v: unknown): v is Wrapped {
  return (
    typeof v === "object" &&
    v !== null &&
    "value" in v &&
    "status" in v &&
    typeof (v as Wrapped).status === "string"
  );
}
