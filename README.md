# Tic-Tac-Toe on Rubik's

A browser game that fuses a 3×3 Rubik's cube with Tic-Tac-Toe. Players draw X / O
marks onto a fully rotatable cube, and every mark is followed by a cube rotation —
so the board is always being scrambled underneath you.

Built with [Three.js](https://threejs.org/) (loaded from a CDN). No build step.

## Rules

- **Player 1** plays **X**, **Player 2** plays **O**.
- A **round** has two parts:
  1. The **placer** drops their mark on any empty sticker.
  2. The **opponent** then performs **one quarter-turn rotation** — and it must
     rotate a layer that **contains the cubie the mark was just placed on**.
- The placing role **alternates** every round, so both players place and rotate.
- A player **wins** by getting **three of their marks in a row on a single face**
  (row, column, or diagonal).
- Victory is checked **only after the rotation finishes**, and **either** player can
  win on a rotation (the rotator takes priority if both lines complete at once).
- Fill every sticker with no line and it's a **draw**.

## Controls

- **Drag empty space** to orbit the cube and inspect every side.
- **Click an empty sticker** to place your mark (during the place phase).
- **Rotate** using the on-screen move buttons or by dragging a layer:
  - 12 face turns: `U U' D D' L L' R R' F F' B B'`
  - 6 slice turns: `M M' E E' S S'`
  - During the rotate phase only the **6 legal moves** (the layers through the new
    mark) are enabled; the just-placed sticker is highlighted to show which cubie
    must be included.
- **Hover a move button** to preview which layer turns and in which direction
  (glowing layer + direction arrows).

## AI opponent

Tick **"AI opponent (Player 2)"** to play against the computer. The AI plays both
roles: it places its own marks and performs the constrained rotations on your
marks. It takes a winning rotation when one exists and avoids handing you the win.

## Running locally

The game loads Three.js as an ES module from a CDN, so it should be served over
HTTP (rather than opened directly as a `file://` URL):

```sh
# from the project folder
python -m http.server 8000
# then open http://localhost:8000/
```

Any static file server works.

## Files

- `index.html` — markup, HUD, move buttons, AI toggle
- `style.css` — theme and layout
- `game.js` — cube construction, turn logic, win detection, interaction, AI
