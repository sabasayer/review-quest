# Decisions so far

Working name: `review-quest`. The name is not final.

Last change: 2026-11-13.

## The problem

AI writes many merge requests (MRs). People must review them. Review is now the slow step, and it is boring.

## The idea

An idle builder game. You own a spaceship that grows. It reads your GitLab review activity. Reviews make the ship grow fast.

## The feeling we want

"I reviewed many MRs and I am tired. Then I look at my ship. I earned a lot, and I choose what to build next."

The game adds fun next to the review work. It is not a second job.

## The game

- **You own a spaceship.** It grows module by module, in two dimensions, with many layers.
- **The view zooms out as the ship grows.** A huge ship is the trophy.
- **You choose the upgrades.** The choice is the fun, because you look at the game only a few times a day.
- **Every upgrade is a visible part.** A bigger number alone is not a reward.
- **The game runs alone, slowly.** Reviews make it fast.
- **Two currencies.**
  - Gold comes slowly from idle time. A review gives a big burst of it. Gold buys modules and upgrades.
  - Research points come only from reviews. They unlock new kinds of modules.
- **Each MR that waits for your review is an asteroid.** It drifts next to the ship. An old MR is a bigger asteroid. A large diff holds more ore.
- **A review mines the asteroid.** A comment is a laser hit. An approve cracks it open.
- **Idle time is alive.** The ship always mines small resources. Small people run inside it, and parts move. MRs are the big resources.
- **Your own MRs are eggs.** An egg hatches when a colleague reviews it. The pet lives on your ship.
- **Lots of guns, not violent.** The guns are absurd modules. They make the review burst bigger.
- **Not real Factorio.** No belts and no logistics. You pick the next module from a few options and you place it.
- **The return is the key moment.** You see a short summary of what you earned. Then you spend it.

## How the ship grows (grilled 2026-11-13)

- **The player places each new module.**
- **The view is a side view, cut open.** You see decks on top of each other. Small people run inside.
- **Room is a cell budget.** Each ship class gives a number of cells. A new module must touch a module you have. The shape is yours.
- **Four ship classes:** Shuttle 6 cells, Frigate 12, Cruiser 24, Station 48. The numbers are a scale, not final.
- **A new class keeps your layout.** You get more cells and the view zooms out one step.
- **Every module is one cell.** Bigger modules are a later reward.
- **The edge rule.** Guns, mining lasers and sails must sit on the outside. Inside modules can sit anywhere.
- **Modules have levels 1 to 3.** An upgrade uses no cell.
- **You can move modules for free.** You can scrap a module and get half its gold back.
- **Research points have two uses.** New module kinds, or the next ship class.
- **Gold and room are both tight from the first minute.** The shop shows three modules and you can pay for one.
- **The default view shows the whole ship.** You can zoom in on a part. The camera does not move by itself.

## Still open

- **Neighbour effects.** Does a module get a bonus from the module next to it? A toy must test this first.
- **The numbers.** The second toy grows too fast after two sessions.
- **Which review actions give which rewards.**
- **The core loop of one work day,** and what the player sees in idle time.

## Rules that stay

- **No punishment.** If you ignore reviews, nothing bad happens. Asteroids only pile up.
- **Reward what is hard to fake.** Speed to first review. Threads that the author resolves. MRs that merge after your review.
- **Rewards are cosmetic and silly.** Then nobody has a reason to cheat.
- **Solo first.** One person must enjoy it before a team does.
- **No personal leaderboard.** It shames slow reviewers and rewards rubber stamps.
- **No server.** The game computes its state from GitLab events, plus a small local save.

## Facts from the research

- **The game is a web app for now.** It runs in a browser tab. Electron comes later, only if we need it.
- **All players use a MacBook.** One player now. Later, 20 to 30 engineers.
- **GitLab can give every signal we want.** One player needs a read-only token and no server.
- **Two signals are weak.** A resolved thread and the review request time are not events. The game must read each MR again.

## What we dropped, and why

- **A hero that walks and fights alone, with better guns as loot** (first prototype, 2026-11-12). You do not play it yourself. There is nothing to decide and nothing to see.
- **"Only reviews give power."** The ship now earns slowly alone. Research points keep the review-only part.
- **Deeper hero with gear slots and a skill tree.** It adds decisions, but the growth stays hard to see.

## Later

- **Team boss.** The pile of waiting MRs is one shared target. Every review from anyone hits it.
- **One page with everyone's game.** Each person's line is their ship. It must not rank people.

## The plan

1. Build prototypes until the return moment is fun.
2. Grill the design. Then one more prototype tests the placing.
3. Write a game design document. The real build is a new plan after that.
