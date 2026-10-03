// ============================================================
//  T130 - Kirby armature lock (flat sheet-steel strip)
//  1mm flat strip, 7.5mm wide. One end folds up 90 deg (the
//  bent tab); partway along, an in-plane crank steps the strip
//  sideways (the "commutator side" - a MISNOMER; see the CORRECTION). BASIC SHAPE.
//  Units: millimeters.
//
//  CORRECTION (2026-10-02, field-tested on a real armature): the "commutator"
//  labels throughout this file are WRONG - the tool never touches the commutator.
//  Confirmed function: the FLAT BLADE end (the "commutator" end below) slides into
//  a slot machined across the ARMATURE CORE LAMINATIONS (between the field
//  windings; Kirby etched that slot into the lamination stack on purpose). The
//  90-deg BENT TAB at the other end braces against the MOTOR HOUSING, so armature
//  torque locks against the case. A trapezoid notch positions it; the handle
//  sticks out the back of the motor. The geometry below is measured-correct; the
//  'commutator*' names still read wrong (full rename TODO -> "blade" / "slot end").
// ============================================================

// "3D"   -> colored folded tool  (export STL / 3MF)
// "Flat" -> flat-pattern blank    (export DXF / SVG; cut it, then fold on the bend lines)
// Flat/3D View
view    = "3D";        // ["3D", "Flat"]

// - stock -
thick        = 1.0;    // sheet thickness
width        = 7.5;    // strip width

// - 90 deg tab fold (one end) -
tab_len      = 15.0;   // straight length of the folded tab
bend_radius  = 0.5;    // INSIDE fold radius (outside = inside + thickness)

// - overall length + the in-plane crank -
overall_len  = 114.0;  // overall length INCLUDING the tab fold (X footprint)
jog_from_tab = 70.0;   // crank starts this far from the tab-fold end
jog_run      = 15.0;   // length the crank occupies along the strip
jog_offset   = 7.5;    // sideways (+Y) step: outer edge reaches width + jog_offset = 15
width2       = 5.0;    // width of the commutator segment (after the crank)
crank_radius = 6.0;    // fillet radius on the crank's 4 corners (curved, not sharp) - tune to the real tool

// - trapezoidal notch cut into side -
notch_from_tab = 26.0;  // notch starts this far from the bent-tip end
notch_len      = 13.0;  // notch length at the mouth (along X); ends at 26+13 = 39
notch_back     = 10.0;  // length of the trapezoid's flat back
notch_depth    = 1.5;   // how deep it cuts in from the +Y edge

// - commutator lip: fold UP along the inner edge of seg2 -
lip_height   = 3.0;    // how far the lip sticks up (along the flange)
lip_radius   = 0.5;    // INSIDE fold radius of the lip
lip_angle    = 100;    // angle between the lip and the flat (90 = square; >90 leans outward, away from the flat)
lip_taper_len = 5.0;   // horizontal run of the curved Z-taper at the lip's crank-end (0 = square end)

// - commutator-end tip corner radii (top view) -
tip_r_flat = 1.0;      // corner radius on the flat blade's outer tip
tip_r_lip  = 0.5;      // corner radius on the lip's inner tip

// neutral-axis K-factor for the flat-pattern bend allowances
kfactor = 0.5;

$fn = 96;

// - derived crank positions (X = 0 at commutator end) -
tab_x  = overall_len - (bend_radius + thick);  // flat run ends / fold begins (= 112.5)
jog_hi = overall_len - jog_from_tab;           // crank edge nearer the tab    (= 44)
jog_lo = jog_hi - jog_run;                     // crank edge nearer commutator (= 29)
ntab   = overall_len - notch_from_tab;                // notch edge nearer the tab    (= 88)
nfar   = overall_len - (notch_from_tab + notch_len);  // notch edge nearer commutator (= 75)
nslope = (notch_len - notch_back) / 2;               // run of each angled side       (= 1.5)
outer2 = width + jog_offset;                    // seg2 OUTER edge Y (= 15)
inner2 = outer2 - width2;                       // seg2 INNER edge Y (= 10)
lip_len = jog_lo;                               // lip runs the length of seg2 (X 0..jog_lo)
lip_ro     = lip_radius + thick;                // lip outside radius (= 1.5)
flat_inner = inner2 + lip_ro;                   // seg2 flat inner edge after the lip folds up (= 11.5 -> 3.5mm flat)

// ---- corner rounding: replace a sharp vertex with a tangent arc
// P1 is the corner; P0/P2 its neighbours. The bisector unit(v1+v2)
// always points into the wedge between the two edges - the material
// side of a convex corner, the empty side of a concave one - so the
// arc centre sits at corner + b*d either way. Tracing that arc then
// CUTS convex corners and FILLS concave ones automatically. So the
// two inside crank corners scoop in, the two outside ones round off.
function unit(v) = v / norm(v);
function round_corner(P0, P1, P2, r, steps = 12) =
  let(
    v1 = unit(P0 - P1),
    v2 = unit(P2 - P1),
    th = acos(v1 * v2),                                   // angle between the two edges
    t  = r / tan(th / 2),                                 // tangent distance from the corner
    b  = unit(v1 + v2),                                   // bisector into the wedge
    C  = P1 + b * (r / sin(th / 2)),                      // arc centre
    T1 = P1 + v1 * t,
    T2 = P1 + v2 * t,
    a1 = atan2(T1[1] - C[1], T1[0] - C[0]),
    a2 = atan2(T2[1] - C[1], T2[0] - C[0]),
    dd = ((a2 - a1) + 540) % 360 - 180                    // shortest signed sweep (minor arc)
  )
  [ for (i = [0:steps]) let(a = a1 + dd * i / steps) [C[0] + r * cos(a), C[1] + r * sin(a)] ];

// ---- c2 fillet geometry (crank <-> commutator inner corner) ----
// The lip follows this same arc so its fold line stays flush with the
// crank's inner edge. Mirrors what round_corner(c1,c2,c3) produces.
c2_v1 = [-1, 0];                                          // toward c1, along the Y=inner2 edge
c2_v2 = unit([jog_run, -inner2]);                        // toward c3, along the crank diagonal
c2_th = acos(c2_v1 * c2_v2);
c2_C  = [jog_lo, inner2] + unit(c2_v1 + c2_v2) * (crank_radius / sin(c2_th / 2));  // arc centre
c2_T1 = [jog_lo, inner2] + c2_v1 * (crank_radius / tan(c2_th / 2));  // straight-lip end (on Y=inner2)
c2_T2 = [jog_lo, inner2] + c2_v2 * (crank_radius / tan(c2_th / 2));  // fillet end (on the diagonal)
c2_a1 = atan2(c2_T1[1] - c2_C[1], c2_T1[0] - c2_C[0]);
c2_a2 = atan2(c2_T2[1] - c2_C[1], c2_T2[0] - c2_C[0]);
c2_dd = ((c2_a2 - c2_a1) + 540) % 360 - 180;             // signed sweep of the arc

// ---- flat blank, TOP view: the crank lives here ------------
// The four crank corners are filleted; the tab end and commutator
// end stay square (they fold, and aren't near the commutator).
module flat_outline() {
  c1 = [0,      inner2];   // commutator end, inner
  c2 = [jog_lo, inner2];   // seg2 inner -> crank        (round)
  c3 = [jog_hi, 0];        // crank inner -> seg1 inner   (round)
  c4 = [tab_x,  0];        // seg1 inner -> tab end
  c5 = [tab_x,  width];    // tab end, outer
  c6 = [jog_hi, width];    // seg1 outer -> crank         (round)
  c7 = [jog_lo, outer2];   // crank outer -> seg2 outer   (round)
  c8 = [0,      outer2];   // seg2 outer -> commutator end
  polygon(concat(
    [c1],
    round_corner(c1, c2, c3, crank_radius),   // into the jog, inner edge
    round_corner(c2, c3, c4, crank_radius),   // out of the jog, inner edge
    [c4, c5],
    round_corner(c5, c6, c7, crank_radius),   // out of the jog, outer edge
    round_corner(c6, c7, c8, crank_radius),   // into the jog, outer edge
    round_corner(c7, c8, c1, tip_r_flat)      // commutator outer tip (flat side)
  ));
}

// ---- tab-fold side profile (u = X, v = Z); tab is on Y[0..width]
module tabfold_profile() {
  r_i = bend_radius;
  r_o = r_i + thick;
  ov  = 1;                                                   // lead-in overlapping the blank
  union() {
    translate([tab_x - ov, 0]) square([ov, thick]);          // flat lead-in
    translate([tab_x, thick + r_i])                          // bend arc
      intersection() {
        difference() { circle(r_o); circle(r_i); }
        translate([0, -r_o]) square([r_o, r_o]);             // down-to-right quadrant
      }
    translate([tab_x + r_i, thick + r_i]) square([thick, tab_len]);   // tab
  }
}

// ---- trapezoidal notch (into the +Y edge) ------------------
module notch_2d() {
  polygon([
    [nfar,          width + 1],             // overhang above the edge (empty space)
    [ntab,          width + 1],
    [ntab,          width],                 // mouth, tab side
    [ntab - nslope, width - notch_depth],   // back, tab side
    [nfar + nslope, width - notch_depth],   // back, far side
    [nfar,          width]                  // mouth, far side
  ]);
}
module notch_cut() {                        // the notch as a 3D through-cutter
  translate([0, 0, -0.5]) linear_extrude(thick + 1) notch_2d();
}

// ---- commutator lip profile (u = Y, v = Z); extruded along X
// Folds up from the flat inner edge through `bend` degrees. bend = 90
// gives a square (vertical) lip; bend < 90 (lip_angle > 90) lets the
// flange lean outward, away from the flat - the real tool's ~100 deg.
module lip_profile() {
  r_i  = lip_radius;
  r_o  = r_i + thick;
  ov   = 1;                                                  // lead-in overlapping the flat
  bend = 180 - lip_angle;                                    // fold angle from the flat (90 - lean)
  O    = [flat_inner, thick + r_i];                          // inside-arc centre, above the flat inner edge
  phi  = -90 - bend;                                         // polar angle (from O) at the end of the bend
  Pin  = O + r_i * [cos(phi), sin(phi)];                     // inside corner where the flange starts
  Pout = O + r_o * [cos(phi), sin(phi)];                     // outside corner
  tang = [sin(phi), -cos(phi)];                              // unit direction the flange runs (up/away)
  union() {
    translate([flat_inner, 0]) square([ov, thick]);          // flat lead-in
    translate(O)                                             // bend arc: annulus sector, -90 down to -90-bend
      intersection() {
        difference() { circle(r_o); circle(r_i); }
        polygon(concat([[0, 0]],
          [ for (k = [0:12]) 1.5 * r_o * [cos(-90 - bend * k / 12), sin(-90 - bend * k / 12)] ]));
      }
    polygon([Pin, Pout, Pout + lip_height * tang, Pin + lip_height * tang]);  // straight flange
  }
}

// ---- lip cut: inner band of seg2 that folds up (follows contour)
// A band of width lip_ro hugging seg2's inner edge - straight, then
// curving along the c2 fillet - so the remaining flat edge (and the
// removed strip) track the crank instead of a straight line.
module lip_cut_2d() {
  intersection() {
    difference() { flat_outline(); offset(-lip_ro) flat_outline(); }
    polygon([[-1, -30], [c2_T2[0], -30], [c2_T2[0], flat_inner], [-1, flat_inner]]);
  }
}

// ---- taper the lip's crank-end down in Z (blended, no sharp rim) --
// The flange top follows the TOP arc of a cylinder placed so the arc is
// tangent to the flat top (a smooth blend, no rim to ride on the copper)
// and reaches the base right at the junction (T2). The cutter is the
// region ABOVE that arc, so the flange top rounds over into the slope.
module lip_end_taper() {
  R    = lip_taper_len;                                         // scoop radius (blend gentleness)
  ph   = -90 - (180 - lip_angle);
  ztop = thick + lip_radius + (lip_radius + thick / 2) * sin(ph) - lip_height * cos(ph);  // flange top Z (mid, for the lean)
  H    = ztop - thick;                                          // flange height above base
  cx   = -sqrt(H * (2 * R - H));                                // arc centre offset: tangent to top, base at T2
  translate([c2_T2[0], c2_T2[1], 0])
    rotate([0, 0, atan2(c2_v2[1], c2_v2[0])])                  // x' -> crank diagonal
      translate([0, 20, 0]) rotate([90, 0, 0])                 // extrude the (x'-Z) profile across the flange
        linear_extrude(40)
          difference() {
            translate([cx, ztop - R]) square([R + 0.5, R + 5]);   // everything above ...
            translate([cx, ztop - R]) circle(r = R, $fn = 96);    // ... the descending top arc
          }
}

// ---- round the lip's commutator tip (the folded blank corner) ------
// The lip is the inner strip of the 5mm segment, bent up. So its tip
// carries the same rounded corner as the flat blade, just bent upward:
// the flange's TOP-FRONT corner (top edge meets the tip, X=0), radius
// tip_r_lip - a curve in the X-Z side view, extruded across the flange.
module lip_tip_round() {
  R     = tip_r_lip;
  ph    = -90 - (180 - lip_angle);
  ztop  = thick + lip_radius + (lip_radius + thick) * sin(ph) - lip_height * cos(ph);  // flange top Z (outer)
  slope = tan(lip_angle - 90);                                // flange top slant dZ/dY (the lean)
  yref  = flat_inner + (lip_radius + thick) * cos(ph) + lip_height * sin(ph);  // Y of the outer top edge
  multmatrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, slope, 1, -slope * yref], [0, 0, 0, 1]])  // tilt Z with Y to follow the slanted top
  translate([0, 11.5, 0]) rotate([90, 0, 0]) linear_extrude(20)
    difference() {
      translate([-1, ztop - R]) square([1 + R, R + 1]);        // top-front corner nook (X-Z)
      translate([R, ztop - R]) circle(r = R);                  // keep the fillet arc
    }
}

// ---- folded 3D tool ----------------------------------------
module t130_3d() {
  color("#c0c0c0") {                                          // silver; preview only
    difference() {
      linear_extrude(thick) flat_outline();                  // flat part (with crank)
      notch_cut();                                           // minus the trapezoidal notch
      translate([0, 0, -0.5]) linear_extrude(thick + 1) lip_cut_2d();  // remove the folded-up band (follows the contour)
    }
    translate([0, width, 0]) rotate([90, 0, 0])              // tab fold at Y[0..width]
      linear_extrude(width) tabfold_profile();
    // commutator lip: straight along Y=inner2, then curving along the
    // c2 fillet so the fold line stays flush with the crank's inner edge,
    // with its crank-end tapered down in Z (not a square end)
    difference() {
      union() {
        rotate([0, 0, 90]) rotate([90, 0, 0])
          linear_extrude(c2_T1[0]) lip_profile();            // straight part (X 0 .. fillet start)
        translate([c2_C[0], c2_C[1], 0])                     // curved part: revolve the profile along the fillet arc
          rotate([0, 0, c2_dd > 0 ? c2_a1 : c2_a2])
            rotate_extrude(angle = abs(c2_dd))
              translate([crank_radius - inner2, 0]) lip_profile();
      }
      lip_end_taper();      // curved taper at the crank end
      lip_tip_round();      // rounded corner at the commutator tip
    }
  }
}

// ---- flat pattern: developed blank + bend lines ------------
// The folded features unfold in-plane: the tab extends past its fold by
// its bend allowance + tab_len; the lip flange extends past its fold by
// its bend allowance + lip_height. Bend lines mark where to fold up.
function ba(angle_deg, ri) = angle_deg * PI / 180 * (ri + kfactor * thick);  // bend allowance

module flat_body() {                                          // the flat plate (no folds)
  difference() {
    flat_outline();
    lip_cut_2d();
    notch_2d();
  }
}

module flat_pattern() {
  w_lip = ba(180 - lip_angle, lip_radius) + lip_height;       // developed lip width beyond its fold
  l_tab = ba(90, bend_radius) + tab_len;                      // developed tab length beyond its fold
  union() {
    flat_body();
    translate([tab_x - 0.01, 0]) square([0.01 + l_tab, width]);          // developed tab
    intersection() {                                                     // developed lip flange
      difference() { offset(delta = w_lip) flat_body(); flat_body(); }
      polygon([[-0.5, flat_inner - w_lip - 2], [jog_lo, flat_inner - w_lip - 2],
               [jog_lo, flat_inner - 0.01],    [-0.5, flat_inner - 0.01]]);
    }
  }
}

module bend_lines() {                                         // fold references (not a cut)
  bl = 0.05;
  translate([tab_x - bl / 2, 0]) square([bl, width]);         // tab fold
  translate([0, flat_inner - bl / 2]) square([jog_lo, bl]);   // lip fold
}

// ---- output (flip 'view' at the top) -----------------------
if (view == "3D")        t130_3d();
else if (view == "Flat") { flat_pattern(); bend_lines(); }
