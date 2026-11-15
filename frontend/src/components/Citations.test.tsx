import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SiText } from "./Citations";
import { stripTokens } from "../utils/citations";

describe("stripTokens", () => {
  it("removes citation tokens and collapses whitespace", () => {
    expect(stripTokens("Burns in space.  [rec:bass-ii#fuels]")).toBe("Burns in space.");
  });
});

describe("SiText", () => {
  it("hides raw tokens and links chips to the cited record", () => {
    render(
      <MemoryRouter>
        <SiText text="Burns. [rec:bass-ii#fuels]" citations={["rec:bass-ii#fuels"]} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/\[rec:/)).toBeNull();
    const chip = screen.getByText("rec:bass-ii#fuels");
    expect(chip.closest("a")?.getAttribute("href")).toBe("/investigations/bass-ii");
  });
});
