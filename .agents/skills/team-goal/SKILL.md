---
name: team-goal
description: Draft a context-aware implementation goal prompt with a specialist team, research, delivery stages, independent review, testing, and improvement cycles. Use when preparing a team-led project or a substantial next iteration; generating the prompt does not launch the work.
---

# Team Goal

Turn the user's intended outcome into a self-contained prompt they can use to launch coordinated implementation. Adapt the template to the task; its subject and specialist focus are not fixed to this repository's product.

## Resolve the brief

Read the current request and relevant conversation first, then inspect applicable repository instructions and focused project evidence: README, plans, design references, existing implementation, prior reviews, tests and benchmarks. For a subsequent iteration, preserve the existing baseline and unresolved findings. Search only material relevant to the requested work.

Resolve these fields from evidence wherever possible:
- Outcome, intended users, purpose, project location and current maturity.
- Scope, exclusions, references, tools, technology and style constraints.
- Deliverables, critical workflows, release target and acceptance criteria.
- Research needs, specialist responsibilities, dependencies and ownership boundaries.
- Quality dimensions, current baseline, performance expectations and validation methods.
- Model preferences, effort, time or cost constraints, and authorized execution boundaries.

Prefer explicit current instructions over older decisions. Distinguish confirmed facts from reasonable proposals. Reuse established preferences when applicable; avoid carrying product-specific choices into unrelated work. Verify available tools/models before promising them; retain an unresolved capability as a limitation rather than inventing access.

Ask only for information that cannot be recovered and materially affects scope, direction or success. Start with the highest-impact gaps in a small coherent batch (normally one to three questions); explain the decision each answer will inform and suggest options when helpful. Continue preparing independent portions while waiting. Resolve minor implementation choices yourself and label consequential assumptions. An unanswered essential question stays unresolved; elapsed time is not agreement.

The brief is ready when every material field is either supported by context, answered by the user, or explicitly identified as a proposal or open decision. If essential answers are pending, present a partial draft only when useful, clearly labeled; do not call it ready to execute.

## Shape the team and process

The coordinator owns scope, integration, dependency ordering and completion evidence. Select specialist roles by the work needed, combining or omitting roles that add no value:
- Researcher: evidence, comparable approaches and testable recommendations.
- Designer / creator: product experience, visual direction, content or domain assets.
- Design reviewer: independently evaluate outputs against references and user needs.
- Engineer / implementer: working implementation, architecture and performance.
- Technical reviewer: independent correctness, architecture and risk review.
- QA: critical workflows, edge cases, regression coverage and benchmarks.
- User tester / domain evaluator: realistic deep use and critiques of usefulness and experience.

Give each selected role a concrete task-specific focus, inputs, owned outputs and review criteria. Keep independent review separate from authorship. Plan parallel work where ownership is disjoint and sequence dependent integration. Scale staffing to the assignment rather than requiring every role. Agent testing and human user evidence must be labeled separately.

Use research to inform decisions, not to imply that a successful comparison proves causation. For new products, move from research and scope to a complete MVP, then the requested release maturity. For existing products, start from the measured baseline and implement prioritized improvements without unnecessarily rebuilding the MVP.

Include repeated implement → review → test → evaluate cycles. Define completion using deliverables and observable acceptance evidence, with appropriate hard gates as well as any weighted rubric. Separate user requirements from proposed numerical targets; do not fabricate agreed scores or budgets. A high aggregate score cannot conceal a failed critical workflow. Preserve criteria across iterations unless the user changes them. If a constraint prevents completion, report the gap and evidence rather than declaring success.

## Deliver the prompt

Return one copyable, self-contained prompt using the outline below. Fill every section with resolved task details; remove irrelevant sections instead of leaving empty placeholders. Include a short list of material assumptions or pending questions outside the prompt when needed. Keep the output proportionate to the task.

```text
/goal <concrete desired outcome>

Context:
<product or project, audience, purpose, current state and location>

References and constraints:
<relevant artifacts and requirements; scope and exclusions>

Your role:
Act as project manager. Coordinate the specialist team, dependencies,
integration, validation and improvement cycles until the acceptance criteria
are met or a concrete blocker requires user input.

Team:
<selected roles with specific responsibilities, ownership and review criteria>

Process:
<research and baseline; scope and criteria; implementation stages;
independent review; QA and user evaluation; feedback-driven iteration>

Completion:
<deliverables, critical workflows, quality gates, measurable comparison,
required evidence and honest reporting of remaining limitations>

Working preferences:
<known model/effort preferences and resource constraints; decision latitude;
communication expectations and execution boundaries>
```

Generating a prompt is the deliverable of this skill. A literal `/goal` in the output is text for the user to launch later: do not create a Goal, spawn the proposed team, create chats, or implement the project solely because this skill was invoked. If the user separately requests execution, follow that explicit request with the resolved scope. Save the prompt to a file only when requested or required by an established project workflow.
