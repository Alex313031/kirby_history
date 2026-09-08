# "Suck It!" Vacuum Game — Design

A grid-based room-vacuuming arcade game. Arrow keys steer a Kirby that
must clean every reachable floor cell, dodging furniture, against a clock.

## Core invariant
Cleaning and collision happen at CELL granularity; nozzle-offset art does
NOT drive logic. The cell the vacuum occupies is the cell that gets cleaned.
This kills the direction-change gap bug from the cursor vroom (the offset
nozzle jumped corners on every turn, leaving gaps/overlaps).

## Grid
- Cell size: **64px = the sprite size**. One cell = one sprite = one clean.
- Room: fixed logical grid **16 x 12 cells = 1024 x 768 px**, canvas scaled
  to fit the viewport via CSS.
- Cell state enum: `FLOOR` (dirty, cleanable), `CLEAN`, `BLOCKED`
  (wall/furniture: impassable + not counted).
- Stored as a 2D array `grid[row][col]`.

## Motion model (two independent clocks)
- **Logical**: `col, row`. Advances one cell per move. Drives cleaning +
  collision only.
- **Visual**: sprite pixel position tweens between cell centers in fixed
  sub-steps. `SUBSTEPS = 2` (32px each across a 64px cell). This is the
  SMOOTHNESS dial — bump to 4 (16px) for smoother, no logic change.
- **Speed dial** = tween/cruise cadence (time per cell), fully separate from
  smoothness. Game runs SLOWER than the cursor vroom.
- Controls: **arrow keys only** (desktop v1). Tap = one cell move; hold =
  cruise (auto-continue into the next cell while the tween finishes, if clear).
- Mobile (future, not v1): swipe-to-set-direction or 4 on-screen D-pad
  buttons — cell-step model supports both trivially.

## Movement + collision logic (per move)
1. target = current cell + facing direction
2. if target out-of-bounds or `BLOCKED` -> no move, snap aligned in current cell
3. else -> set logical cell = target, mark target `CLEAN`, tween sprite there
Collision is just the cell-state check. No bounding boxes, no pixel tests.

## Furniture / obstacle art (GIMP rules)
- Every furniture item drawn TOP-DOWN in **exact multiples of 64px**
  (couch 3x1 = 192x64, sectional 3x2 = 192x128, TV stand 2x1 = 128x64, etc).
- Each piece = one PNG drawn once at its block position; ALL covered cells
  marked `BLOCKED`. Art and collision decoupled.
- Outer walls = the rectangular room boundary (BLOCKED border).

## Win condition + reachability
- Win = all reachable `FLOOR` cells cleaned (+ beat the clock).
- **Flood-fill from Kirby's start cell** finds every reachable floor cell:
  that set is the win-percentage denominator AND the level validator.
- Any level (hand-made or generated) with unreachable floor is invalid ->
  reject/regenerate.

## Rooms
- Don't generate maze walls (unrealistic + risk unvacuumable).
- Instead: fixed rectangular room + procedural FURNITURE PLACEMENT from the
  PNG library, cell-aligned, under rules (couch/TV against walls, keep a
  clear border lane, don't box anything in), validated by flood-fill.
- v1 may use hand-authored levels first; placement engine second.

## Timer
- Switchable **countdown** (beat the clock, lose at 0) and **count-up**
  (finish-time as score, lower better). Same elapsed clock; display +
  lose-condition differ. No bonuses.

## Assets
- Directional sprites `assets/{up,down,left,right}.png` + idle `vroom.png`,
  all 64x64.
- Carpet tiles `assets/carpet_{dirty,clean}.png`, 64x64, seamless.
- Wall sprites (64x64 cells, wood ~32px thick, rest transparent):
  `wall_h` (top/bottom), `wall_v` (left/right), `wall_tl/tr/bl/br` (corners).
  Wood on the room-facing half; `wall_h` drawn beam-bottom + `wall_v` drawn
  beam-right, code flips them for the opposite side. Corners drawn individually.

## Build order
1. Core loop: grid, one-cell stepping + tween, cell-cleaning, obstacle
   rejection, win check. (Hand-coded test level.)
2. Timer (both modes).
3. Furniture PNGs + multi-cell blocking + draw.
4. Procedural furniture placement + flood-fill validation.
5. Polish: title/win/lose screens, mobile controls.
