# FlameLab Data Operations Guide: Triage, Schema Extraction & Pipeline Execution
*Challenge: Flame in Freefall (NASA Space Apps) | Team Execution Reference*

## Overview
The NASA Physical Sciences Informatics (PSI) repository houses all physical sciences research conducted in microgravity—spanning Biophysics, Combustion Science, Complex Fluids, Fluid Physics, Fundamental Physics, and Materials Science. Because there is no live REST API for querying individual experimental test parameters, our team is building the structured database and API layer ourselves. This guide outlines how raw PSI search results and investigation packages move across our developer tracks.

---

## 1. Step 1: Data Triage & Filtering (Developer 1 — PSI Data Research & Curation)
When querying the PSI repository (133 total investigations), our first step is strictly filtering out non-combustion research areas so our database remains focused on spacecraft fire safety.

### A. Keep & Curate (Combustion Science Track)
Target investigations in the Combustion Science research area (both Microgravity Investigations and Ground Investigations that model flight data):

| Investigation ID | Title / Target Name | Description & Methodology Scope |
| :--- | :--- | :--- |
| **PSI-117** | Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics | Ground investigation using FLEX flight data for OpenFOAM 3-D CFD modeling of n-alkane droplet cool flames. |
| **PSI-159** | ACME CFI-G — Cool Flames Investigation with Gases | Microgravity investigation aboard the ISS testing spherical diffusion flames for propane, n-butane, and n-pentane across reactant dilutions, flow rates, and pressures. |
| **PSI-10** | ACME / Flame Design | Microgravity investigation determining soot-inception limits of quasi-steady normal and inverse spherical diffusion flames. |
| **PSI-62** | Concurrent Flame Spread Modeling / BASS & BASS-II | Ground investigation developing flamelet-generated manifold (FGM) models validated against ISS BASS and BASS-II solid-fuel flame spread imagery. |
| **PSI-60** | Computational and Experimental Analysis of SPICE Data Sets | Ground investigation analyzing Smoke Point in Coflow Experiment (SPICE) flight imagery to quantify soot formation differences between 1g and 0g flames. |

### B. Exclude / Set Aside (Out-of-Scope Research Areas)
Do not ingest records from unrelated PSI research areas into the primary fire-safety database:
* **Complex Fluids - Soft Matter:** Advanced Colloids Experiments (ACE-T2, ACE-T4, ACE-T5, ACE-T9, ACE-T10, ACE-T12), colloid-polymer mixtures (PSI-137), colloidal gels (PSI-182), and paramagnetic aggregates (InSPACE-4 / PSI-177).
* **Materials Science:** Cement solidification (PSI-174), metallic glasses (FAMIS / PSI-153), molten oxides (ELF-6 PRONTO / PSI-178), particle engulfment (PEP / PSI-190), solder alloys (PSI-181), and hypermonotectics (CGH / PSI-186).
* **Fluid Physics:** Pool boiling (PSI-138), Plant Water Management (PWM / PSI-187), Packed Bed Reactors (PBRE / PSI-189), and surface tension driven convection (STDCE-1 / PSI-119).

### C. Mandatory NASA Citation Rule
Per NASA Science Mission Directorate (SMD) Open Source Science guidance, Developer 1 must record the unique persistent identifier (PSI ID and DOI from the "Cite this Investigation" link on each landing page) for every curated record.

---

## 2. Step 2: Schema Extraction & Database Loading (Developer 2 — Data Model, Database & API)
Developer 2 ingests Developer 1's curated CSV/JSON records into our relational database (DuckDB/SQLite) and exposes clean REST endpoints for the frontend and ranking engine.

### Core Record Fields to Extract from Every PSI Entry
* `investigation_id`: Unique PSI identifier (e.g., `PSI-159`, `PSI-117`, `PSI-10`, `PSI-62`, `PSI-60`).
* `doi_citation`: Persistent DOI citation string from the investigation landing page.
* `title`: Official investigation name (e.g., *Advanced Combustion via Microgravity Experiments / Cool Flames Investigation with Gases*).
* `research_area`: Must equal `"Combustion Science"`.
* `investigation_type`: `"Microgravity Investigation"` (ISS/flight data) or `"Ground Investigation"` (CFD/modeling built on flight data).
* `objectives`: Specific scientific and fire-safety goals extracted from the PSI overview.
* `approach`: Experimental setup, hardware (e.g., ISS, drop tower, OpenFOAM CFD), fuels tested, and diagnostic sensors.
* `test_parameters`: Extracted from each investigation's downloadable ZIP/CSV package (fuel type/geometry, $\text{O}_2$ concentration %, pressure in kPa/psi, airflow velocity in cm/s, and fire-safety pillar: prevention, detection, or suppression).
* `data_quality_flags`: Explicit markers for missing fields, inferred values, or partial-gravity gaps.

---

## 3. Step 3: Relevance Scoring & Grounded SI Execution (Developers 3 & 4)
Once Developer 2 loads the structured records into the API, Developers 3 and 4 consume the data to power the intelligence layer:

### A. Transparent Relevance Ranking (Developer 3)
* **Environment Matching:** When a user selects a target habitat (Spacecraft, ISS, Moon Base at $\ge 30\%$ $\text{O}_2$ and $\le 10.2$ psi, Pressurized Rover, Mars Base, or Spacesuit at $100\%$ $\text{O}_2$ / $4.3$ psi), the scoring engine queries the structured parameters.
* **Factor Breakdown:** Records like `PSI-159` (ACME CFI-G), which explicitly test varying oxygen dilutions, pressures, and flow rates, score high on atmosphere overlap and are surfaced with transparent per-factor score breakdowns.
* **Gap Flagging:** Because PSI contains $0g$ and $1g$ data but no lunar ($1/6g$) or Martian ($3/8g$) combustion measurements, the engine explicitly bounds intermediate gravity between microgravity and normal gravity results.

### B. Fail-Closed SI Grounding & Citations (Developer 4)
* **Strict Evidence Binding:** Every plain-language summary, comparison, and Q&A response generated by the SI layer must cite the exact PSI record ID and field it came from (e.g., `[PSI-117]`, `[PSI-159]`, `[PSI-62]`).
* **Verification Pass:** An automated check verifies that every cited PSI ID exists in Developer 2's database before displaying text to the user—hiding any unverified statement so the dashboard never hallucinates fire-safety advice.

---

## 4. Step 4: Visualization, Export & Demo Delivery (Developers 5 & 6)
* **Frontend & Interactive Explorer (Developer 5):** Connects to Developer 2's REST endpoints to render the environment selector, ranked investigation cards, detail panels, and citation-backed Ask panel.
* **Conditions Map & Data Export (Developer 6):** Plots oxygen concentration against airflow and pressure across all curated Combustion Science records (highlighting target habitat zones) and provides one-click CSV/JSON export with NASA DOIs intact for researchers and modelers.
