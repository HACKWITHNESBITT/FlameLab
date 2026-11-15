import { Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import OverviewPage from "./pages/OverviewPage.tsx";
import RankPage from "./pages/RankPage.tsx";
import SafetyPage from "./pages/SafetyPage.tsx";
import DetailPage from "./pages/DetailPage.tsx";
import ConditionsPage from "./pages/ConditionsPage.tsx";
import GapsPage from "./pages/GapsPage.tsx";
import ComparePage from "./pages/ComparePage.tsx";
import EarthPage from "./pages/EarthPage.tsx";

/** Route table shared by the app entry (HashRouter) and the smoke test (MemoryRouter). */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<App />}>
        <Route index element={<OverviewPage />} />
        <Route path="safety" element={<SafetyPage />} />
        <Route path="rank" element={<RankPage />} />
        <Route path="investigations/:id" element={<DetailPage />} />
        <Route path="conditions" element={<ConditionsPage />} />
        <Route path="gaps" element={<GapsPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="earth" element={<EarthPage />} />
      </Route>
    </Routes>
  );
}
