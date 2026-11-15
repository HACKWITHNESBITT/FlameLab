import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppRoutes from "./routes";
import { moonBase, rankEntry } from "./test/fixtures";

const MISSING = { min: null, max: null, status: "missing" };

const ROUTES: [string, unknown][] = [
  ["/api/health", { status: "ok", version: "test", records: 11 }],
  ["/api/environments", [moonBase]],
  ["/api/rank", [rankEntry]],
  [
    "/api/investigations?limit=1000",
    [
      {
        id: "bass-ii",
        name: "BASS-II",
        psi_id: "PSI-1",
        hardware: "MSG",
        fuel_class: "solid",
        pillars: ["prevention"],
        gravity_regime: "microgravity",
        investigation_type: "microgravity",
        condition_ranges: { oxygen_percent: MISSING, pressure_psi: MISSING, airflow_cm_s: MISSING },
      },
    ],
  ],
  [
    "/api/investigations/saffire-i",
    {
      id: "saffire-i",
      psi_id: "PSI-2",
      name: "Saffire-I",
      hardware: { value: "other", status: "read", source: { doc: "glenn" } },
      gravity_regime: { value: "microgravity", status: "read", source: { doc: "glenn" } },
      fuel_class: { value: "solid", status: "read", source: { doc: "glenn" } },
      investigation_type: { value: "microgravity", status: "read", source: { doc: "glenn" } },
      safety_pillars: { value: ["prevention"], status: "read", source: { doc: "glenn" } },
      fuels: {
        value: [{ name: "SIBAL", phase: "solid", shape: "flat sheet", size: "0.4 m" }],
        status: "read",
        source: { doc: "glenn" },
      },
      test_conditions: {
        value: [
          {
            label: "Saffire-I burn",
            oxygen_percent: { value: { min: 21, max: 21 }, status: "read" },
            pressure_psi: { value: null, status: "missing" },
          },
        ],
        status: "read",
      },
      variables: { value: { varied: ["sample size"], held_constant: ["pressure"] }, status: "read" },
      measurements: { value: [{ sensor: "camera", quantity: "flame spread" }], status: "read" },
      data_quality: { value: { completeness: "partial" }, status: "read" },
    },
  ],
  [
    "/api/conditions",
    {
      investigations: [
        {
          id: "bass-ii",
          groups: [
            {
              label: "g1",
              oxygen_percent: { min: 21, max: 30, status: "present" },
              pressure_psi: { min: 14, max: 14, status: "present" },
              airflow_cm_s: { min: 5, max: 20, status: "present" },
            },
          ],
        },
      ],
      zones: [
        {
          environment: "moon_base",
          label: "Moon base",
          oxygen_percent: { min: 30, max: null },
          pressure_psi: { min: null, max: 10.2 },
          airflow_cm_s: { min: 5, max: 20 },
        },
      ],
    },
  ],
  [
    "/api/gaps",
    [
      {
        gap: "partial_gravity",
        title: "No partial-gravity combustion data",
        detail: "PSI holds microgravity and normal-gravity results only.",
        bounds: ["bass-ii"],
      },
    ],
  ],
  [
    "/api/compare",
    {
      ids: ["bass-ii", "saffire-i"],
      aligned: { "bass-ii": { hardware: "MSG" }, "saffire-i": { hardware: "other" } },
      similarities: [],
      differences: [{ field: "hardware", values: { "bass-ii": "MSG", "saffire-i": "other" } }],
    },
  ],
  [
    "/api/export",
    {
      ids: ["bass-ii", "saffire-i"],
      fields: ["id", "name"],
      rows: [
        { id: "bass-ii", name: "BASS-II" },
        { id: "saffire-i", name: "Saffire-I" },
      ],
    },
  ],
  [
    "/api/earth-applications",
    [{ application: "smoke detector test", investigation: null, source: "https://example.com", note: "a note" }],
  ],
];

function mockApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown) => {
      const path = String(url).split("?")[0];
      if (String(url).startsWith("/api/si/")) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: { code: "si_unavailable", message: "no key" } }),
        } as unknown as Response;
      }
      const hit = [...ROUTES].reverse().find(([p]) => path === p || String(url).startsWith(`${p}?`) || (p.includes("?") && String(url).startsWith(p)));
      if (!hit) throw new Error(`unmocked ${url}`);
      return { ok: true, status: 200, json: async () => hit[1] } as unknown as Response;
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

function renderAt(entry: string) {
  mockApi();
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("app smoke: every route renders against the API contract", () => {
  it("rank: list with expandable breakdown", async () => {
    renderAt("/");
    await screen.findByText("BASS-II");
    fireEvent.click(screen.getAllByRole("button", { name: "Why this rank" })[0]);
    await screen.findByText(/Top drivers/);
  });

  it("detail: record, tables, and SI-unavailable panel", async () => {
    renderAt("/investigations/saffire-i");
    await screen.findByRole("heading", { name: "Saffire-I" });
    expect(await screen.findByText("Fuels")).toBeInTheDocument();
    expect(await screen.findByText(/si_unavailable/)).toBeInTheDocument();
  });

  it("conditions: map renders", async () => {
    renderAt("/conditions");
    expect(await screen.findByRole("img", { name: /conditions map/ })).toBeInTheDocument();
  });

  it("gaps: gap cards with bounds", async () => {
    renderAt("/gaps");
    expect(await screen.findByText("No partial-gravity combustion data")).toBeInTheDocument();
  });

  it("compare: aligned table plus export", async () => {
    renderAt("/compare?ids=bass-ii,saffire-i");
    expect(await screen.findByText("Aligned fields")).toBeInTheDocument();
    expect(await screen.findByText("Export for modeling")).toBeInTheDocument();
  });

  it("ask: form renders", async () => {
    renderAt("/ask");
    expect(await screen.findByLabelText("Question")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask" })).toBeInTheDocument();
  });

  it("earth: applications list", async () => {
    renderAt("/earth");
    expect(await screen.findByText("smoke detector test")).toBeInTheDocument();
  });
});
