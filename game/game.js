// "Suck It!" Vacuum Game -- core loop (see DESIGN.md).
// Grid-based: clean every reachable floor cell. Arrow keys (desktop) or
// cardinal touch-drag (mobile). Cell = sprite = 64px; cleaning/collision
// are per-cell; the sprite glides between cells for smooth motion.
(function () {
	'use strict';

	// --- grid / geometry ---
	var CELL = 64;
	var COLS = 16, ROWS = 12;            // 1024 x 768
	var FLOOR = 0, CLEAN = 1, WALL = 2, FURN_DIRTY = 3, FURN_CLEAN = 4, DOOR = 5;

	// --- motion ---
	// Runs on a 60fps rAF loop. GLIDE_PX = sprite px advanced per frame.
	// Smaller = slower AND smoother (more frames per 64px cell); larger =
	// faster and choppier. 8 = 8 frames/cell. Use a divisor of 64 (4/8/16/32).
	var GLIDE_PX = 8;
	var TOUCH_DEADZONE = 16;             // px of drag before a direction registers

	// --- timing ---
	var TIME_LIMIT = 60;                 // seconds, Timed Mode
	var mode = 'timed';                  // 'timed' | 'freestyle'
	var MAX_LEVEL = 4;                    // clear this many levels to win the game
	var START_LEVEL = 4;                 // DEBUG: level to start on -- set to 4 to jump straight to level 4
	var CAT_LEVEL = 4;                    // a cat starts scurrying around the room from this level on
	var CAT_GLIDE = 12;                   // cat px/frame (faster than Kirby's 8 = a scurry; step() clamps to the cell, any value OK)

	// --- colors (fixed; identical in light/dark so the "room" reads the same) ---
	var COL_FLOOR = '#b9a986';           // dusty carpet (dirty)
	var COL_CLEAN = '#e9dec2';           // cleaned carpet (lighter)
	var COL_WALL  = '#232323';           // generated walls (per spec: black)
	var COL_GRID  = 'rgba(0,0,0,0.1)';   // faint cell lines

	// --- sprites ---
	var DIR_IMGS = {
		up: 'assets/up.png', down: 'assets/down.png',
		left: 'assets/left.png', right: 'assets/right.png', idle: 'assets/vroom.png',
		dirty: 'assets/carpet_dirty.png', clean: 'assets/carpet_clean.png',
		wall_top: 'assets/wall_top.png', wall_bottom: 'assets/wall_bottom.png',
		wall_left: 'assets/wall_left.png', wall_right: 'assets/wall_right.png',
		wall_top_left: 'assets/wall_top_left.png', wall_top_right: 'assets/wall_top_right.png',
		wall_bottom_left: 'assets/wall_bottom_left.png', wall_bottom_right: 'assets/wall_bottom_right.png',
		title: 'assets/titlecard.png',
		door_closed: 'assets/door_closed.png', door_open: 'assets/door_open.png',   // 64x64 each
		cat: 'assets/cat.png'
	};
	var imgs = {};

	// --- furniture ---
	// Placement is randomized each game (see generateFurniture): the couch
	// faces a random direction with the TV 1 cell in front of its middle; the
	// chair faces a random direction with a side table 1 cell off an arm side
	// (table randomly rotated); coffee table and trash go anywhere. Validated.
	var FURNI_SRCS = ['assets/couch.png', 'assets/tv.png', 'assets/chair.png', 'assets/side_table.png', 'assets/coffee_table.png', 'assets/trash_can.png', 'assets/pot_plant.png'];
	var FALLBACK_FURNITURE = [
		{ src: 'assets/couch.png',        col: 6,  row: 2, w: 3, h: 1, rot: 0 },
		{ src: 'assets/tv.png',           col: 7,  row: 4, w: 1, h: 1, rot: 180 },
		{ src: 'assets/side_table.png',   col: 3,  row: 6, w: 1, h: 1, rot: 0 },
		{ src: 'assets/chair.png',        col: 3,  row: 8, w: 1, h: 1, rot: 0 },
		{ src: 'assets/coffee_table.png', col: 11, row: 6, w: 1, h: 2, rot: 0 },
		{ src: 'assets/trash_can.png',    col: 13, row: 2, w: 1, h: 1, rot: 0 }
	];
	var FURNITURE = [];   // filled by generateFurniture() each reset
	var furnImgs = {};

	var DIRS = {
		ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0]
	};
	var START = { col: 1, row: 1 };           // current spawn cell (level 1 corner; later = mirrored from the exit door)
	var entryPx = CELL, entryPy = CELL, entryFacing = 'idle';   // glide-in start px/py + facing on level entry

	var canvas, ctx, hud, resetBtn;
	var grid, kirby, heldDir, facing, cleaned, reachableTotal, cat;
	var won, timeUp, over, elapsed, startTime, moved, raf, modeSel, musicBtn, sfxBtn;
	var level = START_LEVEL;   // current level; each cleared room advances +1 and adds furniture
	var door = null;       // { cells:[[c,r]], inner:[[c,r]], open } -- the single-cell exit
	var entryDoor = null;  // { col, row, closeAt } -- transient OPEN door Kirby glides in through; -> wall ~1s after landing
	var started = false;   // title card shows until the first move

	// --- audio ---
	// Background: Lounge Jazz. SFX: self-recorded vacuum,
	// looped while moving. Both need a user gesture to start (autoplay policy).
	var music = new Audio('assets/sounds/TerrySnyder&JackCooper_CestSiBon.mp3');
	music.loop = true; music.volume = 0.40;
	var vroomSfx = new Audio('assets/sounds/vacuum_on.mp3');   // recorded by Alex
	vroomSfx.loop = true; vroomSfx.volume = 0.15;
	var winSfx = new Audio('assets/sounds/win.mp3');   winSfx.volume = 0.30;
	var failSfx = new Audio('assets/sounds/fail.mp3'); failSfx.volume = 0.30;
	var audioStarted = false, musicMuted = true, sfxMuted = false, vroomPlaying = false;

	function startAudio() {   // first user gesture unlocks + starts the music
		if (audioStarted) return;
		audioStarted = true;
		if (!musicMuted) music.play().catch(function (e) { console.warn('music blocked:', e.name, e.message); });
	}
	function setMusicMuted(m) {
		musicMuted = m;
		if (m) music.pause();
		else if (audioStarted) music.play().catch(function (e) { console.warn('music:', e.name); });
	}
	function toggleMusic() {   // shared by the M key and the Music button
		setMusicMuted(!musicMuted);
		if (musicBtn) musicBtn.textContent = (musicMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A') + ' Music';
	}
	function setSfxMuted(m) {
		sfxMuted = m;
		if (m && vroomPlaying) { vroomSfx.pause(); vroomPlaying = false; }
	}
	function updateVroom(moving) {
		if (!audioStarted || sfxMuted) { if (vroomPlaying) { vroomSfx.pause(); vroomPlaying = false; } return; }
		if (moving && !vroomPlaying) { vroomSfx.currentTime = 0; vroomSfx.play().catch(function (e) { console.warn('vroom sfx:', e.name); }); vroomPlaying = true; }
		else if (!moving && vroomPlaying) { vroomSfx.pause(); vroomPlaying = false; }
	}
	function playOneShot(a) {   // win/fail stingers; follow the SFX (vacuum) mute
		if (!audioStarted || sfxMuted) return;
		try { a.currentTime = 0; } catch (e) {}
		a.play().catch(function () {});
	}

	// --- setup ---
	function buildGrid() {
		grid = [];
		for (var r = 0; r < ROWS; r++) {
			grid[r] = [];
			for (var c = 0; c < COLS; c++) {
				var border = (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1);
				grid[r][c] = border ? WALL : FLOOR;
			}
		}
		FURNITURE.forEach(function (f) {
			for (var dr = 0; dr < f.h; dr++)
				for (var dc = 0; dc < f.w; dc++)
					grid[f.row + dr][f.col + dc] = FURN_DIRTY;
		});
		if (door) door.cells.forEach(function (dc) { grid[dc[1]][dc[0]] = DOOR; });
	}

	// BFS over passable cells from start -> count of cleanable cells reachable
	function countReachable() {
		var seen = {}, q = [[START.col, START.row]], n = 0;
		seen[START.col + ',' + START.row] = true;
		while (q.length) {
			var cur = q.pop(), c = cur[0], r = cur[1];
			n++;
			[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
				var nc = c + d[0], nr = r + d[1], k = nc + ',' + nr;
				if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return;
				if (!passable(grid[nr][nc]) || seen[k]) return;
				seen[k] = true; q.push([nc, nr]);
			});
		}
		return n;
	}

	function randInt(n) { return (Math.random() * n) | 0; }

	// couch (3 long) + coffee table (2 long) as a rigid group facing `dir`;
	// the couch front (bottom of its sprite) points toward the table.
	// dc/dr are offsets from the group's top-left anchor; w/h are footprints.
	// couch (3 long) + TV (1x1) in front of the couch's MIDDLE cell, with a
	// 1-cell floor lane between them. Couch front (bottom of sprite) faces the
	// TV; the TV is rotated to face back at the couch (assumes the TV sprite's
	// screen faces DOWN by default -- flip a rot if yours faces the other way).
	function couchTvGroup(dir) {
		if (dir === 'down') return { w: 3, h: 3, pieces: [
			{ src: 'assets/couch.png', dc: 0, dr: 0, w: 3, h: 1, rot: 0 },
			{ src: 'assets/tv.png',    dc: 1, dr: 2, w: 1, h: 1, rot: 180 } ] };
		if (dir === 'up') return { w: 3, h: 3, pieces: [
			{ src: 'assets/couch.png', dc: 0, dr: 2, w: 3, h: 1, rot: 180 },
			{ src: 'assets/tv.png',    dc: 1, dr: 0, w: 1, h: 1, rot: 0 } ] };
		if (dir === 'right') return { w: 3, h: 3, pieces: [
			{ src: 'assets/couch.png', dc: 0, dr: 0, w: 1, h: 3, rot: 270 },
			{ src: 'assets/tv.png',    dc: 2, dr: 1, w: 1, h: 1, rot: 90 } ] };
		return { w: 3, h: 3, pieces: [   /* left */
			{ src: 'assets/couch.png', dc: 2, dr: 0, w: 1, h: 3, rot: 90 },
			{ src: 'assets/tv.png',    dc: 0, dr: 1, w: 1, h: 1, rot: 270 } ] };
	}

	// place a free-standing piece at a random non-overlapping interior spot,
	// picking randomly among the given footprint/rotation options
	function placeFree(occ, src, footprints) {
		for (var t = 0; t < 300; t++) {
			var fp = footprints[randInt(footprints.length)];
			var c = 1 + randInt((COLS - 2) - fp.w + 1);
			var r = 1 + randInt((ROWS - 2) - fp.h + 1);
			var cells = [], clash = false;
			for (var dr = 0; dr < fp.h; dr++)
				for (var dc = 0; dc < fp.w; dc++) {
					var cc = c + dc, rr = r + dr;
					if ((cc === START.col && rr === START.row) || occ[cc + ',' + rr]) clash = true;
					cells.push([cc, rr]);
				}
			if (clash) continue;
			cells.forEach(function (x) { occ[x[0] + ',' + x[1]] = true; });
			return { src: src, col: c, row: r, w: fp.w, h: fp.h, rot: fp.rot };
		}
		return null;
	}

	// is every interior floor cell reachable from start given blocked cells?
	function layoutReachable(occ) {
		var floor = 0, r, c;
		for (r = 1; r <= ROWS - 2; r++)
			for (c = 1; c <= COLS - 2; c++)
				if (!occ[c + ',' + r]) floor++;
		var seen = {}, q = [[START.col, START.row]], n = 0;
		seen[START.col + ',' + START.row] = true;
		while (q.length) {
			var cur = q.pop(); c = cur[0]; r = cur[1]; n++;
			[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
				var nc = c + d[0], nr = r + d[1], k = nc + ',' + nr;
				if (nc < 1 || nc > COLS - 2 || nr < 1 || nr > ROWS - 2) return;
				if (occ[k] || seen[k]) return;
				seen[k] = true; q.push([nc, nr]);
			});
		}
		return n === floor;
	}

	// chair facing any direction (front = LEFT of sprite by default) + side
	// table 1 cell off one of its ARM sides (perpendicular to facing), floor
	// lane between. The side table gets a random 45deg rotation so the coffee
	// mug lands in a random spot. `tableFirst` picks which of the two arms.
	function chairSideGroup(facing, tableFirst) {
		var chairRot = { left: 0, up: 90, right: 180, down: 270 }[facing];
		var t = { src: 'assets/side_table.png', w: 1, h: 1, rot: randInt(8) * 45 };
		var c = { src: 'assets/chair.png', w: 1, h: 1, rot: chairRot };
		var first = tableFirst ? t : c, second = tableFirst ? c : t;
		if (facing === 'left' || facing === 'right') {   // arms up/down -> vertical
			first.dc = 0; first.dr = 0; second.dc = 0; second.dr = 2;
			return { w: 1, h: 3, pieces: [first, second] };
		}
		first.dc = 0; first.dr = 0; second.dc = 2; second.dr = 0;   // arms left/right -> horizontal
		return { w: 3, h: 1, pieces: [first, second] };
	}

	// place a rigid group at a random non-overlapping interior anchor
	function placeGroup(occ, grp) {
		for (var t = 0; t < 300; t++) {
			var ac = 1 + randInt((COLS - 2) - grp.w + 1);
			var ar = 1 + randInt((ROWS - 2) - grp.h + 1);
			var cells = [], clash = false;
			grp.pieces.forEach(function (p) {
				for (var dr = 0; dr < p.h; dr++)
					for (var dc = 0; dc < p.w; dc++) {
						var c = ac + p.dc + dc, r = ar + p.dr + dr;
						if ((c === START.col && r === START.row) || occ[c + ',' + r]) clash = true;
						cells.push([c, r]);
					}
			});
			if (clash) continue;
			cells.forEach(function (x) { occ[x[0] + ',' + x[1]] = true; });
			return grp.pieces.map(function (p) {
				return { src: p.src, col: ac + p.dc, row: ar + p.dr, w: p.w, h: p.h, rot: p.rot };
			});
		}
		return null;
	}

	// a single-cell door on a random wall (never a corner); `inner` = the one
	// interior cell directly behind it (kept clear so the exit stays reachable).
	function pickDoor(avoid) {
		for (var t = 0; t < 100; t++) {
			var side = randInt(4), cell, inner;
			if (side < 2) {                                   // top / bottom wall
				var row = side === 0 ? 0 : ROWS - 1, inr = side === 0 ? 1 : ROWS - 2;
				var c = 1 + randInt(COLS - 2);                 // any non-corner column
				cell = [c, row]; inner = [c, inr];
			} else {                                          // left / right wall
				var col = side === 2 ? 0 : COLS - 1, inc = side === 2 ? 1 : COLS - 2;
				var r = 1 + randInt(ROWS - 2);                 // any non-corner row
				cell = [col, r]; inner = [inc, r];
			}
			if (inner[0] === START.col && inner[1] === START.row) continue;
			if (avoid && cell[0] === avoid[0] && cell[1] === avoid[1]) continue;   // exit door must not reuse the entry cell
			return { cells: [cell], inner: [inner], open: false };
		}
		return { cells: [[7, 0]], inner: [[7, 1]], open: false };
	}

	// one extra object for difficulty scaling: a random duplicate of any of the
	// non-couch/TV pieces, placed free-standing (random rotation where it reads).
	function randomExtra() {
		switch (randInt(5)) {
			case 0: return { src: 'assets/coffee_table.png', footprints: [{ w: 1, h: 2, rot: 0 }, { w: 2, h: 1, rot: 90 }] };
			case 1: return { src: 'assets/chair.png', footprints: [{ w: 1, h: 1, rot: [0, 90, 180, 270][randInt(4)] }] };
			case 2: return { src: 'assets/side_table.png', footprints: [{ w: 1, h: 1, rot: randInt(8) * 45 }] };
			case 3: return { src: 'assets/pot_plant.png', footprints: [{ w: 1, h: 1, rot: 0 }] };
			default: return { src: 'assets/trash_can.png', footprints: [{ w: 1, h: 1, rot: 0 }] };
		}
	}

	// base furniture + `extraCount` random extras + a door, validated so every
	// floor cell (and the door approach) stays reachable. null if it can't fit.
	function generateLevel(extraCount, avoid) {
		var DIRS4 = ['down', 'up', 'left', 'right'];
		for (var attempt = 0; attempt < 400; attempt++) {
			var d = pickDoor(avoid), occ = {};
			var g1 = placeGroup(occ, couchTvGroup(DIRS4[randInt(4)]));
			var g2 = placeGroup(occ, chairSideGroup(DIRS4[randInt(4)], randInt(2) === 0));
			if (!g1 || !g2) continue;
			var ct = placeFree(occ, 'assets/coffee_table.png', [{ w: 1, h: 2, rot: 0 }, { w: 2, h: 1, rot: 90 }]);
			var tr = placeFree(occ, 'assets/trash_can.png', [{ w: 1, h: 1, rot: 0 }]);
			if (!ct || !tr) continue;
			var items = g1.concat(g2, [ct, tr]), ok = true;
			for (var i = 0; i < extraCount; i++) {
				var ex = randomExtra(), placed = placeFree(occ, ex.src, ex.footprints);
				if (!placed) { ok = false; break; }
				items.push(placed);
			}
			if (!ok) continue;
			if (d.inner.some(function (p) { return occ[p[0] + ',' + p[1]]; })) continue;   // keep the exit approach clear
			if (layoutReachable(occ)) return { furniture: items, door: d };
		}
		return null;
	}

	function replay() { reset(); startGame(); }   // end-screen "play again": new game, no title

	function startGame() {   // first move dismisses the title card and starts play + music
		if (started) return;
		started = true;
		startTime = performance.now();
		startAudio();
	}

	// build the room for the CURRENT `level`: base furniture + 2 extra objects
	// per level past the first, a fresh random door, and a reset timer. Falls
	// back to fewer extras (then a static layout) if a level can't be fit.
	function setupLevel() {
		var entryCell = (entryFacing !== 'idle') ? [entryPx / CELL, entryPy / CELL] : null;   // border cell Kirby enters through
		var extra = 2 * (level - 1), gen = null;
		while (extra >= 0 && !gen) { gen = generateLevel(extra, entryCell); if (!gen) extra -= 2; }
		if (gen) { FURNITURE = gen.furniture; door = gen.door; }
		else { FURNITURE = FALLBACK_FURNITURE; door = { cells: [[7, 0]], inner: [[7, 1]] }; }
		door.open = false;
		buildGrid();
		entryDoor = entryCell ? { col: entryCell[0], row: entryCell[1], closeAt: 0 } : null;
		if (entryDoor) grid[entryDoor.row][entryDoor.col] = DOOR;   // temporary open door Kirby glides through
		reachableTotal = countReachable();
		var totalFloor = 0;
		for (var rr = 0; rr < ROWS; rr++)
			for (var cc = 0; cc < COLS; cc++)
				if (grid[rr][cc] === FLOOR) totalFloor++;
		if (reachableTotal < totalFloor)
			console.warn('Vroom: ' + (totalFloor - reachableTotal) + ' floor cell(s) unreachable -- furniture is trapping floor');
		kirby = { col: START.col, row: START.row, px: entryPx, py: entryPy };
		grid[START.row][START.col] = CLEAN;
		cleaned = 1;
		cleanAdjacent(START.col, START.row);
		heldDir = null;
		facing = entryFacing;
		won = false; timeUp = false; over = false; elapsed = 0; moved = false;
		startTime = performance.now();
		cat = (level >= CAT_LEVEL) ? spawnCat() : null;   // the scurrying cat, from level CAT_LEVEL on
	}

	// full restart: back to level 1 and the title card
	function reset() {
		level = START_LEVEL;
		START = { col: 1, row: 1 };
		entryPx = CELL; entryPy = CELL; entryFacing = 'idle';   // level 1: corner spawn, no glide-in
		setupLevel();
		started = false;   // show the title card again
	}

	// cleared a room -> advance: harder room, no title card (play continues)
	// entering the next room: emerge on the wall OPPOSITE the exit door, at the
	// same position along it, gliding inward in the same heading (continuous).
	function entryFromDoor(dr) {
		var a = dr.cells[0], c = a[0], r = a[1];
		if (a[1] === 0)        return { col: c, row: ROWS - 2, px: c * CELL, py: (ROWS - 1) * CELL, facing: 'up' };
		if (a[1] === ROWS - 1) return { col: c, row: 1,        px: c * CELL, py: 0,                 facing: 'down' };
		if (a[0] === 0)        return { col: COLS - 2, row: r,  px: (COLS - 1) * CELL, py: r * CELL, facing: 'left' };
		return                     { col: 1, row: r,        px: 0,        py: r * CELL,          facing: 'right' };
	}

	function nextLevel() {
		var e = entryFromDoor(door);
		level++;
		START = { col: e.col, row: e.row };
		entryPx = e.px; entryPy = e.py; entryFacing = e.facing;
		setupLevel();
	}

	function tryStartMove() {
		if (!heldDir) return;
		facing = dirName(heldDir);
		var nc = kirby.col + heldDir[0], nr = kirby.row + heldDir[1];
		if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return;   // OOB
		if (!canEnter(nc, nr)) return;                              // wall / furniture / closed or entry door
		if (cat && cat.col === nc && cat.row === nr) return;        // the cat is in the way -- wait for it to move
		if (!moved) { moved = true; startTime = performance.now(); if (cat) cat.nextMoveAt = startTime + 1000; }   // countdown starts on the first actual move
		kirby.col = nc; kirby.row = nr;                             // commit
		if (grid[nr][nc] === DOOR) return;                          // step onto the door; tick runs the transition once aligned on it
		if (grid[nr][nc] === FLOOR) { grid[nr][nc] = CLEAN; cleaned++; }
		cleanAdjacent(nc, nr);   // suction reaches furniture on the 4 sides (not corners)
	}

	function dirName(d) {
		if (d[0] < 0) return 'left';
		if (d[0] > 0) return 'right';
		if (d[1] < 0) return 'up';
		return 'down';
	}

	function passable(s) { return s === FLOOR || s === CLEAN; }   // floor-only (doors never count toward cleaning/reachability)
	// movement passability: floor, or the EXIT door once open (the entry door is cosmetic, not walkable)
	function canEnter(c, r) {
		var s = grid[r][c];
		if (s === FLOOR || s === CLEAN) return true;
		return s === DOOR && !!door && door.open && door.cells.some(function (p) { return p[0] === c && p[1] === r; });
	}
	// a DOOR cell renders open if it's the (transient) entry door or the opened exit door
	function doorDrawnOpen(c, r) {
		if (entryDoor && entryDoor.col === c && entryDoor.row === r) return true;
		return !!door && door.open && door.cells.some(function (p) { return p[0] === c && p[1] === r; });
	}

	// vacuuming a cell also cleans furniture in the 4 side-adjacent cells
	// (the couch's visible carpet tidies up as you pass alongside it)
	function cleanAdjacent(c, r) {
		[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
			var nc = c + d[0], nr = r + d[1];
			if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return;
			if (grid[nr][nc] === FURN_DIRTY) grid[nr][nc] = FURN_CLEAN;
		});
	}

	// which wall sprite a border cell uses (all 8 drawn explicitly, no flips)
	function wallImg(r, c) {
		var t = r === 0, b = r === ROWS - 1, l = c === 0, rt = c === COLS - 1;
		if (t && l) return imgs.wall_top_left;
		if (t && rt) return imgs.wall_top_right;
		if (b && l) return imgs.wall_bottom_left;
		if (b && rt) return imgs.wall_bottom_right;
		if (t) return imgs.wall_top;
		if (b) return imgs.wall_bottom;
		if (l) return imgs.wall_left;
		return imgs.wall_right;
	}
	function blit(img, x, y) {
		if (img && img.complete) ctx.drawImage(img, x, y, CELL, CELL);
		else { ctx.fillStyle = COL_WALL; ctx.fillRect(x, y, CELL, CELL); }
	}
	// the exit cell, drawn from assets/door_{closed,open}.png (64x64 each).
	// Falls back to a procedural panel/portal if the sprite hasn't loaded, so
	// the game still reads even with the PNGs missing.
	function drawDoor(x, y, open) {
		var im = open ? imgs.door_open : imgs.door_closed;
		if (im && im.complete && im.naturalWidth) {
			ctx.drawImage(im, x, y, CELL, CELL);
			return;
		}
		if (open) {
			ctx.fillStyle = '#0d0d12'; ctx.fillRect(x, y, CELL, CELL);
			ctx.fillStyle = 'rgba(0, 255, 102, 0.18)'; ctx.fillRect(x, y, CELL, CELL);
			ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
		} else {
			ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x, y, CELL, CELL);
			ctx.strokeStyle = '#3f2c18'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
			ctx.fillStyle = '#d8b24a';
			ctx.beginPath(); ctx.arc(x + CELL * 0.7, y + CELL / 2, 4, 0, Math.PI * 2); ctx.fill();
		}
	}

	function aligned() {
		return kirby.px === kirby.col * CELL && kirby.py === kirby.row * CELL;
	}

	function step(v, target, spd) {
		spd = spd || GLIDE_PX;
		if (v < target) return Math.min(target, v + spd);
		if (v > target) return Math.max(target, v - spd);
		return v;
	}

	function catPassable(c, r) {   // floor cells only, and never onto Kirby (the cat is a solid obstacle)
		if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
		if (kirby && c === kirby.col && r === kirby.row) return false;
		return passable(grid[r][c]);
	}
	function catCanStep(c, r, dc, dr) {   // can the cat step (dc,dr) from (c,r)? diagonals must not cut a corner
		if (!catPassable(c + dc, r + dr)) return false;
		if (dc !== 0 && dr !== 0) return catPassable(c + dc, r) && catPassable(c, r + dr);
		return true;
	}
	function spawnCat() {          // drop the cat on a random floor cell (never Kirby's spawn)
		for (var t = 0; t < 200; t++) {
			var c = 1 + randInt(COLS - 2), r = 1 + randInt(ROWS - 2);
			if (grid[r][c] === FLOOR && !(c === START.col && r === START.row))
				return { col: c, row: r, px: c * CELL, py: r * CELL, dir: [0, 1], faceRight: false, nextMoveAt: startTime + 1000 };
		}
		return null;
	}
	// the cat runs in long straight LINES like a real cat, in any of 8 directions
	// (cardinals + diagonals). It holds its heading until blocked or a rare random
	// break (turns seldom), then turns to a random steppable direction without
	// reversing. Diagonals don't cut corners. Solid obstacle. Idle until 1s after
	// the player's first move.
	function catStep() {
		if (!cat || !moved) return;
		cat.px = step(cat.px, cat.col * CELL, CAT_GLIDE);
		cat.py = step(cat.py, cat.row * CELL, CAT_GLIDE);
		if (cat.px !== cat.col * CELL || cat.py !== cat.row * CELL) return;   // still gliding
		var now = performance.now();
		if (now < cat.nextMoveAt) return;                                     // 1s start delay / turn pause
		if (catCanStep(cat.col, cat.row, cat.dir[0], cat.dir[1]) && randInt(40) !== 0) {   // ~97.5%: extend the line
			cat.col += cat.dir[0]; cat.row += cat.dir[1];
			return;
		}
		// line ended -> pause, then turn to a random steppable direction (no straight reversal)
		var DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
		var rev0 = -cat.dir[0], rev1 = -cat.dir[1], choices = [];
		DIRS8.forEach(function (d) {
			if (d[0] === rev0 && d[1] === rev1) return;                       // avoid reversing straight back
			if (catCanStep(cat.col, cat.row, d[0], d[1])) choices.push(d);
		});
		if (!choices.length) DIRS8.forEach(function (d) { if (catCanStep(cat.col, cat.row, d[0], d[1])) choices.push(d); });
		if (choices.length) { cat.dir = choices[randInt(choices.length)]; if (cat.dir[0] !== 0) cat.faceRight = cat.dir[0] > 0; }   // face the way it runs (profile sprite)
		cat.nextMoveAt = now + 250 + randInt(600);                           // pause at the turn
	}

	// --- main loop ---
	function tick() {
		if (!started) { render(); raf = requestAnimationFrame(tick); return; }
		if (moved && !over && !(door && door.open)) {  // clock runs only after the first move; freezes when the room's clean
			elapsed = (performance.now() - startTime) / 1000;
			if (mode === 'timed' && elapsed >= TIME_LIMIT) { elapsed = TIME_LIMIT; timeUp = true; over = true; playOneShot(failSfx); }
		}
		if (aligned() && !over) tryStartMove();        // only accept a new cell when settled
		if (!over && aligned() && door && door.open && grid[kirby.row][kirby.col] === DOOR) {   // arrived on the open door
			if (level >= MAX_LEVEL) { won = true; over = true; playOneShot(winSfx); }   // last level -> win
			else nextLevel();                                                            // else advance to the next room
		}
		if (!over && door && !door.open && cleaned >= reachableTotal) { door.open = true; }   // room clean -> open the exit (win fires on exiting the last level)
		kirby.px = step(kirby.px, kirby.col * CELL);   // glide toward the target cell (finishes settling even when over)
		kirby.py = step(kirby.py, kirby.row * CELL);
		if (entryDoor) {                               // close the entry door ~1s after Kirby lands on the field
			if (!entryDoor.closeAt) { if (aligned()) entryDoor.closeAt = performance.now() + 1000; }
			else if (performance.now() >= entryDoor.closeAt) { grid[entryDoor.row][entryDoor.col] = WALL; entryDoor = null; }
		}
		if (!over) catStep();                          // the cat scurries (level >= CAT_LEVEL)
		updateVroom(!over && (!aligned() || !!heldDir));
		render();
		raf = requestAnimationFrame(tick);
	}

	// shared win/lose overlay: dims the field, then big title + stats + hint
	function drawEndOverlay(title, titleColor, statsText, hintText) {
		ctx.save();
		ctx.fillStyle = 'rgba(0, 0, 0, 0.50)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		// canvas text shadow: ALWAYS black -- the --font-shadow token flips to white
		// in light theme, which inverted the shadows and wrecked the text on a
		// light-mode machine. Hard-code black so it reads on any theme.
		ctx.shadowColor = '#000';
		ctx.shadowOffsetX = -3; ctx.shadowOffsetY = -3; ctx.shadowBlur = 1;
		ctx.fillStyle = titleColor;
		ctx.font = 'italic bold 128px monospace';
		ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 45);
		ctx.fillStyle = '#ffffff';
		ctx.font = '38px monospace';
		ctx.fillText(statsText, canvas.width / 2, canvas.height / 2 + 48);
		ctx.fillStyle = '#dddddd';
		ctx.font = 'italic 24px monospace';
		ctx.fillText(hintText, canvas.width / 2, canvas.height / 2 + 98);
		ctx.restore();
	}

	function render() {
		if (!started) {
			if (imgs.title && imgs.title.complete) ctx.drawImage(imgs.title, 0, 0, canvas.width, canvas.height);
			else { ctx.fillStyle = COL_FLOOR; ctx.fillRect(0, 0, canvas.width, canvas.height); }
			hud.textContent = 'Space bar or tap to start';
			hud.style.color = '';
			return;
		}
		// clear to transparent so wall sprites' transparent halves show the
		// canvas background (#232323), not leftover pixels from the title card
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		for (var r = 0; r < ROWS; r++) {
			for (var c = 0; c < COLS; c++) {
				var s = grid[r][c];
				var x = c * CELL, y = r * CELL;
				if (s === WALL) {
					blit(wallImg(r, c), x, y);
				} else if (s === DOOR) {
					drawDoor(x, y, doorDrawnOpen(c, r));
				} else {
					var isClean = (s === CLEAN || s === FURN_CLEAN);
					var tile = imgs[isClean ? 'clean' : 'dirty'];
					if (tile && tile.complete) ctx.drawImage(tile, x, y, CELL, CELL);
					else { ctx.fillStyle = isClean ? COL_CLEAN : COL_FLOOR; ctx.fillRect(x, y, CELL, CELL); }
				}
			}
		}
		FURNITURE.forEach(function (f) {
			var im = furnImgs[f.src];
			if (!im || !im.complete) return;
			var x = f.col * CELL, y = f.row * CELL, pw = f.w * CELL, ph = f.h * CELL;
			if (!f.rot) { ctx.drawImage(im, x, y, pw, ph); return; }
			ctx.save();
			ctx.translate(x + pw / 2, y + ph / 2);
			ctx.rotate(f.rot * Math.PI / 180);
			if (f.rot === 90 || f.rot === 270) ctx.drawImage(im, -ph / 2, -pw / 2, ph, pw);
			else ctx.drawImage(im, -pw / 2, -ph / 2, pw, ph);
			ctx.restore();
		});
		if (cat) {
			var ci = imgs.cat;
			if (ci && ci.complete) {
				if (cat.faceRight) { ctx.save(); ctx.translate(cat.px + CELL, cat.py); ctx.scale(-1, 1); ctx.drawImage(ci, 0, 0, CELL, CELL); ctx.restore(); }   // sprite faces LEFT by default -> flip for rightward runs
				else ctx.drawImage(ci, cat.px, cat.py, CELL, CELL);
			}
		}
		var k = imgs[facing];
		if (k && k.complete) ctx.drawImage(k, kirby.px, kirby.py, CELL, CELL);

		var pct = Math.round((cleaned / reachableTotal) * 100);

		if (won) {
			drawEndOverlay('You Win!', '#00ff00', 'All ' + MAX_LEVEL + ' levels cleaned!', 'Press space or tap to play again');
		} else if (timeUp) {
			drawEndOverlay('You Lose!', '#ff0000', 'Reached Level ' + level + '  |  Cleaned ' + pct + '%', 'Press R or Reset to try again');
		}

		hud.style.color = (won || (door && door.open)) ? '#00ff00' : (timeUp ? '#ff0000' : '');   // green win/door-open / red lose / default
		if (won) {
			hud.textContent = 'You Win! All ' + MAX_LEVEL + ' levels cleaned!';
		} else if (timeUp) {
			hud.textContent = 'You Lose! Reached Level ' + level + ' (cleaned ' + pct + '%)';
		} else if (door && door.open) {
			hud.textContent = 'Level ' + level + ' clean! Head to the door →';
		} else if (mode === 'timed') {
			hud.textContent = 'Level ' + level + '   Cleaned ' + pct + '%   Time: ' + (TIME_LIMIT - elapsed).toFixed(1) + 's';
		} else {
			hud.textContent = 'Level ' + level + '   Cleaned ' + pct + '%   ' + elapsed.toFixed(1) + 's';
		}
	}

	// --- input: cardinal only ---
	function onKeyDown(e) {
		if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') { reset(); e.preventDefault(); return; }
		if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) { toggleMusic(); e.preventDefault(); return; }
		if (e.key === ' ' || e.key === 'Spacebar') { if (over) replay(); else startGame(); e.preventDefault(); return; }  // space starts / plays again
		if (!(e.key in DIRS)) return;
		e.preventDefault();               // arrows must not scroll the page
		startGame();                      // first arrow dismisses the title
		heldDir = DIRS[e.key];
	}
	function onKeyUp(e) {
		if (e.key in DIRS && heldDir === DIRS[e.key]) heldDir = null;
	}

	var touchId = null, ax = 0, ay = 0;
	function onTouchStart(e) {
		if (over) replay(); else startGame();   // tap dismisses the title / plays again
		if (touchId !== null) return;
		var t = e.changedTouches[0];
		touchId = t.identifier; ax = t.clientX; ay = t.clientY;
		e.preventDefault();
	}
	function onTouchMove(e) {
		for (var i = 0; i < e.changedTouches.length; i++) {
			var t = e.changedTouches[i];
			if (t.identifier !== touchId) continue;
			var dx = t.clientX - ax, dy = t.clientY - ay;
			if (Math.abs(dx) < TOUCH_DEADZONE && Math.abs(dy) < TOUCH_DEADZONE) { heldDir = null; }
			else if (Math.abs(dx) >= Math.abs(dy)) heldDir = dx > 0 ? DIRS.ArrowRight : DIRS.ArrowLeft;
			else heldDir = dy > 0 ? DIRS.ArrowDown : DIRS.ArrowUp;   // dominant axis = no diagonals
			e.preventDefault();
		}
	}
	function onTouchEnd(e) {
		for (var i = 0; i < e.changedTouches.length; i++)
			if (e.changedTouches[i].identifier === touchId) { touchId = null; heldDir = null; }
	}

	// --- boot ---
	function boot() {
		for (var d in DIR_IMGS) { imgs[d] = new Image(); imgs[d].src = DIR_IMGS[d]; }
		FURNI_SRCS.forEach(function (src) { furnImgs[src] = new Image(); furnImgs[src].src = src; });

		canvas = document.createElement('canvas');
		canvas.width = COLS * CELL; canvas.height = ROWS * CELL;
		hud = document.createElement('div');
		hud.className = 'game-hud';
		resetBtn = document.createElement('button');
		resetBtn.textContent = 'Reset';
		resetBtn.title = 'Reset Game';
		resetBtn.onclick = function () { this.blur(); reset(); };
		modeSel = document.createElement('select');
		[['timed', 'Timed Mode'], ['freestyle', 'Freestyle']].forEach(function (o) {
			var opt = document.createElement('option');
			opt.value = o[0]; opt.textContent = o[1];
			modeSel.appendChild(opt);
		});
		modeSel.value = mode;
		modeSel.title = "Choose game mode";
		modeSel.onchange = function () { mode = this.value; this.blur(); reset(); };

		musicBtn = document.createElement('button');
		musicBtn.textContent = '\uD83D\uDD07 Music';
		musicBtn.title = 'Toggle background music (M)';
		musicBtn.onclick = function () { toggleMusic(); this.blur(); };
		sfxBtn = document.createElement('button');
		sfxBtn.textContent = '\uD83D\uDD0A Vacuum';
		sfxBtn.title = 'Toggle vacuum sound';
		sfxBtn.onclick = function () { setSfxMuted(!sfxMuted); this.textContent = (sfxMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A') + ' Vacuum'; this.blur(); };

		var controls = document.createElement('div');
		controls.className = 'game-controls';
		controls.appendChild(modeSel);
		controls.appendChild(resetBtn);
		controls.appendChild(musicBtn);
		controls.appendChild(sfxBtn);

		// playArea = canvas + all the empty space around/below it; this is
		// the touch-steering zone. Controls (mode + reset) sit ABOVE it and
		// stay tappable, not captured by swipe steering.
		var playArea = document.createElement('div');
		playArea.className = 'game-play';
		playArea.appendChild(canvas);

		var field = document.getElementById('gamefield');
		var panel = document.createElement('div');   // buttons row + status box, unified to one width
		panel.className = 'control-panel';
		panel.appendChild(controls);
		panel.appendChild(hud);
		field.appendChild(panel);
		field.appendChild(playArea);
		ctx = canvas.getContext('2d');

		document.addEventListener('keydown', onKeyDown, true);
		document.addEventListener('keyup', onKeyUp, true);
		playArea.addEventListener('touchstart', onTouchStart, { passive: false });
		playArea.addEventListener('touchmove', onTouchMove, { passive: false });
		playArea.addEventListener('touchend', onTouchEnd);
		playArea.addEventListener('touchcancel', onTouchEnd);
		playArea.addEventListener('mousedown', function () { if (over) replay(); else startGame(); });   // click to start / play again (desktop)

		reset();
		raf = requestAnimationFrame(tick);
	}

	// --- dev console API: tweak the game live from the browser console, no source
	// edits. All are attached to window; type Help() in the console for the list. ---
	function devSetLevel(n) {                       // jump straight to level n
		level = Math.max(1, n | 0);
		START = { col: 1, row: 1 };                 // corner spawn, no glide-in (like starting fresh there)
		entryPx = CELL; entryPy = CELL; entryFacing = 'idle';
		setupLevel();
		started = true;                             // drop into play, skip the title card
		return 'level ' + level + (level >= CAT_LEVEL ? ' (with cat)' : '');
	}
	function devCleanRoom() {                       // clean all floor -> opens the exit
		for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] === FLOOR) grid[r][c] = CLEAN;
		cleaned = reachableTotal;
		return 'room cleaned -- exit should open';
	}
	function devOpenDoor() { if (door) door.open = true; return 'exit door forced open'; }
	function devWin() { won = true; over = true; playOneShot(winSfx); return 'win screen'; }
	function devLose() { timeUp = true; over = true; playOneShot(failSfx); return 'lose screen'; }
	function devSpawnCat() {                        // drop a cat into the current room and activate it
		moved = true;
		cat = spawnCat();
		if (cat) cat.nextMoveAt = performance.now() + 300;
		return cat ? 'cat spawned' : 'no free floor cell for a cat';
	}
	function devSetMaxLevel(n) { MAX_LEVEL = Math.max(1, n | 0); return 'MAX_LEVEL = ' + MAX_LEVEL; }
	function devHelp() {
		console.log('Vroom dev console:\n' +
			'  SetLevel(n)     jump to level n (n>=1; cat appears at level ' + CAT_LEVEL + '+)\n' +
			'  CleanRoom()     instantly clean the room (opens the exit)\n' +
			'  OpenDoor()      force the exit door open\n' +
			'  Win()           show the win screen\n' +
			'  Lose()          show the lose screen\n' +
			'  SpawnCat()      drop a cat into the current room (and start it moving)\n' +
			'  SetMaxLevel(n)  change how many levels there are\n' +
			'  Help()          this list');
		return 'level ' + level + ' / ' + MAX_LEVEL;
	}
	if (typeof window !== 'undefined') {
		window.SetLevel = devSetLevel;
		window.CleanRoom = devCleanRoom;
		window.OpenDoor = devOpenDoor;
		window.Win = devWin;
		window.Lose = devLose;
		window.SpawnCat = devSpawnCat;
		window.SetMaxLevel = devSetMaxLevel;
		window.Help = devHelp;
		console.log('%cVroom%c dev console ready -- type Help()', 'font-weight:bold', '');
	}

	boot();
})();
