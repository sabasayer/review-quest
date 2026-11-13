# review-quest

An idle builder game that rewards code review. You own a spaceship. Each review makes it grow fast.

The name is a working name. The game is not built yet. This repo holds the plan.

## Where things are

- [DECISIONS.md](DECISIONS.md): the decisions so far.
- [The map](https://github.com/sabasayer/review-quest/issues/1): the plan. Each ticket is a sub-issue of the map.
- Research findings are on the `research/...` branches. Each closed research ticket links to its file.

## How to continue

1. Read `DECISIONS.md`.
2. Read the map. It lists the closed decisions and the open questions.
3. Take the next open ticket that nothing blocks.

Implementation runs on a Sonnet sub-agent. The session agent briefs it and checks the result.

## Prototypes

Each prototype is throwaway code on its own branch, not on `main`.

- `prototype/return-moment`: a hero that fights alone. Verdict: nothing to decide, nothing to see.
- `prototype/ship-builder`: the idle spaceship builder. In test.

Prototypes use TypeScript + Vite + Canvas 2D. Buttons fake the reviews. No GitLab.
