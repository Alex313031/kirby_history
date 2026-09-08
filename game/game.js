// "Suck It!" Vacuum Game -- core loop (see DESIGN.md).
// Grid-based: clean every reachable floor cell. Arrow keys (desktop) or
// cardinal touch-drag (mobile). Cell = sprite = 64px; cleaning/collision
// are per-cell; the sprite glides between cells for smooth motion.
(function () {
	'use strict';

	// --- grid / geometry ---
	var CELL = 64;
	var COLS = 16, ROWS = 12;            // 1024 x 768
	var FLOOR = 0, CLEAN = 1, WALL = 2, FURN_DIRTY = 3, FURN_CLEAN = 4;

	// --- motion ---
	// Runs on a 60fps rAF loop. GLIDE_PX = sprite px advanced per frame.
	// Smaller = slower AND smoother (more frames per 64px cell); larger =
	// faster and choppier. 8 = 8 frames/cell. Use a divisor of 64 (4/8/16/32).
	var GLIDE_PX = 8;
	var TOUCH_DEADZONE = 16;             // px of drag before a direction registers

	// --- timing ---
	var TIME_LIMIT = 60;                 // seconds, Timed Mode
	var mode = 'timed';                  // 'timed' | 'freestyle'

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
		title: 'assets/titlecard.png'
	};
	var imgs = {};

	// --- furniture ---
	// Placement is randomized each game (see generateFurniture): the couch
	// faces a random direction with the TV 1 cell in front of its middle; the
	// chair faces a random direction with a side table 1 cell off an arm side
	// (table randomly rotated); coffee table and trash go anywhere. Validated.
	var FURNI_SRCS = ['assets/couch.png', 'assets/tv.png', 'assets/chair.png', 'assets/side_table.png', 'assets/coffee_table.png', 'assets/trash_can.png'];
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
	var START = { col: 1, row: 1 };

	var canvas, ctx, hud, resetBtn;
	var grid, kirby, heldDir, facing, cleaned, reachableTotal;
	var won, timeUp, over, elapsed, startTime, raf, modeSel, musicBtn, sfxBtn;
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

	function generateFurniture() {
		var DIRS4 = ['down', 'up', 'left', 'right'];
		for (var attempt = 0; attempt < 400; attempt++) {
			var occ = {};
			var g1 = placeGroup(occ, couchTvGroup(DIRS4[randInt(4)]));
			var g2 = placeGroup(occ, chairSideGroup(DIRS4[randInt(4)], randInt(2) === 0));
			if (!g1 || !g2) continue;
			var ct = placeFree(occ, 'assets/coffee_table.png', [{ w: 1, h: 2, rot: 0 }, { w: 2, h: 1, rot: 90 }]);
			var tr = placeFree(occ, 'assets/trash_can.png', [{ w: 1, h: 1, rot: 0 }]);
			if (!ct || !tr) continue;
			if (layoutReachable(occ)) return g1.concat(g2, [ct, tr]);
		}
		return null;   // caller falls back to a known-good static layout
	}

	function replay() { reset(); startGame(); }   // end-screen "play again": new game, no title

	function startGame() {   // first move dismisses the title card and starts play + music
		if (started) return;
		started = true;
		startTime = performance.now();
		startAudio();
	}

	function reset() {
		FURNITURE = generateFurniture() || FALLBACK_FURNITURE;
		buildGrid();
		reachableTotal = countReachable();
		var totalFloor = 0;
		for (var rr = 0; rr < ROWS; rr++)
			for (var cc = 0; cc < COLS; cc++)
				if (grid[rr][cc] === FLOOR) totalFloor++;
		if (reachableTotal < totalFloor)
			console.warn('Vroom: ' + (totalFloor - reachableTotal) + ' floor cell(s) unreachable -- furniture is trapping floor');
		kirby = { col: START.col, row: START.row, px: START.col * CELL, py: START.row * CELL };
		grid[START.row][START.col] = CLEAN;
		cleaned = 1;
		cleanAdjacent(START.col, START.row);
		heldDir = null;
		facing = 'idle';
		won = false; timeUp = false; over = false; elapsed = 0;
		startTime = performance.now();
		started = false;   // show the title card again
	}

	function tryStartMove() {
		if (!heldDir) return;
		facing = dirName(heldDir);
		var nc = kirby.col + heldDir[0], nr = kirby.row + heldDir[1];
		if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return;   // OOB
		if (!passable(grid[nr][nc])) return;                        // wall/furniture
		kirby.col = nc; kirby.row = nr;                             // commit
		if (grid[nr][nc] === FLOOR) { grid[nr][nc] = CLEAN; cleaned++; }
		cleanAdjacent(nc, nr);   // suction reaches furniture on the 4 sides (not corners)
	}

	function dirName(d) {
		if (d[0] < 0) return 'left';
		if (d[0] > 0) return 'right';
		if (d[1] < 0) return 'up';
		return 'down';
	}

	function passable(s) { return s === FLOOR || s === CLEAN; }

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

	function aligned() {
		return kirby.px === kirby.col * CELL && kirby.py === kirby.row * CELL;
	}

	function step(v, target) {
		if (v < target) return Math.min(target, v + GLIDE_PX);
		if (v > target) return Math.max(target, v - GLIDE_PX);
		return v;
	}

	// --- main loop ---
	function tick() {
		if (!started) { render(); raf = requestAnimationFrame(tick); return; }
		if (!over) {
			elapsed = (performance.now() - startTime) / 1000;
			if (mode === 'timed' && elapsed >= TIME_LIMIT) { elapsed = TIME_LIMIT; timeUp = true; over = true; playOneShot(failSfx); }
		}
		if (aligned() && !over) tryStartMove();        // only accept a new cell when settled
		if (!over && cleaned >= reachableTotal) { won = true; over = true; playOneShot(winSfx); }
		kirby.px = step(kirby.px, kirby.col * CELL);   // glide toward the target cell (finishes settling even when over)
		kirby.py = step(kirby.py, kirby.row * CELL);
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
		// canvas can't use CSS text-shadow; apply it from the --font-shadow token
		ctx.shadowColor = getComputedStyle(document.documentElement).getPropertyValue('--font-shadow').trim() || '#000';
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
		var k = imgs[facing];
		if (k && k.complete) ctx.drawImage(k, kirby.px, kirby.py, CELL, CELL);

		var pct = Math.round((cleaned / reachableTotal) * 100);

		if (won) {
			drawEndOverlay('You Win!', '#00ff00', 'Cleaned 100% | Time: ' + elapsed.toFixed(1) + 's', 'Press space or tap to play again');
		} else if (timeUp) {
			drawEndOverlay('You Lose!', '#ff0000', 'Cleaned ' + pct + '% | Time: ' + TIME_LIMIT + 's', 'Press R or Reset to try again');
		}

		hud.style.color = won ? '#00ff00' : (timeUp ? '#ff0000' : '');   // green win / red lose / default
		if (won) {
			hud.textContent = mode === 'timed'
				? 'Room clean in ' + elapsed.toFixed(1) + 's!  (' + (TIME_LIMIT - elapsed).toFixed(1) + 's to spare)'
				: 'Room clean! ' + elapsed.toFixed(1) + 's';
		} else if (timeUp) {
			hud.textContent = 'You Lose! Cleaned ' + pct + '%';
		} else if (mode === 'timed') {
			hud.textContent = 'Cleaned ' + pct + '%   Time: ' + (TIME_LIMIT - elapsed).toFixed(1) + 's';
		} else {
			hud.textContent = 'Cleaned ' + pct + '%   ' + elapsed.toFixed(1) + 's';
		}
	}

	// --- input: cardinal only ---
	function onKeyDown(e) {
		if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') { reset(); e.preventDefault(); return; }
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
		musicBtn.title = 'Toggle background music';
		musicBtn.onclick = function () { setMusicMuted(!musicMuted); this.textContent = (musicMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A') + ' Music'; this.blur(); };
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
		field.appendChild(controls);   // mode + reset at the top (not touch-captured)
		field.appendChild(hud);
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

	boot();
})();
