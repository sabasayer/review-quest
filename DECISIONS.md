# Decisions so far

Working name: `review-quest`. The name is not final.

Brainstorm date: 2026-11-10.

## The problem

AI writes many merge requests (MRs). People must review them. Review is now the slow step, and it is boring.

## The idea

An idle game that sits at the bottom of the screen. It reads your GitLab review activity. Each review makes your character stronger.

## The feeling we want

"I reviewed many MRs and I am tired. Then I look at my character. It levelled up and it has cool new items."

The game adds fun next to the review work. It is not a second job.

## Decided

- **No punishment.** If you ignore reviews, nothing bad happens. Monsters only pile up.
- **Your review queue is the monster wave.** Each MR that waits for your review is a monster. An old MR is a bigger monster. A large diff has more health.
- **A review is an attack.** A comment is a hit. An approve is the kill.
- **Kills drop loot.** Gun parts, gems, eggs.
- **Your own MRs are eggs.** An egg hatches when a colleague reviews it. The pet then fights for you.
- **Lots of guns, not violent.** The guns are absurd. The monsters are cute bugs. Bugs pop, run away, or become pets.
- **Three things grow.** Level (always goes up). Guns and items (random drops). Pets (from eggs).
- **Loot is random and earned.** Random drops give surprise. Each milestone gives one fixed reward.
- **Only reviews give power.** Idle time gives distance, not loot.
- **The return is the key moment.** You do not watch the game while you review. You look after. You get a short summary, then you open the loot.
- **Small choices, not pure idle.** You pick the gun loadout and the pets that fight.
- **Reward what is hard to fake.** Speed to first review. Threads that the author resolves. MRs that merge after your review.
- **Rewards are cosmetic and silly.** Then nobody has a reason to cheat.
- **Solo first.** One person must enjoy it before a team does.
- **No personal leaderboard.** It shames slow reviewers and rewards rubber stamps.
- **No server.** The game computes its state from GitLab events.
- **First toy has four nouns.** Hero, monster, gun, egg.

## Decided after the research (2026-11-10)

- **The game is a web app for now.** It runs in a browser tab. Electron comes later, only if we need it.
- **All players use a MacBook.** One player now. Later, 20 to 30 engineers.
- **GitLab can give every signal we want.** One player needs a read-only token and no server.
- **Two signals are weak.** A resolved thread and the review request time are not events. The game must read each MR again.
- **The game needs a small local save.** Random loot cannot come from GitLab events alone.
- **The plan ends at a game design document.** The real build is a new plan after that.

## Later

- **Team boss.** The pile of waiting MRs is one boss. Every review from anyone hits it. Start with one company boss per week. Nobody signs up: if you reviewed, you are in the fight.
- **One page with everyone's game.** Each person is one line in a list. You see how far each person is.

## The plan

1. Build a prototype.
2. Grill the design.
3. Write a game design document.
