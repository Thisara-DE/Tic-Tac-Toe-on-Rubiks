import * as THREE from "three";

/* ------------------------------------------------------------------ *
 *  Rubik's Cube · Tic-Tac-Toe
 *  - 27 cubies, black bodies, white stickers
 *  - Marks (X/O) are child meshes of stickers, so they ride along
 *  - 18 quarter-turn moves (faces + slices); win checked after a turn
 * ------------------------------------------------------------------ */

const SPACING   = 1.0;   // distance between cubie centres
const BODY      = 0.95;  // cubie body edge length (gaps come from this)
const STK_SIZE  = 0.86;  // sticker plate size
const STK_OFF   = BODY / 2 + 0.002;
const MARK_SIZE = 0.66;
const TURN_MS   = 240;

const X_COLOR = "#ff5a5f";
const O_COLOR = "#4aa3ff";

// ---- scene setup --------------------------------------------------
const canvas   = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x12151d);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(4.2, 4.0, 6.2);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.72));
const key = new THREE.DirectionalLight(0xffffff, 0.85);
key.position.set(6, 10, 8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.35);
fill.position.set(-6, -4, -8);
scene.add(fill);

const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

// ---- textures -----------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeStickerTexture() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = "#f3f3f0";
  roundRect(ctx, 6, 6, s - 12, s - 12, 22);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function makeMarkTexture(player) {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, s, s);
  ctx.lineWidth = 34;
  ctx.lineCap = "round";
  if (player === "X") {
    ctx.strokeStyle = X_COLOR;
    const m = 64;
    ctx.beginPath();
    ctx.moveTo(m, m); ctx.lineTo(s - m, s - m);
    ctx.moveTo(s - m, m); ctx.lineTo(m, s - m);
    ctx.stroke();
  } else {
    ctx.strokeStyle = O_COLOR;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 70, 0, Math.PI * 2);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

const STICKER_TEX = makeStickerTexture();
const MARK_TEX = { X: makeMarkTexture("X"), O: makeMarkTexture("O") };

// ---- cube construction -------------------------------------------
const FACE_DIRS = [
  new THREE.Vector3( 1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3( 0, 1, 0), new THREE.Vector3( 0,-1, 0),
  new THREE.Vector3( 0, 0, 1), new THREE.Vector3( 0, 0,-1),
];

let cubies = [];          // array of THREE.Group
let stickers = [];        // flat list of sticker meshes (for raycasting)

const bodyGeo = new THREE.BoxGeometry(BODY, BODY, BODY);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.55, metalness: 0.05 });
const stickerGeo = new THREE.PlaneGeometry(STK_SIZE, STK_SIZE);
const markGeo = new THREE.PlaneGeometry(MARK_SIZE, MARK_SIZE);

function buildCube() {
  cubies.forEach((c) => cubeGroup.remove(c));
  cubies = [];
  stickers = [];
  cubeGroup.quaternion.identity();

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const cubie = new THREE.Group();
        cubie.position.set(x * SPACING, y * SPACING, z * SPACING);
        cubie.userData.stickers = [];

        const body = new THREE.Mesh(bodyGeo, bodyMat);
        cubie.add(body);

        const coord = [x, y, z];
        for (const dir of FACE_DIRS) {
          const axis = dir.x !== 0 ? 0 : dir.y !== 0 ? 1 : 2;
          if (coord[axis] !== dir.getComponent(axis)) continue; // only outward faces

          const stk = new THREE.Mesh(
            stickerGeo,
            new THREE.MeshStandardMaterial({
              map: STICKER_TEX, transparent: true, alphaTest: 0.5,
              roughness: 0.4, metalness: 0.0,
            })
          );
          stk.position.copy(dir).multiplyScalar(STK_OFF);
          stk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
          stk.userData = {
            mark: null,
            markMesh: null,
            localNormal: dir.clone(), // outward dir in cubie-local frame
            cubie,
          };
          cubie.add(stk);
          cubie.userData.stickers.push(stk);
          stickers.push(stk);
        }

        cubies.push(cubie);
        cubeGroup.add(cubie);
      }
    }
  }
}

function placeMark(stk, player) {
  const mat = new THREE.MeshStandardMaterial({
    map: MARK_TEX[player], transparent: true, alphaTest: 0.4,
    roughness: 0.5, metalness: 0.0,
  });
  const mark = new THREE.Mesh(markGeo, mat);
  mark.position.set(0, 0, 0.012);
  stk.add(mark);
  stk.userData.mark = player;
  stk.userData.markMesh = mark;
}

// ---- move definitions (cube-local) -------------------------------
// axis: 0=x 1=y 2=z ; layer: -1/0/1 ; sign: rotation sign about +axis
const MOVES = {
  "U":  { axis: 1, layer:  1, sign: -1 }, "U'": { axis: 1, layer:  1, sign:  1 },
  "D":  { axis: 1, layer: -1, sign:  1 }, "D'": { axis: 1, layer: -1, sign: -1 },
  "R":  { axis: 0, layer:  1, sign: -1 }, "R'": { axis: 0, layer:  1, sign:  1 },
  "L":  { axis: 0, layer: -1, sign:  1 }, "L'": { axis: 0, layer: -1, sign: -1 },
  "F":  { axis: 2, layer:  1, sign: -1 }, "F'": { axis: 2, layer:  1, sign:  1 },
  "B":  { axis: 2, layer: -1, sign:  1 }, "B'": { axis: 2, layer: -1, sign: -1 },
  "M":  { axis: 0, layer:  0, sign:  1 }, "M'": { axis: 0, layer:  0, sign: -1 },
  "E":  { axis: 1, layer:  0, sign:  1 }, "E'": { axis: 1, layer:  0, sign: -1 },
  "S":  { axis: 2, layer:  0, sign: -1 }, "S'": { axis: 2, layer:  0, sign:  1 },
};
const MOVE_ORDER = ["U","U'","D","D'","R","R'","L","L'","F","F'","B","B'","M","M'","E","E'","S","S'"];
const AXIS_VEC = [new THREE.Vector3(1,0,0), new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,1)];

let activeTween = null;

function startTween(axis, layer, sign, onDone) {
  const pivot = new THREE.Group();
  cubeGroup.add(pivot);
  const axisVec = AXIS_VEC[axis];
  const moving = cubies.filter(
    (c) => Math.round(c.position.getComponent(axis) / SPACING) === layer
  );
  moving.forEach((c) => pivot.attach(c));

  activeTween = {
    pivot, axisVec, moving,
    target: (sign * Math.PI) / 2,
    start: performance.now(),
    onDone,
  };
}

function finishTween() {
  const { pivot, axisVec, moving, target } = activeTween;
  pivot.quaternion.setFromAxisAngle(axisVec, target);
  pivot.updateMatrixWorld(true);
  moving.forEach((c) => {
    cubeGroup.attach(c);
    snapCubie(c);
  });
  cubeGroup.remove(pivot);
  const done = activeTween.onDone;
  activeTween = null;
  if (done) done();
}

function snapCubie(c) {
  c.position.set(
    Math.round(c.position.x / SPACING) * SPACING,
    Math.round(c.position.y / SPACING) * SPACING,
    Math.round(c.position.z / SPACING) * SPACING
  );
  c.quaternion.copy(snapQuaternion(c.quaternion));
}

function snapAxisVec(v) {
  const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
  const i = a[0] >= a[1] && a[0] >= a[2] ? 0 : a[1] >= a[2] ? 1 : 2;
  const out = new THREE.Vector3();
  out.setComponent(i, Math.sign(v.getComponent(i)) || 1);
  return out;
}

function snapQuaternion(q) {
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
  const e = m.elements;
  const cx = snapAxisVec(new THREE.Vector3(e[0], e[1], e[2]));
  const cy = snapAxisVec(new THREE.Vector3(e[4], e[5], e[6]));
  const cz = snapAxisVec(new THREE.Vector3(e[8], e[9], e[10]));
  const nm = new THREE.Matrix4();
  nm.set(
    cx.x, cy.x, cz.x, 0,
    cx.y, cy.y, cz.y, 0,
    cx.z, cy.z, cz.z, 0,
    0, 0, 0, 1
  );
  return new THREE.Quaternion().setFromRotationMatrix(nm);
}

// ---- game state ---------------------------------------------------
// A round is: the placer drops their mark, then the OPPONENT rotates a
// layer that must contain the just-placed cubie. The placer alternates.
const state = {
  placer: "X",      // whose mark goes down this round (X = P1, O = P2)
  phase: "place",   // "place" | "rotate"
  over: false,
};

let lastPlacedCubie = null; // the cubie the rotation must include
let aiEnabled = false;      // when true, Player 2 (O) is the AI
let inputLocked = false;    // blocks human input while the AI acts

const opponent = (p) => (p === "X" ? "O" : "X");
// The player who must act right now.
const actingPlayer = () => (state.phase === "place" ? state.placer : opponent(state.placer));

const turnEl  = document.getElementById("turn-indicator");
const phaseEl = document.getElementById("phase-indicator");
const banner  = document.getElementById("banner");
const bannerText = document.getElementById("banner-text");

function updateHUD() {
  const acting = actingPlayer();
  const num = acting === "X" ? 1 : 2;
  const ai = aiEnabled && acting === "O" && !state.over;
  turnEl.textContent = `Player ${num} (${acting})${ai ? " · AI" : ""}`;
  turnEl.className = acting === "X" ? "player-x" : "player-o";
  if (state.over) phaseEl.textContent = "";
  else if (ai) phaseEl.textContent = "— AI is thinking…";
  else phaseEl.textContent = state.phase === "place"
    ? "— place your mark"
    : "— rotate a layer through the new mark";
  updateButtons();
}

// Which of the 18 moves rotate a layer that contains this grid position?
function movesForPos(pos) {
  const set = new Set();
  for (const label of MOVE_ORDER) {
    const m = MOVES[label];
    if (m.layer === pos[m.axis]) set.add(label);
  }
  return set; // exactly 6 (one layer per axis × 2 directions)
}
function validMovesFor(cubie) {
  return movesForPos([
    Math.round(cubie.position.x / SPACING),
    Math.round(cubie.position.y / SPACING),
    Math.round(cubie.position.z / SPACING),
  ]);
}

function updateButtons() {
  const valid = state.phase === "rotate" && lastPlacedCubie ? validMovesFor(lastPlacedCubie) : null;
  const canRotate = state.phase === "rotate" && !state.over && !activeTween && !inputLocked;
  moveButtons.forEach((b, i) => {
    b.disabled = !(canRotate && valid && valid.has(MOVE_ORDER[i]));
  });
}

// Highlight the placed sticker so the rotator can see which cubie to include.
let placedHighlight = null;
function highlightPlaced(stk) {
  clearPlacedHighlight();
  const mat = stk.material;
  placedHighlight = { mat, emissive: mat.emissive.clone(), intensity: mat.emissiveIntensity };
  mat.emissive = new THREE.Color(0x37c8ff);
  mat.emissiveIntensity = 0.6;
}
function clearPlacedHighlight() {
  if (!placedHighlight) return;
  placedHighlight.mat.emissive.copy(placedHighlight.emissive);
  placedHighlight.mat.emissiveIntensity = placedHighlight.intensity;
  placedHighlight = null;
}

// Place the current placer's mark, then hand the rotation to the opponent.
function commitPlacement(stk) {
  if (stk.userData.mark) return false;
  placeMark(stk, state.placer);
  lastPlacedCubie = stk.userData.cubie;
  highlightPlaced(stk);
  state.phase = "rotate";
  handoff();
  return true;
}

function doMove(label, onDone) {
  if (state.over || activeTween || state.phase !== "rotate") return;
  if (!lastPlacedCubie || !validMovesFor(lastPlacedCubie).has(label)) return;
  clearHint();
  const m = MOVES[label];
  startTween(m.axis, m.layer, m.sign, onDone);
  updateButtons();
}

// Called after a rotation fully settles.
function afterRotate() {
  clearPlacedHighlight();
  const rotator = opponent(state.placer); // the player who just rotated
  const result = checkWin(rotator);
  if (result) {
    endGame(result);
    return;
  }
  if (stickers.every((s) => s.userData.mark)) {
    endGame({ draw: true });
    return;
  }
  state.placer = opponent(state.placer); // next round the other player places
  state.phase = "place";
  lastPlacedCubie = null;
  handoff();
}

// Update the HUD and, if it's now the AI's action, schedule it.
function handoff() {
  const ai = aiEnabled && actingPlayer() === "O" && !state.over;
  inputLocked = ai;
  updateHUD();
  if (ai) setTimeout(aiAct, 550);
}

// ---- win detection ------------------------------------------------
const LINES = [
  [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
  [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
  [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],
];

function checkWin(priority) {
  const winners = []; // { player, cells:[stk,stk,stk] }
  for (let axis = 0; axis < 3; axis++) {
    for (const s of [1, -1]) {
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      const grid = [[null,null,null],[null,null,null],[null,null,null]];
      for (const cubie of cubies) {
        for (const stk of cubie.userData.stickers) {
          const n = snapAxisVec(stk.userData.localNormal.clone().applyQuaternion(cubie.quaternion));
          if (n.getComponent(axis) !== s) continue;
          const i = Math.round(cubie.position.getComponent(u) / SPACING) + 1;
          const j = Math.round(cubie.position.getComponent(v) / SPACING) + 1;
          grid[i][j] = stk;
        }
      }
      for (const line of LINES) {
        const cells = line.map(([i, j]) => grid[i][j]);
        if (cells.some((c) => !c || !c.userData.mark)) continue;
        const mk = cells[0].userData.mark;
        if (cells.every((c) => c.userData.mark === mk)) {
          winners.push({ player: mk, cells });
        }
      }
    }
  }
  if (winners.length === 0) return null;
  // Either player may win on a rotation; the rotator takes priority on a tie.
  const pref = winners.find((w) => w.player === priority);
  return pref || winners[0];
}

function endGame(result) {
  state.over = true;
  updateButtons();
  if (result.draw) {
    bannerText.textContent = "Draw!";
    bannerText.style.color = "var(--text)";
  } else {
    const num = result.player === "X" ? 1 : 2;
    bannerText.textContent = `Player ${num} (${result.player}) wins!`;
    bannerText.style.color = result.player === "X" ? X_COLOR : O_COLOR;
    result.cells.forEach((stk) => {
      stk.material.emissive = new THREE.Color(0x2ecc71);
      stk.material.emissiveIntensity = 0.9;
    });
  }
  banner.classList.remove("hidden");
}

// ---- AI opponent (Player 2 / O) -----------------------------------
// A lightweight pure-data cube simulator lets the AI try every
// (placement, move) pair and see the result *after* the rotation,
// matching the real move/win conventions exactly.

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 90° rotation of an integer vector about +axis, signed (matches startTween).
function rotateVec(v, axis, sign) {
  const [x, y, z] = v;
  if (axis === 0) return sign > 0 ? [x, -z, y] : [x, z, -y];
  if (axis === 1) return sign > 0 ? [z, y, -x] : [-z, y, x];
  return sign > 0 ? [-y, x, z] : [y, -x, z];
}

// Capture the live cube as plain data; keep ci/si to map facelets back.
function snapshot() {
  return cubies.map((c, ci) => ({
    pos: [
      Math.round(c.position.x / SPACING),
      Math.round(c.position.y / SPACING),
      Math.round(c.position.z / SPACING),
    ],
    stickers: c.userData.stickers.map((stk, si) => ({
      normal: snapAxisVec(
        stk.userData.localNormal.clone().applyQuaternion(c.quaternion)
      ).toArray().map((n) => Math.round(n)),
      mark: stk.userData.mark,
      ci, si,
    })),
  }));
}

function cloneState(st) {
  return st.map((c) => ({
    pos: c.pos.slice(),
    stickers: c.stickers.map((s) => ({
      normal: s.normal.slice(), mark: s.mark, ci: s.ci, si: s.si,
    })),
  }));
}

function applyMoveSim(st, axis, layer, sign) {
  for (const c of st) {
    if (c.pos[axis] !== layer) continue;
    c.pos = rotateVec(c.pos, axis, sign);
    for (const s of c.stickers) s.normal = rotateVec(s.normal, axis, sign);
  }
}

// Build the 3x3 grid of marks for a face, or null where empty.
function faceGrid(st, axis, sgn) {
  const u = (axis + 1) % 3, v = (axis + 2) % 3;
  const grid = [[null,null,null],[null,null,null],[null,null,null]];
  for (const c of st) {
    for (const s of c.stickers) {
      if (s.normal[axis] !== sgn) continue;
      grid[c.pos[u] + 1][c.pos[v] + 1] = s.mark;
    }
  }
  return grid;
}

function hasLine(st, mark) {
  for (let axis = 0; axis < 3; axis++) {
    for (const sgn of [1, -1]) {
      const grid = faceGrid(st, axis, sgn);
      for (const line of LINES) {
        if (line.every(([i, j]) => grid[i][j] === mark)) return true;
      }
    }
  }
  return false;
}

// Prefer states where O is building lines and X is not.
function heuristic(st) {
  let score = 0;
  for (let axis = 0; axis < 3; axis++) {
    for (const sgn of [1, -1]) {
      const grid = faceGrid(st, axis, sgn);
      for (const line of LINES) {
        let o = 0, x = 0;
        for (const [i, j] of line) {
          const m = grid[i][j];
          if (m === "O") o++; else if (m === "X") x++;
        }
        if (x === 0 && o > 0) score += o * o;
        if (o === 0 && x > 0) score -= x * x * 1.2;
      }
    }
  }
  return score;
}

const WIN_VAL = 1e6;

// O is the rotator: pick one of the constrained moves. Returns a label or null.
// The opponent (X) just placed, so an X line means X wins (rotator priority O,
// but an O line beats it). Take an O win; otherwise avoid an X win.
function aiChooseRotation() {
  if (!lastPlacedCubie) return null;
  const valid = [...validMovesFor(lastPlacedCubie)];
  const base = snapshot();
  let best = null, bestScore = -Infinity;
  for (const label of shuffle(valid)) {
    const m = MOVES[label];
    const st = cloneState(base);
    applyMoveSim(st, m.axis, m.layer, m.sign);
    if (hasLine(st, "O")) return label;            // O wins outright (rotator priority)
    let score = heuristic(st);
    if (hasLine(st, "X")) score -= WIN_VAL;        // never hand X the win
    if (score > bestScore) { bestScore = score; best = label; }
  }
  return best;
}

// O is the placer: choose an empty facelet, anticipating that the opponent (X)
// will then pick — from the 6 moves through that cubie — the rotation worst for
// us (X has rotator priority). 1-ply minimax over that response.
function aiChoosePlacement() {
  const base = snapshot();
  const empties = [];
  base.forEach((c) => c.stickers.forEach((s) => { if (!s.mark) empties.push(s); }));
  if (empties.length === 0) return null;

  const realStk = (e) => cubies[e.ci].userData.stickers[e.si];
  let best = null, bestVal = -Infinity;

  for (const e of shuffle(empties)) {
    const valid = [...movesForPos(base[e.ci].pos)];
    let worst = Infinity; // opponent minimises our value
    for (const label of valid) {
      const m = MOVES[label];
      const st = cloneState(base);
      st[e.ci].stickers[e.si].mark = "O";
      applyMoveSim(st, m.axis, m.layer, m.sign);
      // Opponent (X) rotates → X has priority if both lines form.
      let v;
      if (hasLine(st, "X")) v = -WIN_VAL;
      else if (hasLine(st, "O")) v = WIN_VAL;
      else v = heuristic(st);
      if (v < worst) worst = v;
    }
    if (worst > bestVal) { bestVal = worst; best = realStk(e); }
  }
  return best;
}

// Drive whichever action is the AI's right now (placing or rotating as O).
function aiAct() {
  if (!aiEnabled || state.over || actingPlayer() !== "O") { inputLocked = false; updateHUD(); return; }
  if (state.phase === "place") {
    const stk = aiChoosePlacement();
    if (!stk) { inputLocked = false; return; }
    commitPlacement(stk);              // -> rotate phase; opponent (X human) rotates next
  } else {
    const label = aiChooseRotation();
    if (!label) { inputLocked = false; return; }
    doMove(label, afterRotate);
  }
}

// ---- interaction --------------------------------------------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const DRAG_THRESHOLD = 7;

let pointer = null; // active gesture

function pointerToNDC(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
}

function pickSticker(ev) {
  pointerToNDC(ev);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(stickers, false);
  return hits.length ? hits[0] : null;
}

function projectToScreen(v3) {
  const p = v3.clone().project(camera);
  return new THREE.Vector2(p.x, -p.y); // screen-ish (y down)
}

canvas.addEventListener("pointerdown", (ev) => {
  if (state.over || activeTween || inputLocked) return;
  canvas.setPointerCapture(ev.pointerId);
  const hit = pickSticker(ev);
  pointer = {
    id: ev.pointerId,
    startX: ev.clientX, startY: ev.clientY,
    lastX: ev.clientX, lastY: ev.clientY,
    sticker: hit ? hit.object : null,
    hit,
    mode: null, // "orbit" | "twist" | "click"
  };
});

canvas.addEventListener("pointermove", (ev) => {
  if (!pointer || ev.pointerId !== pointer.id) return;
  const dx = ev.clientX - pointer.startX;
  const dy = ev.clientY - pointer.startY;

  if (!pointer.mode) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    // decide gesture
    if (pointer.sticker && state.phase === "rotate" && !activeTween) {
      beginTwist(pointer, dx, dy);
      pointer.mode = pointer.mode || "orbit"; // fallthrough if twist failed
    } else {
      pointer.mode = "orbit";
    }
  }

  if (pointer.mode === "orbit") {
    const mx = ev.clientX - pointer.lastX;
    const my = ev.clientY - pointer.lastY;
    cubeGroup.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), mx * 0.01);
    cubeGroup.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), my * 0.01);
  }
  pointer.lastX = ev.clientX;
  pointer.lastY = ev.clientY;
});

canvas.addEventListener("pointerup", (ev) => {
  if (!pointer || ev.pointerId !== pointer.id) return;
  const moved = Math.hypot(ev.clientX - pointer.startX, ev.clientY - pointer.startY);
  if (!pointer.mode && moved < DRAG_THRESHOLD) {
    // a click
    if (pointer.sticker && state.phase === "place" && !state.over && !inputLocked) {
      commitPlacement(pointer.sticker);
    }
  }
  pointer = null;
});

canvas.addEventListener("pointercancel", () => { pointer = null; });

// Determine which layer/axis a drag on a sticker should twist, then execute.
function beginTwist(p, dx, dy) {
  const cubie = p.sticker.userData.cubie;
  // face normal in cube-local frame
  const faceN = snapAxisVec(p.sticker.userData.localNormal.clone().applyQuaternion(cubie.quaternion));
  const faceAxis = faceN.x !== 0 ? 0 : faceN.y !== 0 ? 1 : 2;
  const tangents = [0, 1, 2].filter((a) => a !== faceAxis);

  const cubeWorldQ = cubeGroup.quaternion;
  const drag = new THREE.Vector2(dx, dy).normalize();

  // screen projection of each tangent (local axis -> world dir)
  const scr = tangents.map((a) => {
    const localDir = new THREE.Vector3();
    localDir.setComponent(a, 1);
    const worldDir = localDir.clone().applyQuaternion(cubeWorldQ);
    const o = projectToScreen(cubeGroup.position.clone());
    const t = projectToScreen(cubeGroup.position.clone().add(worldDir));
    return { axis: a, vec: t.sub(o).normalize() };
  });

  // the tangent most aligned with the drag = "move-along"; rotate about the OTHER
  scr.sort((m, n) => Math.abs(n.vec.dot(drag)) - Math.abs(m.vec.dot(drag)));
  const alongAxis = scr[0].axis;
  const rotAxis = tangents.find((a) => a !== alongAxis);

  const layer = Math.round(cubie.position.getComponent(rotAxis) / SPACING);

  // The rotation must include the just-placed cubie; swallow the gesture if not.
  if (!lastPlacedCubie ||
      Math.round(lastPlacedCubie.position.getComponent(rotAxis) / SPACING) !== layer) {
    p.mode = "twist"; // consume so it neither orbits nor twists
    return;
  }

  // sign: rotating +about rotAxis should move the clicked cubie along the drag
  const r = new THREE.Vector3().copy(cubie.position); // point rel. cube centre
  const axisLocal = new THREE.Vector3().setComponent(rotAxis, 1);
  const vel = new THREE.Vector3().crossVectors(axisLocal, r);     // local velocity for +rot
  const velWorld = vel.applyQuaternion(cubeWorldQ);
  const oS = projectToScreen(cubeGroup.position.clone());
  const vS = projectToScreen(cubeGroup.position.clone().add(velWorld)).sub(oS);
  const sign = vS.dot(drag) >= 0 ? 1 : -1;

  p.mode = "twist";
  startTween(rotAxis, layer, sign, () => {
    afterRotate();
    updateButtons();
  });
  updateButtons();
}

// ---- hover preview: glow the layer + show direction arrows --------
const HINT_COLOR = new THREE.Color(0xffd23f);
let hoverHint = null; // { group, restores: [{ mat, emissive, intensity }] }

function layerCubies(axis, layer) {
  return cubies.filter(
    (c) => Math.round(c.position.getComponent(axis) / SPACING) === layer
  );
}

// A full ring around the rotation axis with two arrowheads showing direction.
function makeMoveArrows(axis, layer, sign) {
  const group = new THREE.Group();
  const axisVec = AXIS_VEC[axis];
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisVec);
  group.position.copy(axisVec).multiplyScalar(layer * SPACING);

  const R = 2.25;
  const mat = new THREE.MeshBasicMaterial({ color: HINT_COLOR });
  group.userData.mat = mat;

  group.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 10, 72), mat));

  const coneGeo = new THREE.ConeGeometry(0.17, 0.42, 18);
  for (const theta of [0, Math.PI]) {
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.position.set(Math.cos(theta) * R, Math.sin(theta) * R, 0);
    // tangent of motion at this point (flip for clockwise turns)
    const tangent = new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0);
    if (sign < 0) tangent.negate();
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    group.add(cone);
  }
  return group;
}

function showHint(label) {
  if (state.over || activeTween || state.phase !== "rotate") return;
  clearHint();
  const m = MOVES[label];

  const group = makeMoveArrows(m.axis, m.layer, m.sign);
  cubeGroup.add(group);

  const restores = [];
  for (const c of layerCubies(m.axis, m.layer)) {
    for (const stk of c.userData.stickers) {
      const mat = stk.material;
      restores.push({ mat, emissive: mat.emissive.clone(), intensity: mat.emissiveIntensity });
      mat.emissive = HINT_COLOR.clone();
      mat.emissiveIntensity = 0.55;
    }
  }
  hoverHint = { group, restores };
}

function clearHint() {
  if (!hoverHint) return;
  cubeGroup.remove(hoverHint.group);
  hoverHint.group.traverse((o) => o.geometry && o.geometry.dispose());
  if (hoverHint.group.userData.mat) hoverHint.group.userData.mat.dispose();
  for (const r of hoverHint.restores) {
    r.mat.emissive.copy(r.emissive);
    r.mat.emissiveIntensity = r.intensity;
  }
  hoverHint = null;
}

// ---- move buttons -------------------------------------------------
const movesContainer = document.getElementById("moves");
const moveButtons = [];
for (const label of MOVE_ORDER) {
  const b = document.createElement("button");
  b.textContent = label;
  b.addEventListener("click", () => {
    if (inputLocked) return;
    doMove(label, afterRotate);
  });
  b.addEventListener("mouseenter", () => showHint(label));
  b.addEventListener("mouseleave", clearHint);
  movesContainer.appendChild(b);
  moveButtons.push(b);
}

// ---- reset --------------------------------------------------------
function reset() {
  clearHint();
  clearPlacedHighlight();
  buildCube();
  state.placer = "X";   // Player 1 (human) always places first
  state.phase = "place";
  state.over = false;
  lastPlacedCubie = null;
  inputLocked = false;
  banner.classList.add("hidden");
  updateHUD();
}
document.getElementById("reset").addEventListener("click", reset);
document.getElementById("banner-reset").addEventListener("click", reset);

// ---- AI toggle ----------------------------------------------------
const aiToggle = document.getElementById("ai-toggle");
aiToggle.addEventListener("change", () => {
  aiEnabled = aiToggle.checked;
  clearHint();
  // If the player who must act now is O, let the AI take over; else unlock.
  if (aiEnabled && actingPlayer() === "O" && !state.over && !activeTween) {
    inputLocked = true;
    updateHUD();
    setTimeout(aiAct, 350);
  } else {
    inputLocked = false;
    updateHUD();
  }
});

// ---- render loop --------------------------------------------------
function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function animate(now) {
  resize();
  if (activeTween) {
    const t = Math.min(1, (now - activeTween.start) / TURN_MS);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    activeTween.pivot.quaternion.setFromAxisAngle(
      activeTween.axisVec, activeTween.target * eased
    );
    if (t >= 1) finishTween();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ---- boot ---------------------------------------------------------
buildCube();
updateHUD();
requestAnimationFrame(animate);
