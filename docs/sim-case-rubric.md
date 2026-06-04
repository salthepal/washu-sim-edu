# Sim Case Peer-Review Rubric

This rubric does double duty: it is the assessment standard for the
resident-authored capstone case **and** the bar a case must clear to move from
`draft` to `peer-reviewed` and enter the public exemplar library.

Score each dimension 1–4 (1 = needs major revision, 4 = exemplary). A case
enters the library at a mean of ≥ 3 with no dimension below 2.

| # | Dimension | What "exemplary" (4) looks like |
|---|-----------|----------------------------------|
| 1 | **Objectives** | 3–5 specific, observable, learner-appropriate objectives; everything in the case serves one of them. |
| 2 | **Fidelity match** | Modality and detail are chosen to serve the objectives — no realism for its own sake. |
| 3 | **Clinical accuracy** | Findings, vitals progression, and management reflect current evidence; references provided. |
| 4 | **Progression & cues** | A clear scripted timeline with branch points and facilitator cues that drive learners toward the objectives. |
| 5 | **Debrief design** | Identifies the key decision point(s) and gives the facilitator concrete advocacy-inquiry framing. |
| 6 | **Equity & safety** | Avoids stereyped portrayals; flags any psychological-safety considerations. |
| 7 | **Annotation** | The `annotation` field explains *why* this is a teaching exemplar and how to run it well. |
| 8 | **Usability** | Another facilitator could pick this up and run it cold from the materials provided. |

## Reviewer workflow

1. Pull the PR branch and confirm the build passes (schema validation catches missing fields).
2. Score against the table above; leave inline comments for anything below 4.
3. If it clears: set `status: peer-reviewed`, approve, and merge — it appears in the public exemplar list on the next deploy.
4. If not: request changes; the case stays `draft` (faculty-visible only).
