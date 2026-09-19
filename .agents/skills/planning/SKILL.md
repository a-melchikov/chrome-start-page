---
name: planning
description: Interactive planning and architectural interview workflow for chrome-start-page. Activated when planning is requested ("составь план", "спланируй", "/plan").
---

# Interactive Planning and Interview Protocol

Follow this runbook when the user asks to plan a feature, refactoring, or architectural change (triggers: "составь план", "спланируй", "/plan").

## 1. Autonomous Research Phase

Before asking any questions:

- Inspect relevant source code, components, hooks, storage schemas, and tests.
- Review architecture documents (`docs/ARCHITECTURE.md`, `docs/PROJECT_CONTEXT.md`, `docs/DECISIONS.md`).
- Identify existing conventions and potential integration points.
- **Rule**: Never ask questions that can be reliably answered by exploring the workspace. However, if any requirement, design choice, user intent, or edge case remains unclear or ambiguous, proactively ask clarifying questions — never guess or make silent assumptions.

## 2. Iterative Interview Phase (`ask_question`)

Conduct a multi-round interview until zero ambiguity remains.

### Category Checklist to Probe:

- **Goal & Behavior**: Expected user journey, trigger states, active/inactive behavior.
- **Architecture & Boundaries**: Layer separation (`components/`, `widgets/`, `storage/`, `hooks/`), registry integration.
- **UI/UX & Accessibility**: Layout, keyboard navigation (Escape, Tab), light/dark themes, contrast, responsive constraints.
- **Data & Persistence**: Schema changes, migration requirements, storage limits, serialization formats.
- **Security & Performance**: Content sanitization, rendering overhead, Core Web Vitals (CLS/FCP).
- **Edge Cases & Failure Modes**: Error boundaries, empty states, corrupted storage fallback, transaction rollback.
- **Acceptance Criteria**: Concrete definition of done and test expectations.

### Multi-Round Follow-up Loop:

1. Formulate clear, actionable questions via `ask_question`. For large tasks, typically 10–25 questions; for smaller tasks, proportionally fewer.
2. When the user responds, **critically evaluate the answers**:
   - Did the user's choices introduce new branching questions or trade-offs?
   - Are there unclarified edge cases, data structures, or UI states?
3. **If any ambiguities remain, ask follow-up questions immediately** using `ask_question`. Do not proceed to formulating the plan prematurely.
4. Only when **all open questions are completely resolved**, exit the interview loop.
5. _Exception_: Skip questioning only if the user explicitly stated "без вопросов" or "сразу пиши план".

## 3. Strict No-Modification Lock

During the planning phase:

- Do not create or edit production source files (`.ts`, `.tsx`, `.css`, configs).
- Do not make git commits.
- Strictly keep all work within analysis, dialogue, and artifacts.

## 4. Artifact Formulation

Once the interview loop is closed:

1. Generate a comprehensive implementation plan artifact (`write_to_file`) with `ArtifactMetadata`:
   - `RequestFeedback: true` (provides the interactive "Proceed" button in the IDE).
   - `UserFacing: true`.
2. Required sections in the plan artifact:
   - **Understanding & Goals**: Summary of clarified requirements.
   - **Assumptions & Risks**: Technical risks, schema compatibility, performance caveats.
   - **Step-by-Step Tasks**: Ordered atomic implementation steps.
   - **Affected Files & Modules**: Exhaustive list of target files.
   - **Test Strategy & Acceptance Criteria**: Unit tests, edge case tests, verification commands.
3. In chat, output only a concise summary pointing to the artifact.

## 5. Awaiting Confirmation

- Wait for explicit user approval (or click on the "Proceed" button) before writing any code or modifying the repository.
