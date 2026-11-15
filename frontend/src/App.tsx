import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "./components/ThemeToggle";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/safety", label: "Safety" },
  { to: "/rank", label: "Rank" },
  { to: "/conditions", label: "Conditions" },
  { to: "/gaps", label: "Gaps" },
  { to: "/compare", label: "Compare" },
  { to: "/ask", label: "Ask" },
  { to: "/earth", label: "Earth" },
];

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-16">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:px-3 focus:py-1 focus:font-mono focus:text-sm focus:font-bold focus:text-black"
        style={{ backgroundColor: "var(--color-signal)" }}
      >
        Skip to content
      </a>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b py-3" style={{ borderColor: "var(--color-edge)" }}>
        <div className="flex items-baseline gap-3">
          <span className="num text-lg font-bold tracking-wide" style={{ color: "var(--color-signal)" }}>
            FLAMELAB
          </span>
          <span className="label hidden sm:inline">spacecraft fire-safety research explorer</span>
        </div>
        <ThemeToggle />
      </header>
      <nav aria-label="Primary" className="flex flex-wrap gap-1 py-3">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="navlink">
            {n.label}
          </NavLink>
        ))}
      </nav>
      <main id="main">
        <Outlet />
      </main>
      <footer className="mt-10 border-t pt-3 text-[13px]" style={{ borderColor: "var(--color-edge)", color: "var(--color-faint)" }}>
        FlameLab summarizes research data only — it must not give crew response procedures. Direct operational
        questions to mission safety authorities.
      </footer>
    </div>
  );
}
