// Rowspan-aware hover for the Service Manual column.
// A cell with rowspan belongs only to its first <tr>, so the CSS row-hover
// can't highlight it from the other rows it covers. This maps every row to
// the service cell covering it and toggles a highlight class on hover.
(function () {
	'use strict';

	var rows = document.querySelectorAll('table.wikitable tbody tr');
	var current = null;
	var remaining = 0;

	rows.forEach(function (tr) {
		var own = tr.querySelector('td.service');
		if (own) {
			current = own;
			remaining = own.rowSpan;
		}
		if (current && remaining > 0) {
			var cell = current;
			tr.addEventListener('mouseenter', function () {
				cell.classList.add('svc-hl');
			});
			tr.addEventListener('mouseleave', function () {
				cell.classList.remove('svc-hl');
			});
			remaining--;
		}
	});
})();
