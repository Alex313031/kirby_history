// Vroom Mode: vacuum the page with a Kirby.
// A transparent document-sized canvas overlays the page; moving the
// pointer (or driving with the arrow keys) paints pure white 16x16
// squares onto it, which reads as the page being vacuumed away.
// Arrow keys move 16px per press; holding a key engages cruise
// (After Dark lawnmower rules). The Kirby faces the direction of
// travel, Neko-style, in both mouse and keyboard modes. Escape or
// any mouse button exits and restores the page.
(function () {
	'use strict';

	var SIZE = 32;      // Kirby sprite/cursor, px
	var ERASE = 16;     // vacuumed square, px (matches the vacuum head in the art)
	var STEP = SIZE / 2; // keyboard step, px
	var HOLD_MS = 700;  // hold time before cruise engages
	var CRUISE_MS = 25;  // cruise repeat interval
	var TURN_MIN = 3;   // px of mouse travel before Kirby turns (jitter guard)
	var EDGE_MARGIN = SIZE * 2; // viewport edge zone that autoscrolls (mouse mode)
	var EDGE_SPEED = 12;        // px scrolled per edge tick
	var EDGE_MS = 25;           // edge autoscroll tick interval

	var ARROWS = {
		ArrowUp:    [0, -1],
		ArrowDown:  [0, 1],
		ArrowLeft:  [-1, 0],
		ArrowRight: [1, 0]
	};

	var DIR_IMGS = {
		up:    'imgs/vroom/up.png',
		down:  'imgs/vroom/down.png',
		left:  'imgs/vroom/left.png',
		right: 'imgs/vroom/right.png',
		idle:  'imgs/vroom.png'
	};

	// where the vacuum head sits in each sprite, as an offset from the
	// sprite's center to the center of the 16x16 suction zone
	var HEAD_OFFSET = {
		up:    [0, -8],  // head at middle top
		down:  [0, 8],   // head at middle bottom
		left:  [-8, 8],  // head at bottom left
		right: [8, 8],   // head at bottom right
		idle:  [0, 0]
	};

	// last known pointer position, tracked from page load so a
	// keyboard-activated vroom can still start at the cursor
	var mouseX = null;
	var mouseY = null;
	document.addEventListener('mousemove', function (e) {
		mouseX = e.pageX;
		mouseY = e.pageY;
	});

	var active = false;
	var canvas = null;
	var ctx = null;
	var sprite = null;   // visible Kirby for keyboard driving
	var posX = null;     // current vacuum position (document coords)
	var posY = null;
	var byKeyboard = false;
	var currentDir = 'idle';
	var heldKeys = {};
	var heldCount = 0;
	var holdTimer = null;
	var cruiseTimer = null;
	var preloaded = null;
	var edgeTimer = null;
	var lastClientX = null;
	var lastClientY = null;

	// warm the cache so the cursor and direction swaps never fall back
	// to the crosshair (runs at page load, well before first activation)
	function preloadDirs() {
		if (preloaded) return;
		preloaded = {};
		for (var d in DIR_IMGS) {
			var im = new Image();
			im.src = DIR_IMGS[d];
			preloaded[d] = im;
		}
	}

	function dirFromDelta(dx, dy) {
		if (dx === 0 && dy === 0) return currentDir;
		if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
		return dy > 0 ? 'down' : 'up';
	}

	function cursorFor(dir) {
		return 'url("' + DIR_IMGS[dir] + '") 16 16, crosshair';
	}

	function setDir(dir) {
		if (dir === currentDir) return;
		currentDir = dir;
		// only dress the OS cursor when the mouse is driving -- while
		// keyboard-driving it is hidden, so it can't sit there spinning
		if (!byKeyboard) canvas.style.cursor = cursorFor(dir);
		sprite.src = DIR_IMGS[dir];
	}

	function startVroom(seedX, seedY) {
		if (active) return;
		active = true;
		canvas = document.createElement('canvas');
		canvas.width = document.documentElement.scrollWidth;
		canvas.height = document.documentElement.scrollHeight;
		canvas.style.position = 'absolute';
		canvas.style.top = '0';
		canvas.style.left = '0';
		canvas.style.zIndex = '9999';
		canvas.style.cursor = cursorFor('idle');
		document.body.appendChild(canvas);
		// if the cursor image wasn't decoded yet, the browser shows the
		// crosshair fallback and never retries -- re-assert once decoded
		if (preloaded.idle.decode) {
			preloaded.idle.decode().then(function () {
				if (active && !byKeyboard) {
					canvas.style.cursor = 'auto';
					canvas.style.cursor = cursorFor(currentDir);
				}
			}).catch(function () {});
		}
		ctx = canvas.getContext('2d');

		sprite = document.createElement('img');
		sprite.src = DIR_IMGS.idle;
		sprite.width = SIZE;
		sprite.height = SIZE;
		sprite.alt = '';
		sprite.style.position = 'absolute';
		sprite.style.zIndex = '10000';
		sprite.style.pointerEvents = 'none';
		sprite.style.display = 'none';
		document.body.appendChild(sprite);

		// start from the activating click's position, so arrow keys can
		// take off from the cursor even if the mouse never moves
		posX = (seedX !== undefined) ? seedX : null;
		posY = (seedY !== undefined) ? seedY : null;
		byKeyboard = false;
		currentDir = 'idle';
		document.addEventListener('mousemove', onMove);
		// the button's own activating click ended before these attach,
		// so only the NEXT press cancels
		document.addEventListener('mousedown', stopVroom, true);
		document.addEventListener('keydown', onKeyDown, true);
		document.addEventListener('keyup', onKeyUp, true);
		edgeTimer = setInterval(edgeScrollTick, EDGE_MS);
	}

	// paint a vacuumed path from the previous position to (x, y),
	// interpolated so fast moves leave a continuous stripe
	function paintTo(x, y, fresh) {
		ctx.fillStyle = '#ffffff';
		var ox = HEAD_OFFSET[currentDir][0];
		var oy = HEAD_OFFSET[currentDir][1];
		if (posX !== null && !fresh) {
			var dx = x - posX;
			var dy = y - posY;
			var dist = Math.sqrt(dx * dx + dy * dy);
			var steps = Math.max(1, Math.ceil(dist / (ERASE / 4)));
			for (var i = 1; i <= steps; i++) {
				ctx.fillRect(posX + (dx * i) / steps + ox - ERASE / 2,
				             posY + (dy * i) / steps + oy - ERASE / 2,
				             ERASE, ERASE);
			}
		} else {
			ctx.fillRect(x + ox - ERASE / 2, y + oy - ERASE / 2, ERASE, ERASE);
		}
		posX = x;
		posY = y;
	}

	function onMove(e) {
		// mouse takes over: fresh start so we don't smear a line
		// from wherever the keyboard left the vacuum
		var fresh = byKeyboard;
		byKeyboard = false;
		lastClientX = e.clientX;
		lastClientY = e.clientY;
		if (fresh) canvas.style.cursor = cursorFor(currentDir); // mouse takes the skin back
		sprite.style.display = 'none';
		if (!fresh && posX !== null) {
			var dx = e.pageX - posX;
			var dy = e.pageY - posY;
			if (dx * dx + dy * dy >= TURN_MIN * TURN_MIN) {
				setDir(dirFromDelta(dx, dy));
			}
		}
		paintTo(e.pageX, e.pageY, fresh);
	}

	function keyboardStep() {
		var dx = 0;
		var dy = 0;
		for (var key in heldKeys) {
			dx += ARROWS[key][0];
			dy += ARROWS[key][1];
		}
		if (dx === 0 && dy === 0) return;
		if (posX === null) {
			// no position yet: start at the center of the viewport
			posX = window.scrollX + window.innerWidth / 2;
			posY = window.scrollY + window.innerHeight / 2;
		}
		byKeyboard = true;
		canvas.style.cursor = 'none'; // hide the parked OS cursor while driving
		setDir(dirFromDelta(dx, dy));
		var x = Math.min(canvas.width, Math.max(0, posX + dx * STEP));
		var y = Math.min(canvas.height, Math.max(0, posY + dy * STEP));
		paintTo(x, y);
		sprite.style.left = (x - SIZE / 2) + 'px';
		sprite.style.top = (y - SIZE / 2) + 'px';
		sprite.style.display = 'block';
		followVacuum(x, y);
	}

	// mouse-mode edge autoscroll: park the pointer near a viewport edge
	// and the page scrolls while the vacuum keeps eating the content
	// sliding under the stationary nozzle (keyboard has followVacuum)
	function edgeScrollTick() {
		if (byKeyboard || lastClientX === null || posX === null) return;
		var sx = 0;
		var sy = 0;
		if (lastClientY > window.innerHeight - EDGE_MARGIN) sy = EDGE_SPEED;
		else if (lastClientY < EDGE_MARGIN) sy = -EDGE_SPEED;
		if (lastClientX > window.innerWidth - EDGE_MARGIN) sx = EDGE_SPEED;
		else if (lastClientX < EDGE_MARGIN) sx = -EDGE_SPEED;
		if (!sx && !sy) return;
		var beforeX = window.scrollX;
		var beforeY = window.scrollY;
		window.scrollBy(sx, sy);
		if (window.scrollX === beforeX && window.scrollY === beforeY) return; // document end
		setDir(dirFromDelta(sx, sy));
		paintTo(lastClientX + window.scrollX, lastClientY + window.scrollY);
	}

	// keep the vacuum in view, lawnmower style
	function followVacuum(x, y) {
		var margin = SIZE * 2;
		var sx = 0;
		var sy = 0;
		if (y - window.scrollY > window.innerHeight - margin) {
			sy = y - window.scrollY - (window.innerHeight - margin);
		} else if (y - window.scrollY < margin) {
			sy = y - window.scrollY - margin;
		}
		if (x - window.scrollX > window.innerWidth - margin) {
			sx = x - window.scrollX - (window.innerWidth - margin);
		} else if (x - window.scrollX < margin) {
			sx = x - window.scrollX - margin;
		}
		if (sx || sy) window.scrollBy(sx, sy);
	}

	function onKeyDown(e) {
		if (e.key === 'Escape') {
			stopVroom(e);
			return;
		}
		if (!(e.key in ARROWS)) return;
		e.preventDefault(); // keep arrows from scrolling the page
		if (e.repeat || heldKeys[e.key]) return; // our repeat, not the OS's
		heldKeys[e.key] = true;
		heldCount++;
		keyboardStep(); // immediate nudge per press
		if (heldCount === 1) {
			holdTimer = setTimeout(function () {
				cruiseTimer = setInterval(keyboardStep, CRUISE_MS);
			}, HOLD_MS);
		}
	}

	function onKeyUp(e) {
		if (!(e.key in ARROWS) || !heldKeys[e.key]) return;
		delete heldKeys[e.key];
		heldCount--;
		if (heldCount === 0) {
			clearTimeout(holdTimer);
			clearInterval(cruiseTimer);
			holdTimer = cruiseTimer = null;
		}
	}

	function stopVroom(e) {
		if (!active) return;
		if (e && e.type === 'mousedown') e.preventDefault();
		active = false;
		clearTimeout(holdTimer);
		clearInterval(cruiseTimer);
		clearInterval(edgeTimer);
		holdTimer = cruiseTimer = edgeTimer = null;
		lastClientX = lastClientY = null;
		heldKeys = {};
		heldCount = 0;
		document.removeEventListener('mousemove', onMove);
		document.removeEventListener('mousedown', stopVroom, true);
		document.removeEventListener('keydown', onKeyDown, true);
		document.removeEventListener('keyup', onKeyUp, true);
		canvas.remove();
		sprite.remove();
		canvas = ctx = sprite = null;
	}

	preloadDirs();

	document.querySelector('#vroombutton').onclick = function (e) {
		this.blur(); // drop focus so the button doesn't sit looking pressed
		if (e.detail > 0) {
			// real mouse click: start at the click itself
			startVroom(e.pageX, e.pageY);
		} else if (mouseX !== null) {
			// keyboard activation (Enter/Space, e.detail === 0): start at
			// the last place the mouse was seen
			startVroom(mouseX, mouseY);
		} else {
			// mouse never moved since page load: start at the button
			var r = this.getBoundingClientRect();
			startVroom(r.left + r.width / 2 + window.scrollX,
			           r.top + r.height / 2 + window.scrollY);
		}
	};
})();
