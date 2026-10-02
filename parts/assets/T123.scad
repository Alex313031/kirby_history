// ============================================================
//  T123 - Kirby handle-spring winder ("T-123" torque spanner)
//  A T-handle tool, basically a tree of interconnected cylinders:
//  a top HUB carrying the crossbar (tommy bar), a STEM down to a
//  DISC, and a dark TANG dowel that engages the slot in the handle-
//  spring shaft to wind it against spring force.
//  Built from standard rod + dowel-pin stock, friction-fit; each
//  joint secured with Loctite 243 (blue, medium strength, and
//  OIL-TOLERANT - the tool carries an oil film and the handle areas
//  it works in usually have a little oil; 243 = 242 + oil resistance).
//  No casting or welding: reproducible at home with a lathe + saw.
//  Units: millimeters.
// ============================================================

// Part View
// "3D" -> assembled colored tool   (export STL / 3MF)
// Each major part on its own, top-to-bottom: "Bars", "Hub", "Disc", "Dowel"
view = "3D";        // ["3D", "Bars", "Hub", "Disc", "Dowel"]

// - rods -
rod_dia   = 8.0;    // diameter of the rod stock (stem + crossbar)
stem_len  = 89.0;   // length of the vertical stem (83 exposed + 6 pressed into the hub)
cross_len = 102.0;  // length of the crossbar (tommy bar)

// - top hub (both bars press into this - they don't touch each other) -
hub_dia     = 19.0; // hub cylinder diameter
stem_insert = 6.0;  // how far the stem presses up into the hub bottom (deeper = stronger)
hub_pad     = 3.0;  // solid gap below the crossbar (stem top -> cross hole)
hub_pad_top = 2.0;  // solid gap above the crossbar (cross hole -> hub top)
hub_len    = stem_insert + hub_pad + rod_dia + hub_pad_top;    // hub height = 19 (6 + 3 + 8 + 2)
hub_bottom = stem_len - stem_insert;                           // hub bottom Z (= 83)
cross_z    = hub_bottom + stem_insert + hub_pad + rod_dia / 2; // crossbar axis Z (= 96)

// - disc near the bottom end -
disc_dia   = 25.0;  // disc diameter
disc_thick = 6.0;   // disc thickness (height, Z)
disc_z     = 6.0;   // bare stem below the disc (disc bottom sits this far up from the stem's bottom end)

// - tang dowel (the critical tab; a dowel pin pressed THROUGH the disc) -
// Pressed the full disc depth for shear support: this one pin carries the entire
// spring-winding load (~30+ lb of twist), so deep embedment resists shearing it off.
// TIP: the dowel end has a 0.1mm lead-in chamfer (leaving 3mm of full-dia usable
// length); still knock any burr off the tip with 400-600 grit sandpaper.
dowel_dia   = 3.0;  // dowel diameter (grabs the handle-fork shaft slot - must be exact)
dowel_len   = 9.0;  // dowel length (9mm dowel pin - runs the full disc height + proud)
dowel_proud = 3.1;  // how far it sticks out below the disc bottom (precise to 0.1mm)
dowel_margin = 1.0; // gap from the disc's edge in to the dowel
dowel_r = disc_dia / 2 - dowel_margin - dowel_dia / 2;   // dowel centre radius (= 10)
dowel_recess = disc_thick - (dowel_len - dowel_proud);   // dowel top sits this far below the disc top face (= 0.1)

// - chamfers (deburr) -
end_cham          = 0.5;  // 45 deg chamfer on the exposed ends of the two main T rods (crossbar tips + stem bottom)
disc_cham         = 0.5;  // 45 deg chamfer on the disc's top + bottom rim edges
hub_cham_top      = 0.5;  // 45 deg chamfer on the hub's TOP rim edge
hub_bot_dia       = 10.0; // the hub necks to this dia at its very BOTTOM (big shallow bottom cone)
hub_cham_bot_h    = 3.5;  // axial height of the shallow bottom cone (10 dia -> 18 dia over 3.5mm)
hub_bot_edge_cham = 0.5;  // extra 45 deg chamfer easing the cone's top edge to the side (18->19 dia; total sloped 4mm)
hub_cross_cs      = 0.5;  // even 0.5mm 45 deg chamfer swept around each crossbar-hole mouth (assembly lead-in)
tang_cham         = 0.1;  // 45 deg lead-in on the tang tip (drops full-dia usable length 3.1 -> 3.0mm)

$fn = 96;

// - a rod along +Z, with optional 45 deg end chamfers --
module rod(len, dia, c_bot = 0, c_top = 0) {
  r = dia / 2;
  bot = c_bot > 0 ? [[r - c_bot, 0], [r, c_bot]] : [[r, 0]];       // bottom end
  top = c_top > 0 ? [[r, len - c_top], [r - c_top, len]] : [[r, len]];  // top end
  rotate_extrude() polygon(concat([[0, 0]], bot, top, [[0, len]]));
}

// - the top hub: 45 deg top rim + a large shallow bottom chamfer -
module hub_solid() {
  R  = hub_dia / 2;          // full radius (9.5)
  rb = hub_bot_dia / 2;      // small radius at the very bottom (5)
  bh = hub_cham_bot_h;       // shallow bottom-cone height (3.5)
  ec = hub_bot_edge_cham;    // 45 deg chamfer at the cone's top edge (0.5)
  ct = hub_cham_top;         // top 45 deg chamfer (0.5)
  rotate_extrude()
    polygon([[0, 0], [rb, 0],                          // 10mm bottom face
             [R - ec, bh],                             // shallow cone up to (R-ec) at bh
             [R, bh + ec],                             // 45 deg edge chamfer out to full dia
             [R, hub_len - ct], [R - ct, hub_len],     // straight side + top chamfer
             [0, hub_len]]);
}

// the crossbar bore through the hub (positioned)
module cross_bore() {
  translate([0, 0, cross_z]) rotate([0, 90, 0])
    translate([0, 0, -(hub_dia / 2 + 1)]) cylinder(h = hub_dia + 2, d = rod_dia);
}

// even 0.5mm 45 deg chamfer SWEPT around each crossbar-hole mouth. The mouth is a
// compound-curved edge (round hole through a round hub), so a coaxial countersink
// reads oval; instead we sweep a tiny 45 deg wedge along the ACTUAL edge curve
// (where the bore, radius rh about X, meets the hub surface, radius R about Z).
function cx_ex(rr, ph) = sqrt((hub_dia / 2) * (hub_dia / 2) - rr * rr * sin(ph) * sin(ph));  // surface X at bore-radius rr
module cross_mouth_chamfer() {
  c = hub_cross_cs; rh = rod_dia / 2; ov = 0.4; N = 72; e = 0.001;
  // The wedge runs INTO the bore by 'ov' (kept on the 45 deg line) and pokes a
  // hair past the surface, so the smooth bore + hub surface trim its edges flush.
  for (s = [1, -1])                                     // +X and -X mouths
    for (i = [0 : N - 1]) {
      a = 360 * i / N; b = 360 * (i + 1) / N;
      hull()
        for (ph = [a, b])
          for (p = [
            [s *  cx_ex(rh - ov, ph),             (rh - ov) * sin(ph),  cross_z + (rh - ov) * cos(ph)],  // surface, inside bore
            [s * (cx_ex(rh - ov, ph) - (c + ov)), (rh - ov) * sin(ph),  cross_z + (rh - ov) * cos(ph)],  // deep (45 deg), inside bore
            [s * (cx_ex(rh + c, ph) + 0.02),      (rh + c) * sin(ph),   cross_z + (rh + c) * cos(ph)]    // c out on the surface, nudged proud
          ])
            translate(p) cube(e, center = true);
    }
}

// ---- individual parts --------------------------------------
// Each part carries the holes its mating parts press into, so a
// standalone part view shows its real drilled/bored features - and
// unioning all the parts fills those holes back (= the assembled tool).
module part_stem() {                                   // plain rod; bottom end chamfered
  color("#c0c0c0") rod(stem_len, rod_dia, end_cham, 0);
}
module part_crossbar() {                               // plain rod; both ends chamfered
  color("#c0c0c0")
    translate([0, 0, cross_z]) rotate([0, 90, 0])
      translate([0, 0, -cross_len / 2]) rod(cross_len, rod_dia, end_cham, end_cham);
}
module part_disc() {                                   // rims chamfered; stem + dowel holes THROUGH
  color("#c0c0c0")
    difference() {
      translate([0, 0, disc_z]) rod(disc_thick, disc_dia, disc_cham, disc_cham);
      translate([0, 0, disc_z - 1]) cylinder(h = disc_thick + 2, d = rod_dia);          // stem hole
      translate([dowel_r, 0, disc_z - 1]) cylinder(h = disc_thick + 2, d = dowel_dia);  // dowel hole
    }
}
module part_hub() {                                    // blind stem bore up + crossbar bore, mouths chamfered even
  color("#c0c0c0")
    difference() {
      translate([0, 0, hub_bottom]) hub_solid();
      translate([0, 0, hub_bottom - 1]) cylinder(h = stem_insert + 1, d = rod_dia);     // blind stem bore (6mm)
      cross_bore();                                                                     // crossbar bore (through)
      cross_mouth_chamfer();                                                            // even 45 deg mouth chamfer
    }
}
module part_dowel() {                                  // dark tang dowel; tip chamfered
  color("#333333")
    translate([dowel_r, 0, disc_z - dowel_proud]) rod(dowel_len, dowel_dia, tang_cham, 0);
}

// ---- the assembled tool (pins fill their mating holes) -----
module t123() {
  part_stem();
  part_crossbar();
  part_disc();
  part_hub();
  part_dowel();
}

// ---- output (flip 'view' at the top) -----------------------
if      (view == "3D")    t123();
else if (view == "Bars")  { part_stem(); part_crossbar(); }   // the two rods
else if (view == "Hub")   part_hub();
else if (view == "Disc")  part_disc();
else if (view == "Dowel") part_dowel();

echo(str("stem = ", stem_len, " mm;  crossbar = ", cross_len, " mm;  rod = ", rod_dia, " mm dia"));
