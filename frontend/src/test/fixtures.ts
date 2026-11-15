import type { Environment, RankEntry } from "../api/types";

export const moonBase: Environment = {
  id: "moon_base",
  label: "Moon base",
  oxygen_percent: { min: 30, max: null, source: "brief" },
  pressure_psi: { min: null, max: 10.2, source: "brief" },
  airflow_cm_s: { min: 5, max: 20, source: "assumption" },
  gravity: "partial_gravity_no_data",
  gravity_note: "Moon gravity sits between microgravity and normal gravity.",
  pillars_emphasized: ["prevention", "detection", "suppression"],
  assumptions: ["airflow range is an assumption"],
};

export const rankEntry: RankEntry = {
  id: "bass-ii",
  score: 0.6543,
  rank_value: 0.4123,
  insufficient_data: false,
  evidence: {
    completeness: 0.9,
    coverage: 0.7,
    evaluated: ["airflow_match", "fuel_relevance", "hardware_scale", "pillar_fit"],
    unevaluated: [
      { factor: "oxygen_overlap", reason: "oxygen missing" },
      { factor: "pressure_overlap", reason: "pressure missing" },
      { factor: "gravity_relevance", reason: "partial gravity: no data" },
    ],
  },
  modeling_readiness: 0.75,
  equipment_relevance: 0.5,
  factors: [
    { factor: "oxygen_overlap", score: null, weight: 3, contribution: 0, fields: ["test_conditions.oxygen_percent"], status: "insufficient_data" },
    { factor: "pressure_overlap", score: null, weight: 1, contribution: 0, fields: ["test_conditions.pressure_psi"], status: "insufficient_data" },
    { factor: "airflow_match", score: 1.0, weight: 2, contribution: 0.15, fields: ["test_conditions.airflow_cm_s"], status: "evaluated" },
    { factor: "fuel_relevance", score: 0.8, weight: 2, contribution: 0.12, fields: ["fuels", "fuel_class"], status: "evaluated" },
    { factor: "hardware_scale", score: 0.5, weight: 1, contribution: 0.04, fields: ["hardware", "fuels.size"], status: "evaluated" },
    { factor: "gravity_relevance", score: null, weight: 2, contribution: 0, fields: ["gravity_regime"], status: "insufficient_data" },
    { factor: "pillar_fit", score: 1.0, weight: 2, contribution: 0.15, fields: ["safety_pillars"], status: "evaluated" },
  ],
  flags: ["partial gravity: no Moon/Mars-g data"],
};
