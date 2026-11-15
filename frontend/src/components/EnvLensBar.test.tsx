import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnvLensBar } from "./EnvLensBar";
import { moonBase } from "../test/fixtures";

describe("EnvLensBar", () => {
  it("shows assumptions and the partial-gravity caveat", () => {
    render(
      <EnvLensBar environments={[moonBase]} env="moon_base" onEnv={() => {}} lens="all" onLens={() => {}} />,
    );
    expect(screen.getByText("Moon base")).toBeInTheDocument();
    expect(screen.getByText(/airflow range is an assumption/)).toBeInTheDocument();
    expect(screen.getByText(/Partial-gravity environment/)).toBeInTheDocument();
  });

  it("marks the active lens and reports changes", () => {
    const onLens = vi.fn();
    render(
      <EnvLensBar environments={[moonBase]} env="moon_base" onEnv={() => {}} lens="all" onLens={onLens} />,
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Detection" }));
    expect(onLens).toHaveBeenCalledWith("detection");
  });
});
