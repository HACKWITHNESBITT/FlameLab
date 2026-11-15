import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { rankEntry } from "../test/fixtures";

describe("ScoreBreakdown", () => {
  it("explains top drivers and the largest drag", () => {
    render(<ScoreBreakdown entry={rankEntry} />);
    expect(screen.getByText(/Top drivers/)).toBeInTheDocument();
    expect(screen.getAllByText(/airflow match/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Largest drag/)).toBeInTheDocument();
    expect(screen.getByText(/oxygen overlap.*unevaluated/)).toBeInTheDocument();
  });

  it("shows unevaluated factors as n/a with reasons, never as numbers", () => {
    render(<ScoreBreakdown entry={rankEntry} />);
    expect(screen.getAllByText("n/a").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/oxygen missing/).length).toBeGreaterThan(0);
    expect(screen.getByText(/0\.90/)).toBeInTheDocument(); // completeness
  });

  it("renders the contribution chart", () => {
    const { container } = render(<ScoreBreakdown entry={rankEntry} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
