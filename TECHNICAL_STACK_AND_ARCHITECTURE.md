# Technical Stack & Architecture Proposal

## 1. Overview

For this project, we recommend a lightweight, pragmatic technology stack optimized for a **two-day development timeline, a six-developer team, and a relatively small curated dataset**.

The primary objective is to build a functional, maintainable prototype quickly without introducing unnecessary infrastructure or architectural complexity.

Given that the curated dataset is expected to contain only dozens of records, we should prioritize:

- Rapid development and integration.
- Familiar tools with minimal setup overhead.
- Transparent and testable scoring logic.
- Reliable data validation.
- Explainable AI-generated responses with verifiable citations.
- A straightforward deployment process.

**Guiding principle: Build the simplest architecture that satisfies the requirements and can be extended later.**

## 2. Recommended Technology Stack

| Layer | Recommended technology | Rationale |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Fast setup, strong ecosystem, and familiar to most developers. |
| Styling | Tailwind CSS | Rapid UI development and consistent styling. |
| Charts & Visualization | Recharts + D3.js | Recharts handles standard charts, while D3 supports custom visualizations such as the oxygen-versus-airflow conditions map and target-atmosphere zone. |
| Backend | Python + FastAPI | Lightweight, quick to implement, and provides automatic API documentation and validation through Pydantic. |
| Data Storage | Curated JSON + SQLite | JSON provides an easy-to-manage source dataset, Pydantic validates records, and SQLite provides local persistence without requiring a database server. |
| Scoring Engine | Plain Python module + YAML configuration | Keeps scoring logic transparent, configurable, and easy to unit test. |
| AI / SI Layer | Muse via Meta Model API (OpenAI-compatible) | Supports structured JSON output, enabling predictable responses and citation verification. |
| Retrieval | Structured filtering + keyword search | Sufficient for a dataset containing dozens of records. Avoids unnecessary vector database infrastructure. |
| Backend Testing | pytest | Standard Python testing framework for API endpoints, validation, and scoring logic. |
| Frontend Testing | Vitest | Lightweight testing for React components and frontend logic. |
| End-to-End Testing | Playwright | Tests complete user journeys across the application. |
| Local Deployment | Docker Compose | Provides a consistent development environment across the team. |
| Demo Deployment | Render, Fly.io, or similar | Simple deployment without managing complex infrastructure. |

## 3. Architecture Decisions

### 3.1 Frontend

**Technology:** React, TypeScript, Vite, Tailwind CSS.

The frontend will provide the user interface, data exploration experience, visualizations, and interaction with the backend API.

Responsibilities:

- Display curated records and their associated information.
- Provide filtering and search interfaces.
- Visualize scoring results and relevant scientific conditions.
- Display AI-generated insights and supporting citations.
- Communicate with the backend through REST API endpoints.

**Visualization strategy:**

- Use Recharts for standard charts and graphs.
- Use D3.js for custom visualizations, particularly the oxygen-versus-airflow conditions map and target-atmosphere region.

### 3.2 Backend

**Technology:** Python + FastAPI.

FastAPI will serve as the main application backend and expose endpoints consumed by the frontend.

Responsibilities:

- Expose REST API endpoints.
- Validate incoming and outgoing data using Pydantic.
- Load and query curated records.
- Execute scoring calculations.
- Coordinate retrieval and AI-assisted analysis.
- Verify AI-generated citations against available records.

FastAPI is preferred because it minimizes boilerplate while providing automatic API documentation.

### 3.3 Data Management

**Technology:** JSON + Pydantic + SQLite.

The curated dataset is expected to contain only dozens of records. A complex database infrastructure would therefore add unnecessary operational overhead.

Recommended approach:

1. Maintain the curated dataset in structured JSON files.
2. Define Pydantic models to validate the dataset schema.
3. Load validated records into SQLite for querying and persistence.
4. Access records through a small data-access layer.

SQLite provides sufficient functionality for the prototype without requiring a separately managed database server.

**Future consideration:** If the application evolves to require hosted multi-user storage, concurrent writes, or more complex data management, PostgreSQL can replace SQLite.

### 3.4 Scoring Engine

**Technology:** Python + YAML.

The scoring engine should be implemented as a standalone Python module rather than embedded in API routes or AI prompts.

Responsibilities:

- Accept validated input records.
- Apply configurable scoring criteria.
- Calculate scores using explicitly defined weights.
- Return structured and reproducible results.

Scoring weights should be maintained in a YAML configuration file.

This separation makes the scoring process:

- Transparent and explainable.
- Easy to modify without rewriting application logic.
- Straightforward to unit test.
- Independent of the frontend and AI layer.

### 3.5 AI / SI Layer

**Technology:** Muse via the Meta Model API.

The AI layer will provide structured interpretation and synthesis of retrieved information.

Recommended implementation:

- Use structured JSON output rather than unrestricted free-form responses.
- Provide the model with relevant records retrieved from the curated dataset.
- Require citation tokens or record identifiers in generated claims.
- Implement a Python verification function to check that cited records actually exist.
- Reject, flag, or regenerate responses containing invalid citations.

The objective is to ensure that AI-generated insights remain traceable to the underlying curated data.

### 3.6 Retrieval Strategy

**Technology:** Structured filtering + keyword search.

Given the small dataset, a conventional retrieval pipeline is sufficient.

Recommended capabilities:

- Filter records using structured attributes.
- Search relevant fields using keyword matching.
- Return the most relevant records to the AI layer.
- Preserve record identifiers so that citations can be verified.

**Why not a vector database?**

A vector database would introduce additional dependencies, configuration, and operational complexity without providing meaningful benefits for a dataset of this size.

It can be reconsidered if the dataset grows substantially or semantic retrieval becomes a demonstrated requirement.

## 4. Testing Strategy

Testing should be implemented at each application layer.

| Testing area | Tool | What to test |
| --- | --- | --- |
| Backend | pytest | API endpoints, Pydantic validation, retrieval, scoring, and citation verification. |
| Frontend | Vitest | React components, UI logic, data handling, and interactions. |
| End-to-End | Playwright | Complete user journeys, frontend/backend integration, and critical workflows. |

Priority should be given to testing the scoring engine, data validation, and citation verification because errors in these components can directly affect the reliability of application outputs.

## 5. Deployment Strategy

### Local Development

Use Docker Compose to provide a consistent environment for all six developers.

The local environment should include:

- Frontend application.
- FastAPI backend.
- SQLite database.
- Required environment configuration.

### Demo Deployment

For the initial demonstration, use a lightweight hosting provider such as:

- Render.
- Fly.io.
- Similar platforms supporting Python applications and static frontend hosting.

The goal is to minimize deployment complexity.

A single application deployment serving the backend API and built frontend assets is preferable where supported.

## 6. Architecture Summary

```text
                 USER
                   |
                   v
        React + TypeScript + Vite
                   |
                   v
             FastAPI Backend
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
   Data Layer   Scoring    AI / SI Layer
       |         Engine          |
       v           |             v
  JSON + SQLite    |       Muse API 
       |           |             |
       +-----------+-------------+
                   |
                   v
           Citation Verification
                   |
                   v
          Structured API Response
                   |
                   v
              Frontend UI
```

## 7. Development Principles

To keep the project achievable within the two-day development window, the team should follow these principles:

1. **Avoid overengineering.** Do not introduce infrastructure that the current dataset and requirements do not justify.
2. **Keep components independent.** The frontend, backend, scoring engine, retrieval logic, and AI integration should have clear interfaces.
3. **Validate data early.** Use Pydantic to catch malformed or inconsistent records before they enter the application.
4. **Keep scoring deterministic.** Scoring calculations should be implemented in Python, not delegated to an LLM.
5. **Make AI outputs verifiable.** Generated claims should reference identifiable source records.
6. **Use shared contracts.** Agree on API schemas and data models early to minimize integration conflicts.
7. **Prioritize the end-to-end workflow.** Build a working vertical slice before adding secondary features.

## 8. Final Recommendation

For this two-day build, the recommended stack is:

- **Frontend:** React + TypeScript + Vite + Tailwind CSS.
- **Visualization:** Recharts + D3.js.
- **Backend:** Python + FastAPI.
- **Data:** JSON + Pydantic + SQLite.
- **Scoring:** Python + YAML.
- **AI / SI:** Muse via Meta Model API (OpenAI-compatible).
- **Retrieval:** Structured filtering + keyword search.
- **Testing:** pytest + Vitest + Playwright.
- **Deployment:** Docker Compose + Render/Fly.io.

This stack provides a good balance between development speed, reliability, explainability, and future extensibility.

**The recommendation is to optimize for a working, demonstrable prototype rather than building infrastructure for a scale the project does not currently need.**
