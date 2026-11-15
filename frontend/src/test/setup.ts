import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest doesn't provide the globals RTL uses for auto-cleanup.
afterEach(() => cleanup());
