export type QuantityKey = "oxygen" | "pressure" | "airflow";

export const QUANTITIES: Record<QuantityKey, { label: string; unit: string }> = {
  oxygen: { label: "OXYGEN", unit: "%" },
  pressure: { label: "PRESSURE", unit: "psi" },
  airflow: { label: "AIRFLOW", unit: "cm/s" },
};

export interface ChartRange {
  label: string;
  min: number | null;
  max: number | null;
}

export interface ChartRow {
  id: string;
  ranges: ChartRange[];
}
