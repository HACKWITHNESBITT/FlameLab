import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConditionsChart } from "./ConditionsChart";

const ROWS = [
  { id: "bass", ranges: [{ label: "g1", min: 17, max: 17 }] },
  {
    id: "flex",
    ranges: [
      { label: "g1", min: 10, max: 50 },
      { label: "g2", min: 21, max: 21 },
    ],
  },
  { id: "saffire-i", ranges: [] },
];

describe("ConditionsChart", () => {
  it("renders ranges, points, zone, and explicit gaps", () => {
    render(
      <ConditionsChart
        rows={ROWS}
        zone={{ min: 30, max: null }}
        zoneLabel="Moon base"
        quantity="oxygen"
      />,
    );
    expect(screen.getByRole("img", { name: /oxygen test ranges/i })).toBeInTheDocument();
    expect(screen.getByText("TARGET · Moon base")).toBeInTheDocument();
    expect(screen.getByText("NO DATA")).toBeInTheDocument();
    expect(screen.getByText(/2 of 3 investigations report oxygen ranges/)).toBeInTheDocument();
    // Row labels link to the record detail.
    expect(screen.getByText("flex").closest("a")?.getAttribute("href")).toBe("#/investigations/flex");
  });

  it("notes a missing reference zone instead of drawing one", () => {
    render(<ConditionsChart rows={ROWS} zone={null} zoneLabel="Moon base" quantity="airflow" />);
    expect(screen.queryByText(/TARGET/)).toBeNull();
    expect(screen.getByText(/no reference airflow zone/)).toBeInTheDocument();
  });
});
