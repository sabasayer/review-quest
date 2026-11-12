# review-quest

An idle game that rewards code review. Your review queue is the monster wave. Each review makes your character stronger.

The name is a working name. The game is not built yet. This repo holds the plan.

## Where things are

- [DECISIONS.md](DECISIONS.md): the decisions so far.
- [The map](https://github.com/sabasayer/review-quest/issues/1): the plan. Each ticket is a sub-issue of the map.
- Research findings are on the `research/...` branches. Each closed research ticket links to its file.

## How to continue

1. Read `DECISIONS.md`.
2. Read the map. It lists the closed decisions and the open questions.
3. Take the next open ticket that nothing blocks.

The next ticket is the prototype: [Does the return moment feel good?](https://github.com/sabasayer/review-quest/issues/2)

## Rules for the prototype

- TypeScript + Vite + Canvas 2D. It runs in a browser tab.
- A button fakes a review. No GitLab.
- Four nouns only: hero, monster, gun, egg.
- It tests one thing: you look at the game after some reviews, you see a summary, you open loot, you make one small choice. Does this feel like a reward?
- It is throwaway code. Do not grow it before the answer is clear.
