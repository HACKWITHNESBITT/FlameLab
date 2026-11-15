import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AskWidget } from "./AskWidget";
import { moonBase } from "../test/fixtures";

const ANSWER = {
  answer: "Saffire-I tested large fires. [rec:saffire-i#fuels]",
  citations: ["rec:saffire-i#fuels"],
  covered: true,
  missing: [],
  verification: { passed: true },
};

function mockApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown) => {
      const data = String(url).startsWith("/api/ask") ? ANSWER : [moonBase];
      return { ok: true, status: 200, json: async () => data } as unknown as Response;
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("AskWidget", () => {
  it("opens, sends a question, and renders the cited answer", async () => {
    mockApi();
    render(
      <MemoryRouter>
        <AskWidget />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open ask chat" }));
    fireEvent.change(await screen.findByLabelText("Chat input"), {
      target: { value: "What did Saffire-I test?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/Saffire-I tested large fires/)).toBeInTheDocument();
    expect(screen.getByText("rec:saffire-i#fuels")).toBeInTheDocument();
    expect(screen.getByText("What did Saffire-I test?")).toBeInTheDocument();
  });

  it("persists history across mounts", async () => {
    mockApi();
    const first = render(
      <MemoryRouter>
        <AskWidget />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open ask chat" }));
    fireEvent.change(await screen.findByLabelText("Chat input"), { target: { value: "hi there" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText(/Saffire-I tested large fires/);
    first.unmount();
    render(
      <MemoryRouter>
        <AskWidget />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open ask chat" }));
    expect(await screen.findByText("hi there")).toBeInTheDocument();
  });
});
