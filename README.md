# 🧩 Tic-Tac-Toe on Rubik's

**Three in a row — on a board that refuses to sit still.**

A browser game that smashes a 3×3 Rubik's cube into a game of Tic-Tac-Toe. Draw your
X's and O's onto a fully rotatable cube, but beware: every mark you place hands your
opponent a turn of the cube — so the board is *always* being scrambled out from under
you. 🌀

Built with [Three.js](https://threejs.org/) (loaded straight from a CDN). No build
step, no framework, no dependencies to install. Just open it and play.

## 🎯 Rules

- **Player 1** plays **✖️**, **Player 2** plays **⭕**.
- A **round** has two parts:
  1. The **placer** drops their mark on any empty sticker.
  2. The **opponent** then performs **one quarter-turn rotation** — and it must
     rotate a layer that **contains the cubie the mark was just placed on**. No
     dodging the consequences. 😈
- The placing role **alternates** every round, so both players get to place *and*
  rotate.
- Land **three of your marks in a row on a single face** (row, column, or diagonal)
  and you **win** 🏆.
- Victory is checked **only after the rotation settles** — and **either** player can
  win on a rotation (the rotator gets priority if both lines complete at once).
- Fill every sticker with no line and it's a **draw**.

## 🕹️ Controls

| Action | How |
|---|---|
| Orbit the cube | Drag on empty space |
| Place a mark | Click an empty sticker (during the place phase) |
| Rotate a layer | Use the on-screen move buttons, or drag a layer directly |

Rotations cover the full cube vocabulary — 12 face turns (`U U' D D' L L' R R' F F'
B B'`) plus 6 slice turns (`M M' E E' S S'`). During the rotate phase, only the **6
legal moves** (the layers running through the new mark) light up; the just-placed
sticker glows so you always know which cubie is in play.

✨ **Tip:** hover any move button to preview the turn before committing — the layer
glows and arrows show exactly which way it'll spin.

## 🤖 AI opponent

Flip on **"AI opponent (Player 2)"** to play against the computer, and pick your
poison from the difficulty dropdown:

- **Easy** 🌱 — plays legal moves at random. Forgiving, occasionally throws the game.
- **Medium** 🎯 — chases wins and dodges losses, assuming you'll rotate fairly.
  Beatable if you play sharp.
- **Hard** 🔥 — same instincts, but assumes you'll rotate as *adversarially* as
  possible (1-ply minimax). Plays to not lose. Good luck.

The AI plays both halves of the role — placing its own marks *and* performing the
constrained rotations on yours — so it's a real opponent, not just a rule-follower.

## 🚀 Running locally

The game loads Three.js as an ES module from a CDN, so it needs to be served over
HTTP rather than opened directly as a `file://` URL:

```sh
# from the project folder
python -m http.server 8000
# then open http://localhost:8000/
```

Any static file server will do.

## 📁 Files

- `index.html` — markup, HUD, move buttons, AI toggle & difficulty
- `style.css` — theme and layout
- `game.js` — cube construction, turn logic, win detection, interaction, AI

---

*No installs. No build. Just a cube, two marks, and a board that keeps moving.* 🎲
