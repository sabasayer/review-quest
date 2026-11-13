# Review Quest

The words of the game. Review Quest is an idle builder game that rewards code review.

## Language

### The ship

**Ship**:
The thing the player owns and builds. It is made of modules.
_Avoid_: Base, factory, castle

**Module**:
One part of the ship. It fills one cell and has a level from 1 to 3.
_Avoid_: Part, building, room, item

**Cell**:
One place on the grid that can hold one module.
_Avoid_: Slot, tile, room

**Ship class**:
The size stage of a ship. It sets the number of cells. The classes are Shuttle, Frigate, Cruiser and Station.
_Avoid_: Tier, level, stage

**Edge rule**:
Guns, mining lasers and sails must sit on the outside of the ship.

**Shipyard**:
The place where the player buys, places, moves and scraps modules.
_Avoid_: Shop, store

**Crew**:
The small people who run inside the ship. They are for show.

**Pet**:
An alien that hatches from an egg and lives on the ship.

### Resources

**Gold**:
The currency that buys modules and upgrades. It comes slowly from idle time, and in a burst from reviews.
_Avoid_: Money, coins, credits

**Research points**:
The currency that unlocks new module kinds and new ship classes. It comes only from reviews.
_Avoid_: XP, experience, science

**Review burst**:
The gold that one review gives at once.

**Dust**:
The small resources that the ship mines all the time. Dust is the visible source of idle gold.
_Avoid_: Small asteroid, ore

### Review work in the game

**Asteroid**:
One merge request that waits for the player's review. A review mines it.
_Avoid_: Monster, bug, enemy

**Egg**:
One merge request that the player wrote. It hatches into a pet when a colleague reviews it.

**Return**:
The moment the player looks at the game after review work. The player sees a summary, then spends.
