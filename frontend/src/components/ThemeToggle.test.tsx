import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

describe("ThemeToggle", () => {
  it("defaults to dark and toggles to light with persistence", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: "Switch to light mode" });
    expect(btn).toHaveTextContent("Theme: dark");
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toHaveTextContent("Theme: light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("flamelab-theme")).toBe("light");
  });

  it("honors a stored preference", () => {
    localStorage.setItem("flamelab-theme", "light");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });
});
