# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser game fusing a 3×3 Rubik's cube with Tic-Tac-Toe, built with Three.js
(loaded from a CDN via an ES-module import map). **No build step, no framework, no
package manager, no tests.** Three source files: `index.html`, `style.css`, `game.js`.

## Running

Serve the folder over HTTP (the page imports Three.js as an ES module, so `file://`
won't work):

```sh
python -m http.server 8123   # then open http://localhost:8123/
```

`.claude/launch.json` defines this as the `static` preview server. There is no
lint/test/build tooling — verification is done by running the game.

## Rules of the game (drives most of the logic)

A **round** = the **placer** drops their mark on an empty sticker, then the
**opponent** rotates one layer — and that rotation **must include the cubie the mark
was just placed on** (so only 6 of the 18 moves are ever legal at rotate time). The
placing role **alternates** each round. Win = 3 marks in a row on any single face,
checked **only after the rotation settles**; **either** player can win on a rotation,
with the **rotator** taking priority on a simultaneous line.

## Architecture (the parts that span files / functions)

Everything lives in `game.js`. The non-obvious, load-bearing design decisions:

- **Geometry is the source of truth — there is no separate cube state model.** 27
  cubie `THREE.Group`s hold black bodies + white sticker meshes; X/O marks are *child
  meshes of stickers*, so they physically ride along on every rotation. Win detection
  (`checkWin`) and the AI read the board back out of the live scene graph (each
  sticker's current face = `snapAxisVec(localNormal · cubie.quaternion)`, grid cell =
  `cubie.position`), all expressed in **cubeGroup-local space** so orbiting the camera
  never affects game logic.

- **Rotations: `startTween` → `finishTween`.** A move re-parents the 9 affected cubies
  into a temporary pivot, animates 90°, then re-attaches them and **snaps** position
  and quaternion back to the grid (`snapCubie`, `snapQuaternion`) to kill float drift.
  Moves are defined in the `MOVES` table as `{ axis (0/1/2), layer (-1/0/1), sign }`.

- **The AI runs a parallel pure-data simulator that MUST mirror the real conventions.**
  `snapshot`/`cloneState`/`applyMoveSim`/`hasLine`/`heuristic` replicate the cube as
  plain arrays so the AI can try (placement, rotation) pairs and see the post-rotation
  result. **Critical invariant:** `rotateVec` (sim) must match the rotation `startTween`
  applies, and `hasLine`/`faceGrid` must match `checkWin`'s face/grid reconstruction. If
  you change any rotation sign, axis convention, or win-grid mapping, update **all three
  sites** (real move, sim, win check) together or the AI's predictions silently diverge
  from reality.

- **Turn/flow state machine:** `state.placer` + `state.phase` (`"place"`/`"rotate"`);
  `actingPlayer()` derives who acts. `commitPlacement` → `doMove`/`beginTwist` →
  `afterRotate` → `handoff`. `handoff()` is the single point that, after any state
  change, decides whether the human acts or the AI (`aiAct`) is scheduled, and toggles
  `inputLocked` (which gates all human input). `doMove` and `beginTwist` both enforce
  the "rotation must contain the placed cubie" constraint via `validMovesFor`.

- **AI difficulty** (`difficulty` = easy/medium/hard) lives in `aiChooseRotation` and
  `aiChoosePlacement`: easy = random legal; medium = take wins / avoid losses but
  assumes a *neutral* opponent rotation (average case); hard = same but worst-case
  1-ply minimax over the opponent's constrained rotation.

- **Pointer handling** is custom (no OrbitControls): `pointerdown`/`move`/`up` decide
  between orbit (drag empty space — allowed even after game-over for review), click-to-
  place, and drag-to-twist. Hover-on-button preview (`showHint`/`makeMoveArrows`) and
  the cyan placed-cubie highlight glow are emissive overlays restored on clear.

## Working in the preview (important gotchas)

- **`python -m http.server` sends no cache headers**, so a plain reload often re-runs a
  **stale cached `game.js`** (ES-module URL caching). During iteration, hard-refresh or
  temporarily append a version query (`game.js?v=N`) and bump it; **revert the query
  before finishing.**
- **The preview throttles `requestAnimationFrame` when backgrounded**, so animated
  moves can stall mid-tween. To verify game *logic*, drive moves synchronously
  (`startTween(...); finishTween();`) rather than waiting on the animation.
- **The preview renderer can wedge after many rapid reloads** (screenshots time out
  while `preview_eval` still responds). Fix: `preview_stop` then `preview_start`.

## Possible future enhancements (none committed to — ideas only)

The project is considered complete; these are open ideas if work ever resumes:

- **Vendor Three.js locally** so the game works fully offline. Currently Three.js is
  CDN-dependent on first load (ES-module import map in `index.html`) — download it into
  the repo and point the import map at a local path.
- **Scrambled-start mode** — begin from a randomly scrambled cube instead of a solved one.
- **Move counter** — track and display the number of rounds / rotations played.
- **AI plays X / moves first** — currently the AI is Player 2 (O); allow it to take the
  X role and/or open the game.
- **Sound** — placement, rotation, and win cues.
- **Mobile / touch polish** — verify and refine the custom pointer handling on touch
  devices.
- **Drag-to-twist polish** — the drag-to-twist gesture is the secondary input path
  (the move buttons are the reliable one); slice-layer drags are the least precise and
  would benefit from a dedicated pass.

## Git

Remote: `Thisara-DE/Tic-Tac-Toe-on-Rubiks`. This repo is configured with
`http.sslBackend=schannel` (local config) to work around a Windows CA-bundle error
(`unable to get local issuer certificate`).
