import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldValue } from "./FieldValue";

describe("FieldValue", () => {
  it("renders missing fields as a gap, never zero", () => {
    render(<FieldValue label="oxygen" field={{ value: null, status: "missing" }} />);
    expect(screen.getByText("missing")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows inferred status with its note", () => {
    render(
      <FieldValue
        label="fuel"
        field={{ value: "solid", status: "inferred", note: "from imagery", source: { doc: "psi" } }}
      />,
    );
    expect(screen.getByText("inferred")).toBeInTheDocument();
    expect(screen.getByText(/from imagery/)).toBeInTheDocument();
    expect(screen.getByText(/src:/)).toBeInTheDocument();
  });

  it("renders ranges and units", () => {
    render(
      <FieldValue
        label="oxygen"
        field={{ value: { min: 30, max: 85 }, unit: "%", status: "read", source: { doc: "psi" } }}
      />,
    );
    expect(screen.getByText(/30 – 85/)).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });
});
