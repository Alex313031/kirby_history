#!/usr/bin/env bash
# export_all.sh - batch-export every .scad in this folder to STL + 3MF.
#
#   STL : plain solid, default params (fast).
#   3MF : rendered with show_threads=true so the cosmetic threads are baked into
#         the "pretty" mesh (the flag is harmless for tools that don't define it),
#         then colorized. OpenSCAD 2021.01 writes NO color into 3MF, so we inject
#         an <m:colorgroup> and tag each triangle.
#
# Colors are read from each file's own color("#rrggbb") calls (first-seen order)
# and injected as an <m:colorgroup>. OpenSCAD welds the whole model into one mesh
# (parts that touch share vertices), so triangles can't be split back into solids
# automatically. Instead, tools that use more than one color get a one-line SPLIT
# RULE in the python block below (keyed by file name) that maps a triangle's
# centroid to a color index. Tools with no rule get their primary (first) color.
# Add a rule when you add a multi-color tool; single-color tools need nothing.
#
# Usage:  ./export_all.sh            # process every .scad next to this script
#         OPENSCAD=/path/openscad ./export_all.sh
set -uo pipefail

cd "$(dirname "$(readlink -f "$0")")"
OSCAD="${OPENSCAD:-openscad}"
export QT_QPA_PLATFORM=offscreen

shopt -s nullglob
scads=(*.scad)
[ ${#scads[@]} -gt 0 ] || { echo "No .scad files here."; exit 0; }

fail=0
for f in "${scads[@]}"; do
  base="${f%.scad}"
  if [ "$base" = "threads" ]; then
    echo "=== skipping $f (inlined threads-scad library, not a tool) ==="; continue
  fi
  echo "=== $base ==="
  echo "  -> $base.stl  (plain)"
  if ! "$OSCAD" --render -o "$base.stl" "$f"; then
    echo "  !! STL render failed for $f"; fail=1; continue
  fi
  echo "  -> $base.3mf  (threaded + color)"
  if ! "$OSCAD" --render -D show_threads=true -o "$base.3mf" "$f"; then
    echo "  !! 3MF render failed for $f"; fail=1; continue
  fi

  python3 - "$f" "$base.3mf" <<'PYEOF'
import sys, re, os, math, zipfile
scad, tmf = sys.argv[1], sys.argv[2]
base = os.path.splitext(os.path.basename(scad))[0]
MODEL = "3D/3dmodel.model"

# ---- SPLIT RULES: file -> (centroid x,y,z) -> color hex (6-digit, uppercase) --
# Returns the actual color (not an index), so it's robust to whatever order the
# colors happen to appear in the .scad. Only needed for tools that touch/share
# vertices between differently-colored parts (OpenSCAD welds them into one mesh).
RULES = {
    "T127": lambda x, y, z: "333333" if (-1e-6 < z < 5.0) else "C0C0C0",                            # dark plate (rests at z in [0,3]); silver arch (lifted to z>=11), bolt (above), screws (z<0)
    "T104": lambda x, y, z: "333333" if math.hypot(x, y) < 1.6 else "C0C0C0",                      # dark dowel tips (on the axis), silver body
    "T123": lambda x, y, z: "333333" if (math.hypot(x - 10, y) < 1.6 and z < 13) else "C0C0C0",   # dark tang dowel (radius 10, below disc top), silver body
}
rule = RULES.get(base)

# palette from the .scad's color("#rrggbb") calls, first-seen order. 6-digit,
# uppercase, NO alpha - an 8-digit #RRGGBBAA makes some 3MF viewers render the
# model translucent/transparent, so we keep colors fully opaque #RRGGBB.
seen, palette = set(), []
for h in re.findall(r'color\("#([0-9A-Fa-f]{6,8})"', open(scad).read()):
    h = h.upper()[:6]
    if h not in seen:
        seen.add(h)
        palette.append(h)
if not palette:
    palette = ["C0C0C0"]

with zipfile.ZipFile(tmf) as z:
    names = z.namelist()
    model = z.read(MODEL).decode("utf-8")
    others = {n: z.read(n) for n in names if n != MODEL}

verts = [tuple(map(float, m)) for m in
         re.findall(r'<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"', model)]

def cidx(a, b, c):
    if rule is None or len(palette) == 1:
        return 0
    cx = (verts[a][0] + verts[b][0] + verts[c][0]) / 3
    cy = (verts[a][1] + verts[b][1] + verts[c][1]) / 3
    cz = (verts[a][2] + verts[b][2] + verts[c][2]) / 3
    h = rule(cx, cy, cz).upper()[:6]
    return palette.index(h) if h in palette else 0

# inject the colorgroup, tag the object (backstop) + every triangle
cg = ('<m:colorgroup id="10">'
      + "".join('<m:color color="#%s" />' % h for h in palette)
      + "</m:colorgroup>")
model = model.replace("<resources>", "<resources>" + cg, 1)
model = model.replace('type="model"', 'type="model" pid="10" pindex="0"', 1)

def repl(m):
    a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return '<triangle v1="%d" v2="%d" v3="%d" pid="10" p1="%d" />' % (a, b, c, cidx(a, b, c))
model = re.sub(r'<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\s*/>', repl, model)

tmp = tmf + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    for n in names:
        z.writestr(n, model.encode("utf-8") if n == MODEL else others[n])
os.replace(tmp, tmf)

note = "" if (rule or len(palette) == 1) else "  (>1 color but no split rule -> primary only)"
print("     colors: %s%s" % (", ".join("#" + h for h in palette), note))
PYEOF
done

[ $fail -eq 0 ] && echo "All done." || echo "Done, with errors (see above)."
exit $fail
