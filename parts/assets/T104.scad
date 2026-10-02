// ============================================================
//  T104 - Kirby armature-lock pin (double-ended, symmetric)
//  Fat central BODY; each end steps down to a reduced TIP that
//  enters the armature cross-hole. Either end works.
//  Units: millimeters.
//  Built from a 20mm tip dowel friction-fit 7mm into a drilled end
//  of the body (13mm exposed) at each end - modeled that way so the
//  part views can show the body's drilled holes and the two dowels.
// ============================================================

// "3D"     -> colored solid           (export STL / 3MF)
// "Flat"   -> 2D side elevation        (export DXF / SVG)
// "Rod"    -> just the body, with the tip-dowel holes drilled
// "Dowels" -> just the two tip dowels
// Part View
view = "3D";   // ["3D", "Flat", "Rod", "Dowels"]

// - measurements (mm) -
body_dia  = 8.0;    // main rod OD
body_len  = 140.0;  // main rod length
tip_dia   = 3.0;    // reduced tip rod OD
tip_len   = 13.0;   // exposed tip length per end
tip_embed = 7.0;    // how far each tip dowel presses into the drilled body end (dowel = 13 + 7 = 20mm)
rim_cham  = 1.0;    // 45 deg chamfer on the body's OUTER rim at each end (1mm down the shaft)
end_cham  = 0.33;   // 45 deg lead-in chamfer at the very tip (.33mm; finds the hole)

// - render quality -
$fn = 96;

// ---- geometry modules --------------------------------------
// main body: full-dia rod, outer rim chamfered at both ends
module body() {
  cylinder(h = rim_cham, d1 = body_dia - 2 * rim_cham, d2 = body_dia);   // bottom rim
  translate([0, 0, rim_cham])
    cylinder(h = body_len - 2 * rim_cham, d = body_dia);                 // straight
  translate([0, 0, body_len - rim_cham])
    cylinder(h = rim_cham, d1 = body_dia, d2 = body_dia - 2 * rim_cham); // top rim
}

// the body with a tip-dowel hole drilled tip_embed deep into each end
module t104_body() {
  difference() {
    body();
    translate([0, 0, -1]) cylinder(h = tip_embed + 1, d = tip_dia);                    // bottom drill
    translate([0, 0, body_len - tip_embed]) cylinder(h = tip_embed + 1, d = tip_dia);  // top drill
  }
}

// one tip dowel: full length (tip_embed in the body + tip_len exposed);
// embedded end at z=0 (plain), exposed end at z=dowel_len (lead-in chamfer)
module dowel() {
  dl = tip_len + tip_embed;
  cylinder(h = dl - end_cham, d = tip_dia);                // straight rod
  if (end_cham > 0)                                        // lead-in at the exposed tip
    translate([0, 0, dl - end_cham])
      cylinder(h = end_cham, d1 = tip_dia, d2 = tip_dia - 2 * end_cham);
}

// the two dowels in their assembled positions (7mm into each end, 13mm proud)
module t104_dowels() {
  color("#333333")
    translate([0, 0, tip_len]) {
      translate([0, 0, body_len - tip_embed]) dowel();
      translate([0, 0, tip_embed]) mirror([0, 0, 1]) dowel();
    }
}

// positioned, colored 3D tool - standing upright on its bottom tip (z >= 0)
// (colors are preview only - STL carries no color; 3MF/AMF can)
module t104_3d() {
  translate([0, 0, tip_len]) color("#c0c0c0") t104_body();   // silver drilled body
  t104_dowels();                                             // dark tip dowels
}

// 2D FLAT elevation: lay the axis into the plane, then flatten to a silhouette
module t104_flat() {
  projection() rotate([0, 90, 0]) t104_3d();
}

// ---- output (flip 'view' above) ----------------------------
if (view == "3D")          t104_3d();
else if (view == "Flat")   t104_flat();
else if (view == "Rod")    translate([0, 0, tip_len]) color("#c0c0c0") t104_body();  // body with drilled ends
else if (view == "Dowels") t104_dowels();                                            // the two tip dowels

echo(str("Overall length = ", body_len + 2 * tip_len, " mm"));  // = 166
