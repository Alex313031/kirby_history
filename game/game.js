// "Suck It!" Vacuum Game -- core loop (see DESIGN.md).
// Grid-based: clean every reachable floor cell. Arrow keys (desktop) or
// cardinal touch-drag (mobile). Cell = sprite = 64px; cleaning/collision
// are per-cell; the sprite glides between cells for smooth motion.
(function () {
	'use strict';

	// --- grid / geometry ---
	var CELL = 64;
	var COLS = 16, ROWS = 12;            // 1024 x 768
	var FLOOR = 0, CLEAN = 1, BLOCKED = 2;

	// --- motion ---
	// Runs on a 60fps rAF loop. GLIDE_PX = sprite px advanced per frame.
	// Smaller = slower AND smoother (more frames per 64px cell); larger =
	// faster and choppier. 8 = 8 frames/cell. Use a divisor of 64 (4/8/16/32).
	var GLIDE_PX = 8;
	var TOUCH_DEADZONE = 16;             // px of drag before a direction registers

	// --- colors (fixed; identical in light/dark so the "room" reads the same) ---
	var COL_FLOOR = '#b9a986';           // dusty carpet (dirty)
	var COL_CLEAN = '#e9dec2';           // cleaned carpet (lighter)
	var COL_WALL  = '#000000';           // generated walls (per spec: black)
	var COL_GRID  = 'rgba(0,0,0,0.08)';  // faint cell lines

	// --- sprites ---
	var DIR_IMGS = {
		up: 'assets/up.png', down: 'assets/down.png',
		left: 'assets/left.png', right: 'assets/right.png', idle: 'assets/vroom.png'
	};
	var imgs = {};

	// --- furniture: PNG spanning w x h cells at (col,row); all cells BLOCKED ---
	var FURNITURE = [
		{ src: 'assets/couch.png', col: 6, row: 2, w: 3, h: 1 }
	];
	var furnImgs = {};

	var DIRS = {
		ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0]
	};
	var START = { col: 1, row: 1 };

	var canvas, ctx, hud, resetBtn;
	var grid, kirby, heldDir, facing, cleaned, reachableTotal, won, startTime, raf;

	// --- setup ---
	function buildGrid() {
		grid = [];
		for (var r = 0; r < ROWS; r++) {
			grid[r] = [];
			for (var c = 0; c < COLS; c++) {
				var border = (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1);
				grid[r][c] = border ? BLOCKED : FLOOR;
			}
		}
		FURNITURE.forEach(function (f) {
			for (var dr = 0; dr < f.h; dr++)
				for (var dc = 0; dc < f.w; dc++)
					grid[f.row + dr][f.col + dc] = BLOCKED;
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
				if (grid[nr][nc] === BLOCKED || seen[k]) return;
				seen[k] = true; q.push([nc, nr]);
			});
		}
		return n;
	}

	function reset() {
		buildGrid();
		reachableTotal = countReachable();
		kirby = { col: START.col, row: START.row, px: START.col * CELL, py: START.row * CELL };
		grid[START.row][START.col] = CLEAN;
		cleaned = 1;
		heldDir = null;
		facing = 'idle';
		won = false;
		startTime = performance.now();
	}

	function tryStartMove() {
		if (!heldDir) return;
		facing = dirName(heldDir);
		var nc = kirby.col + heldDir[0], nr = kirby.row + heldDir[1];
		if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return;   // OOB
		if (grid[nr][nc] === BLOCKED) return;                       // wall/furniture
		kirby.col = nc; kirby.row = nr;                             // commit
		if (grid[nr][nc] === FLOOR) { grid[nr][nc] = CLEAN; cleaned++; }
	}

	function dirName(d) {
		if (d[0] < 0) return 'left';
		if (d[0] > 0) return 'right';
		if (d[1] < 0) return 'up';
		return 'down';
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
		if (aligned() && !won) tryStartMove();        // only accept a new cell when settled
		kirby.px = step(kirby.px, kirby.col * CELL);   // glide toward the target cell
		kirby.py = step(kirby.py, kirby.row * CELL);
		if (!won && cleaned >= reachableTotal) { won = true; }
		render();
		raf = requestAnimationFrame(tick);
	}

	function render() {
		for (var r = 0; r < ROWS; r++) {
			for (var c = 0; c < COLS; c++) {
				var s = grid[r][c];
				ctx.fillStyle = s === BLOCKED ? COL_WALL : (s === CLEAN ? COL_CLEAN : COL_FLOOR);
				ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
				if (s !== BLOCKED) { ctx.strokeStyle = COL_GRID; ctx.strokeRect(c * CELL, r * CELL, CELL, CELL); }
			}
		}
		FURNITURE.forEach(function (f) {
			var im = furnImgs[f.src];
			if (im && im.complete) ctx.drawImage(im, f.col * CELL, f.row * CELL, f.w * CELL, f.h * CELL);
		});
		var k = imgs[facing];
		if (k && k.complete) ctx.drawImage(k, kirby.px, kirby.py, CELL, CELL);

		var pct = Math.round((cleaned / reachableTotal) * 100);
		var secs = ((performance.now() - startTime) / 1000).toFixed(1);
		hud.textContent = won
			? 'Room clean! ' + secs + 's  (R / Reset to replay)'
			: 'Cleaned ' + pct + '%   ' + secs + 's';
	}

	// --- input: cardinal only ---
	function onKeyDown(e) {
		if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') { reset(); e.preventDefault(); return; }
		if (!(e.key in DIRS)) return;
		e.preventDefault();               // arrows must not scroll the page
		heldDir = DIRS[e.key];
	}
	function onKeyUp(e) {
		if (e.key in DIRS && heldDir === DIRS[e.key]) heldDir = null;
	}

	var touchId = null, ax = 0, ay = 0;
	function onTouchStart(e) {
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
		FURNITURE.forEach(function (f) { furnImgs[f.src] = new Image(); furnImgs[f.src].src = f.src; });

		canvas = document.createElement('canvas');
		canvas.width = COLS * CELL; canvas.height = ROWS * CELL;
		hud = document.createElement('div');
		hud.className = 'game-hud';
		resetBtn = document.createElement('button');
		resetBtn.textContent = 'Reset';
		resetBtn.onclick = function () { this.blur(); reset(); };

		var field = document.getElementById('gamefield');
		field.appendChild(resetBtn);   // reset at the top of the stack
		field.appendChild(hud);
		field.appendChild(canvas);
		ctx = canvas.getContext('2d');

		document.addEventListener('keydown', onKeyDown, true);
		document.addEventListener('keyup', onKeyUp, true);
		// touch on the WHOLE field (not just the canvas) so the empty space
		// around it is swipeable too
		field.addEventListener('touchstart', onTouchStart, { passive: false });
		field.addEventListener('touchmove', onTouchMove, { passive: false });
		field.addEventListener('touchend', onTouchEnd);
		field.addEventListener('touchcancel', onTouchEnd);

		reset();
		raf = requestAnimationFrame(tick);
	}

	boot();
})();
