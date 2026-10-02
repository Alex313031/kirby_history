// ============================================================
//  T127 - Kirby service tool: the "Arch"
//  A portal frame - two legs and a top spanning them, open in
//  the middle. A base plate screws onto the bottom (modeled
//  later). Units: millimeters.
// ============================================================

// Part View
part = "All";                     // ["All", "Arch", "Plate", "Bolt", "Screws"]

// - overall arch -
width     = 51.0;   // across  (X)
depth     = 26.0;   // deep    (Y)
height    = 40.0;   // tall    (Z)
gap       = 25.0;   // clear span between the two legs (X)   -> 25 + 13*2 = 51 = width
top_thick = 13.0;   // solid top thickness (Z)

// - inward shelf partway up the opening -
shelf_z    = 14.0;  // height (from bottom) where the span narrows
shelf_step = 0.5;   // how far each leg steps inward above the shelf (span 25 -> 24)

// - edge rounding (deburr) -
top_round  = 0.5;   // radius on the arch's top-left & top-right edges
chamfer    = 0.25;  // 45 deg chamfer on all the other arch edges (holes excepted)

// - pusher-bolt hole (imperial hardware) -
inch            = 25.4;
bolt_hole_dia   = 0.25 * inch;    // 1/4" hole, tapped 1/4-20 UNC for the pusher bolt (7/16" head)
bolt_tpi        = 20;             // 1/4-20 UNC: 20 threads per inch
bolt_back       = 0.4375 * inch;  // the hole's BACK edge sits 7/16" from the front (so the hole is well forward)

// - pusher bolt (1/4-20 hex-head hardware, shown in the assembly) -
bolt_head_af  = 11.0;           // hex head across the flats (measured 11mm exact - an 11mm socket fits, 7/16" is a hair loose)
bolt_head_h   = 4.0;            // hex head thickness
bolt_len      = 51.0;           // shank length: 50mm full thread + 1mm tip chamfer (overall bolt = 4 + 51 = 55mm)
bolt_tip_cham = 1.0;            // 45 deg lead-in chamfer at the shank tip (drops full thread length to 50mm)
bolt_above    = 8.0;            // the bolt's tip sits this far above the hole in the assembly (exploded view; matches arch_lift/screw_below)

// - bottom plate (separate part) -
plate_thick = 3.0;                // plate thickness (same 51 x 26 footprint as the arch)
slot_w      = 0.4375 * inch;      // front U-slot width (opening) = 7/16" for the shaft
slot_depth  = 0.4375 * inch;      // U-slot depth (7/16") from the front, round end at the back

// - mounting screws (4, plate -> arch legs) -
screw_dia      = 0.125 * inch;    // 1/8" - tapped hole in the leg bottoms
screw_tpi      = 40;              // ~40 tpi (assumed - not counted like the main bolt)
plate_hole_dia = screw_dia + 0.4; // plate clearance holes, a touch wider (screws just pass through)
screw_depth    = 5.0;             // tapped depth into the legs
screw_xy = [[20.5, 5], [-20.5, 5], [20.5, 21], [-20.5, 21]];   // centres 5mm in from the outer + front/back edges

// - mounting-screw hardware, shown in the assembly -
screw_head_dia = 8.0;             // head diameter (measured)
screw_head_h   = 3.0;             // head thickness (measured)
screw_len      = 7.0;             // threaded length: 10mm overall - 3mm head; through the 3mm plate + 4mm into the 5mm leg hole (1mm anti-bottom clearance)
screw_flute_w  = 1.0;             // Phillips cross-recess flute width
screw_head_cham = 0.5;            // 45 deg chamfer on the head's exposed-face rim (the head "top"; the model's bottom)
screw_below    = 8.0;             // each screw's tip sits this far below its hole in the assembly (exploded view; matches arch_lift/bolt_above)

// - assembly explode -
arch_lift      = 8.0;             // in the "All" view, lift the arch + bolt this far above the plate (shows the plate is a separate piece; plate stays at Z0, screws beneath)

// Cosmetic thread in the tapped holes (pusher bolt + 4 leg screws). Purely for
// looks - at this scale it won't 3D-print as a working thread, and it adds a lot
// of render time. Off by default; flip on for a "pretty" render.

// whether to show threads, decreases rendering performance
show_threads = false;             // [true, false]

// - Render quality -
$fn = 96;

// - derived -
leg_width = (width - gap) / 2;   // each leg = 13

// ============================================================
//  ABOVE: T127 parameters (these drive the Customizer).
//  BELOW: inlined threads-scad library, then the T127 modules.
// ============================================================

// Created 2016-2017 by Ryan A. Colyer.
// This work is released with CC0 into the public domain.
// https://creativecommons.org/publicdomain/zero/1.0/
//
// https://www.thingiverse.com/thing:1686322
//
// v2.1


// screw_resolution = 0.2;  // in mm  -- commented out so it isn't a Customizer parameter; moved into ScrewThread as a local (its only user)


// Provides standard metric thread pitches.
function ThreadPitch(diameter) =
  (diameter <= 64) ?
    lookup(diameter, [
      [2, 0.4],
      [2.5, 0.45],
      [3, 0.5],
      [4, 0.7],
      [5, 0.8],
      [6, 1.0],
      [7, 1.0],
      [8, 1.25],
      [10, 1.5],
      [12, 1.75],
      [14, 2.0],
      [16, 2.0],
      [18, 2.5],
      [20, 2.5],
      [22, 2.5],
      [24, 3.0],
      [27, 3.0],
      [30, 3.5],
      [33, 3.5],
      [36, 4.0],
      [39, 4.0],
      [42, 4.5],
      [48, 5.0],
      [52, 5.0],
      [56, 5.5],
      [60, 5.5],
      [64, 6.0]
    ]) :
    diameter * 6.0 / 64;


// Provides standard metric hex head widths across the flats.
function HexAcrossFlats(diameter) =
  (diameter <= 64) ?
    lookup(diameter, [
      [2, 4],
      [2.5, 5],
      [3, 5.5],
      [3.5, 6],
      [4, 7],
      [5, 8],
      [6, 10],
      [7, 11],
      [8, 13],
      [10, 16],
      [12, 18],
      [14, 21],
      [16, 24],
      [18, 27],
      [20, 30],
      [22, 34],
      [24, 36],
      [27, 41],
      [30, 46],
      [33, 50],
      [36, 55],
      [39, 60],
      [42, 65],
      [48, 75],
      [52, 80],
      [56, 85],
      [60, 90],
      [64, 95]
    ]) :
    diameter * 95 / 64;

// Provides standard metric hex head widths across the corners.
function HexAcrossCorners(diameter) =
  HexAcrossFlats(diameter) / cos(30);


// Provides standard metric hex (Allen) drive widths across the flats.
function HexDriveAcrossFlats(diameter) =
  (diameter <= 64) ?
    lookup(diameter, [
      [2, 1.5],
      [2.5, 2],
      [3, 2.5],
      [3.5, 3],
      [4, 3],
      [5, 4],
      [6, 5],
      [7, 5],
      [8, 6],
      [10, 8],
      [12, 10],
      [14, 12],
      [16, 14],
      [18, 15],
      [20, 17],
      [22, 18],
      [24, 19],
      [27, 20],
      [30, 22],
      [33, 24],
      [36, 27],
      [39, 30],
      [42, 32],
      [48, 36],
      [52, 36],
      [56, 41],
      [60, 42],
      [64, 46]
    ]) :
    diameter * 46 / 64;

// Provides standard metric hex (Allen) drive widths across the corners.
function HexDriveAcrossCorners(diameter) =
  HexDriveAcrossFlats(diameter) / cos(30);

// Provides metric countersunk hex (Allen) drive widths across the flats.
function CountersunkDriveAcrossFlats(diameter) =
  (diameter <= 14) ?
    HexDriveAcrossFlats(HexDriveAcrossFlats(diameter)) :
    round(0.6*diameter);

// Provides metric countersunk hex (Allen) drive widths across the corners.
function CountersunkDriveAcrossCorners(diameter) =
  CountersunkDriveAcrossFlats(diameter) / cos(30);

// Provides standard metric nut thickness.
function NutThickness(diameter) =
  (diameter <= 64) ?
    lookup(diameter, [
      [2, 1.6],
      [2.5, 2],
      [3, 2.4],
      [3.5, 2.8],
      [4, 3.2],
      [5, 4.7],
      [6, 5.2],
      [7, 6.0],
      [8, 6.8],
      [10, 8.4],
      [12, 10.8],
      [14, 12.8],
      [16, 14.8],
      [18, 15.8],
      [20, 18.0],
      [22, 21.1],
      [24, 21.5],
      [27, 23.8],
      [30, 25.6],
      [33, 28.7],
      [36, 31.0],
      [42, 34],
      [48, 38],
      [56, 45],
      [64, 51]
    ]) :
    diameter * 51 / 64;


// This generates a closed polyhedron from an array of arrays of points,
// with each inner array tracing out one loop outlining the polyhedron.
// pointarrays should contain an array of N arrays each of size P outlining a
// closed manifold.  The points must obey the right-hand rule.  For example,
// looking down, the P points in the inner arrays are counter-clockwise in a
// loop, while the N point arrays increase in height.  Points in each inner
// array do not need to be equal height, but they usually should not meet or
// cross the line segments from the adjacent points in the other arrays.
// (N>=2, P>=3)
// Core triangles:
//   [j][i], [j+1][i], [j+1][(i+1)%P]
//   [j][i], [j+1][(i+1)%P], [j][(i+1)%P]
//   Then triangles are formed in a loop with the middle point of the first
//   and last array.
module ClosePoints(pointarrays) {
  function recurse_avg(arr, n=0, p=[0,0,0]) = (n>=len(arr)) ? p :
    recurse_avg(arr, n+1, p+(arr[n]-p)/(n+1));

  N = len(pointarrays);
  P = len(pointarrays[0]);
  NP = N*P;
  lastarr = pointarrays[N-1];
  midbot = recurse_avg(pointarrays[0]);
  midtop = recurse_avg(pointarrays[N-1]);

  faces_bot = [
    for (i=[0:P-1])
      [0,i+1,1+(i+1)%len(pointarrays[0])]
  ];

  loop_offset = 1;
  bot_len = loop_offset + P;

  faces_loop = [
    for (j=[0:N-2], i=[0:P-1], t=[0:1])
      [loop_offset, loop_offset, loop_offset] + (t==0 ?
      [j*P+i, (j+1)*P+i, (j+1)*P+(i+1)%P] :
      [j*P+i, (j+1)*P+(i+1)%P, j*P+(i+1)%P])
  ];

  top_offset = loop_offset + NP - P;
  midtop_offset = top_offset + P;

  faces_top = [
    for (i=[0:P-1])
      [midtop_offset,top_offset+(i+1)%P,top_offset+i]
  ];

  points = [
    for (i=[-1:NP])
      (i<0) ? midbot :
      ((i==NP) ? midtop :
      pointarrays[floor(i/P)][i%P])
  ];
  faces = concat(faces_bot, faces_loop, faces_top);

  polyhedron(points=points, faces=faces);
}



// This creates a vertical rod at the origin with external threads.  It uses
// metric standards by default.
module ScrewThread(outer_diam, height, pitch=0, tooth_angle=30, tolerance=0.4, tip_height=0, tooth_height=0, tip_min_fract=0) {
  screw_resolution = 0.1;  // mm; finer = smoother threads (was a global; moved here - its only user - so it isn't a Customizer parameter)

  pitch = (pitch==0) ? ThreadPitch(outer_diam) : pitch;
  tooth_height = (tooth_height==0) ? pitch : tooth_height;
  tip_min_fract = (tip_min_fract<0) ? 0 :
    ((tip_min_fract>0.9999) ? 0.9999 : tip_min_fract);

  outer_diam_cor = outer_diam + 0.25*tolerance; // Plastic shrinkage correction
  inner_diam = outer_diam - tooth_height/tan(tooth_angle);
  or = (outer_diam_cor < screw_resolution) ?
    screw_resolution/2 : outer_diam_cor / 2;
  ir = (inner_diam < screw_resolution) ? screw_resolution/2 : inner_diam / 2;
  height = (height < screw_resolution) ? screw_resolution : height;

  steps_per_loop_try = ceil(2*3.14159265359*or / screw_resolution);
  steps_per_loop = (steps_per_loop_try < 4) ? 4 : steps_per_loop_try;
  hs_ext = 3;
  hsteps = ceil(3 * height / pitch) + 2*hs_ext;

  extent = or - ir;

  tip_start = height-tip_height;
  tip_height_sc = tip_height / (1-tip_min_fract);

  tip_height_ir = (tip_height_sc > tooth_height/2) ?
    tip_height_sc - tooth_height/2 : tip_height_sc;

  tip_height_w = (tip_height_sc > tooth_height) ? tooth_height : tip_height_sc;
  tip_wstart = height + tip_height_sc - tip_height - tip_height_w;


  function tooth_width(a, h, pitch, tooth_height, extent) =
    let(
      ang_full = h*360.0/pitch-a,
      ang_pn = atan2(sin(ang_full), cos(ang_full)),
      ang = ang_pn < 0 ? ang_pn+360 : ang_pn,
      frac = ang/360,
      tfrac_half = tooth_height / (2*pitch),
      tfrac_cut = 2*tfrac_half
    )
    (frac > tfrac_cut) ? 0 : (
      (frac <= tfrac_half) ?
        ((frac / tfrac_half) * extent) :
        ((1 - (frac - tfrac_half)/tfrac_half) * extent)
    );


  pointarrays = [
    for (hs=[0:hsteps])
      [
        for (s=[0:steps_per_loop-1])
          let(
            ang_full = s*360.0/steps_per_loop,
            ang_pn = atan2(sin(ang_full), cos(ang_full)),
            ang = ang_pn < 0 ? ang_pn+360 : ang_pn,

            h_fudge = pitch*0.001,

            h_mod =
              (hs%3 == 2) ?
                ((s == steps_per_loop-1) ? tooth_height - h_fudge : (
                 (s == steps_per_loop-2) ? tooth_height/2 : 0)) : (
              (hs%3 == 0) ?
                ((s == steps_per_loop-1) ? pitch-tooth_height/2 : (
                 (s == steps_per_loop-2) ? pitch-tooth_height + h_fudge : 0)) :
                ((s == steps_per_loop-1) ? pitch-tooth_height/2 + h_fudge : (
                 (s == steps_per_loop-2) ? tooth_height/2 : 0))
              ),

            h_level =
              (hs%3 == 2) ? tooth_height - h_fudge : (
              (hs%3 == 0) ? 0 : tooth_height/2),

            h_ub = floor((hs-hs_ext)/3) * pitch
              + h_level + ang*pitch/360.0 - h_mod,
            h_max = height - (hsteps-hs) * h_fudge,
            h_min = hs * h_fudge,
            h = (h_ub < h_min) ? h_min : ((h_ub > h_max) ? h_max : h_ub),

            ht = h - tip_start,
            hf_ir = ht/tip_height_ir,
            ht_w = h - tip_wstart,
            hf_w_t = ht_w/tip_height_w,
            hf_w = (hf_w_t < 0) ? 0 : ((hf_w_t > 1) ? 1 : hf_w_t),

            ext_tip = (h <= tip_wstart) ? extent : (1-hf_w) * extent,
            wnormal = tooth_width(ang, h, pitch, tooth_height, ext_tip),
            w = (h <= tip_wstart) ? wnormal :
              (1-hf_w) * wnormal +
              hf_w * (0.1*screw_resolution + (wnormal * wnormal * wnormal /
                (ext_tip*ext_tip+0.1*screw_resolution))),
            r = (ht <= 0) ? ir + w :
              ( (ht < tip_height_ir ? ((2/(1+(hf_ir*hf_ir))-1) * ir) : 0) + w)
          )
          [r*cos(ang), r*sin(ang), h]
      ]
  ];


  ClosePoints(pointarrays);
}


// This creates a vertical rod at the origin with external auger-style
// threads.
module AugerThread(outer_diam, inner_diam, height, pitch, tooth_angle=30, tolerance=0.4, tip_height=0, tip_min_fract=0) {
  tooth_height = tan(tooth_angle)*(outer_diam-inner_diam);
  ScrewThread(outer_diam, height, pitch, tooth_angle, tolerance, tip_height,
    tooth_height, tip_min_fract);
}


// This creates a threaded hole in its children using metric standards by
// default.
module ScrewHole(outer_diam, height, position=[0,0,0], rotation=[0,0,0], pitch=0, tooth_angle=30, tolerance=0.4, tooth_height=0) {
  extra_height = 0.001 * height;

  difference() {
    children();
    translate(position)
      rotate(rotation)
      translate([0, 0, -extra_height/2])
      ScrewThread(1.01*outer_diam + 1.25*tolerance, height + extra_height,
        pitch, tooth_angle, tolerance, tooth_height=tooth_height);
  }
}


// This creates an auger-style threaded hole in its children.
module AugerHole(outer_diam, inner_diam, height, pitch, position=[0,0,0], rotation=[0,0,0], tooth_angle=30, tolerance=0.4) {
  tooth_height = tan(tooth_angle)*(outer_diam-inner_diam);
  ScrewHole(outer_diam, height, position, rotation, pitch, tooth_angle,
    tolerance, tooth_height=tooth_height) children();
}


// This inserts a ClearanceHole in its children.
// The rotation vector is applied first, then the position translation,
// starting from a position upward from the z-axis at z=0.
module ClearanceHole(diameter, height, position=[0,0,0], rotation=[0,0,0], tolerance=0.4) {
  extra_height = 0.001 * height;

  difference() {
    children();
    translate(position)
      rotate(rotation)
      translate([0, 0, -extra_height/2])
      cylinder(h=height + extra_height, r=(diameter/2+tolerance));
  }
}


// This inserts a ClearanceHole with a recessed bolt hole in its children.
// The rotation vector is applied first, then the position translation,
// starting from a position upward from the z-axis at z=0.  The default
// recessed parameters fit a standard metric bolt.
module RecessedClearanceHole(diameter, height, position=[0,0,0], rotation=[0,0,0], recessed_diam=-1, recessed_height=-1, tolerance=0.4) {
  recessed_diam = (recessed_diam < 0) ?
    HexAcrossCorners(diameter) : recessed_diam;
  recessed_height = (recessed_height < 0) ? diameter : recessed_height;
  extra_height = 0.001 * height;

  difference() {
    children();
    translate(position)
      rotate(rotation)
      translate([0, 0, -extra_height/2])
      cylinder(h=height + extra_height, r=(diameter/2+tolerance));
    translate(position)
      rotate(rotation)
      translate([0, 0, -extra_height/2])
      cylinder(h=recessed_height + extra_height/2,
        r=(recessed_diam/2+tolerance));
  }
}


// This inserts a countersunk ClearanceHole in its children.
// The rotation vector is applied first, then the position translation,
// starting from a position upward from the z-axis at z=0.
// The countersunk side is on the bottom by default.
module CountersunkClearanceHole(diameter, height, position=[0,0,0], rotation=[0,0,0], sinkdiam=0, sinkangle=45, tolerance=0.4) {
  extra_height = 0.001 * height;
  sinkdiam = (sinkdiam==0) ? 2*diameter : sinkdiam;
  sinkheight = ((sinkdiam-diameter)/2)/tan(sinkangle);

  difference() {
    children();
    translate(position)
      rotate(rotation)
      translate([0, 0, -extra_height/2])
      union() {
        cylinder(h=height + extra_height, r=(diameter/2+tolerance));
        cylinder(h=sinkheight + extra_height, r1=(sinkdiam/2+tolerance), r2=(diameter/2+tolerance), $fn=24*diameter);
      }
  }
}


// This inserts a Phillips tip shaped hole into its children.
// The rotation vector is applied first, then the position translation,
// starting from a position upward from the z-axis at z=0.
module PhillipsTip(width=7, thickness=0, straightdepth=0, position=[0,0,0], rotation=[0,0,0]) {
  thickness = (thickness <= 0) ? width*2.5/7 : thickness;
  straightdepth = (straightdepth <= 0) ? width*3.5/7 : straightdepth;
  angledepth = (width-thickness)/2;
  height = straightdepth + angledepth;
  extra_height = 0.001 * height;

  difference() {
    children();
    translate(position)
      rotate(rotation)
      union() {
        hull() {
          translate([-width/2, -thickness/2, -extra_height/2])
            cube([width, thickness, straightdepth+extra_height]);
          translate([-thickness/2, -thickness/2, height-extra_height])
            cube([thickness, thickness, extra_height]);
        }
        hull() {
          translate([-thickness/2, -width/2, -extra_height/2])
            cube([thickness, width, straightdepth+extra_height]);
          translate([-thickness/2, -thickness/2, height-extra_height])
            cube([thickness, thickness, extra_height]);
        }
      }
  }
}



// Create a standard sized metric bolt with hex head and hex key.
module MetricBolt(diameter, length, tolerance=0.4) {
  drive_tolerance = pow(3*tolerance/HexDriveAcrossCorners(diameter),2)
    + 0.75*tolerance;

  difference() {
    cylinder(h=diameter, r=(HexAcrossCorners(diameter)/2-0.5*tolerance), $fn=6);
    cylinder(h=diameter,
      r=(HexDriveAcrossCorners(diameter)+drive_tolerance)/2, $fn=6,
      center=true);
  }
  translate([0,0,diameter-0.01])
    ScrewThread(diameter, length+0.01, tolerance=tolerance,
      tip_height=ThreadPitch(diameter), tip_min_fract=0.75);
}


// Create a standard sized metric countersunk (flat) bolt with hex key drive.
// In compliance with convention, the length for this includes the head.
module MetricCountersunkBolt(diameter, length, tolerance=0.4) {
  drive_tolerance = pow(3*tolerance/CountersunkDriveAcrossCorners(diameter),2)
    + 0.75*tolerance;

  difference() {
    cylinder(h=diameter/2, r1=diameter, r2=diameter/2, $fn=24*diameter);
    cylinder(h=0.8*diameter,
      r=(CountersunkDriveAcrossCorners(diameter)+drive_tolerance)/2, $fn=6,
      center=true);
  }
  translate([0,0,diameter/2-0.01])
    ScrewThread(diameter, length-diameter/2+0.01, tolerance=tolerance,
      tip_height=ThreadPitch(diameter), tip_min_fract=0.75);
}


// Create a standard sized metric countersunk (flat) bolt with hex key drive.
// In compliance with convention, the length for this includes the head.
module MetricWoodScrew(diameter, length, tolerance=0.4) {
  drive_tolerance = pow(3*tolerance/CountersunkDriveAcrossCorners(diameter),2)
    + 0.75*tolerance;

  PhillipsTip(diameter-2)
    union() {
      cylinder(h=diameter/2, r1=diameter, r2=diameter/2, $fn=24*diameter);

      translate([0,0,diameter/2-0.01])
        ScrewThread(diameter, length-diameter/2+0.01, tolerance=tolerance,
          tip_height=diameter);
    }
}


// Create a standard sized metric hex nut.
module MetricNut(diameter, thickness=0, tolerance=0.4) {
  thickness = (thickness==0) ? NutThickness(diameter) : thickness;
  ScrewHole(diameter, thickness, tolerance=tolerance)
    cylinder(h=thickness, r=HexAcrossCorners(diameter)/2-0.5*tolerance, $fn=6);
}


// Create a convenient washer size for a metric nominal thread diameter.
module MetricWasher(diameter) {
  difference() {
    cylinder(h=diameter/5, r=1.15*diameter, $fn=24*diameter);
    cylinder(h=2*diameter, r=0.575*diameter, $fn=12*diameter, center=true);
  }
}


// Solid rod on the bottom, external threads on the top.
module RodStart(diameter, height, thread_len=0, thread_diam=0, thread_pitch=0) {
  // A reasonable default.
  thread_diam = (thread_diam==0) ? 0.75*diameter : thread_diam;
  thread_len = (thread_len==0) ? 0.5*diameter : thread_len;
  thread_pitch = (thread_pitch==0) ? ThreadPitch(thread_diam) : thread_pitch;

  cylinder(r=diameter/2, h=height, $fn=24*diameter);

  translate([0, 0, height])
    ScrewThread(thread_diam, thread_len, thread_pitch,
      tip_height=thread_pitch, tip_min_fract=0.75);
}


// Solid rod on the bottom, internal threads on the top.
// Flips around x-axis after printing to pair with RodStart.
module RodEnd(diameter, height, thread_len=0, thread_diam=0, thread_pitch=0) {
  // A reasonable default.
  thread_diam = (thread_diam==0) ? 0.75*diameter : thread_diam;
  thread_len = (thread_len==0) ? 0.5*diameter : thread_len;
  thread_pitch = (thread_pitch==0) ? ThreadPitch(thread_diam) : thread_pitch;

  ScrewHole(thread_diam, thread_len, [0, 0, height], [180,0,0], thread_pitch)
    cylinder(r=diameter/2, h=height, $fn=24*diameter);
}


// Internal threads on the bottom, external threads on the top.
module RodExtender(diameter, height, thread_len=0, thread_diam=0, thread_pitch=0) {
  // A reasonable default.
  thread_diam = (thread_diam==0) ? 0.75*diameter : thread_diam;
  thread_len = (thread_len==0) ? 0.5*diameter : thread_len;
  thread_pitch = (thread_pitch==0) ? ThreadPitch(thread_diam) : thread_pitch;

  max_bridge = height - thread_len;
  // Use 60 degree slope if it will fit.
  bridge_height = ((thread_diam/4) < max_bridge) ? thread_diam/4 : max_bridge;

  difference() {
    union() {
      ScrewHole(thread_diam, thread_len, pitch=thread_pitch)
        cylinder(r=diameter/2, h=height, $fn=24*diameter);

      translate([0,0,height])
        ScrewThread(thread_diam, thread_len, pitch=thread_pitch,
          tip_height=thread_pitch, tip_min_fract=0.75);
    }
    // Carve out a small conical area as a bridge.
    translate([0,0,thread_len])
      cylinder(h=bridge_height, r1=thread_diam/2, r2=0.1);
  }
}


// ============================================================
//  END of inlined threads-scad library (Ryan A. Colyer, CC0
//  public domain, thingiverse.com/thing:1686322) - reusable
//  code only; demo/example bolts omitted.
//  BELOW: the T127 tool modules.
// ============================================================

// ---- the arch ----------------------------------------------
// Outer block only: minkowski an octahedron over it (pre-shrunk to
// keep the size) so every edge gets a 45 deg chamfer, then intersect
// with a top-rounded block so the two top edges keep their 0.5 round.
// The opening and holes are cut AFTERWARD, so they - the shelf lip
// especially - stay crisp/sharp.
module arch_profile() {                                       // outer profile, top corners rounded top_round
  r = top_round;
  hull() {
    translate([-width / 2, 0]) square([width, height - r]);          // body up to the round
    translate([-width / 2 + r, height - r]) circle(r = r);           // top-left round
    translate([ width / 2 - r, height - r]) circle(r = r);           // top-right round
  }
}
module octa(c) {                                              // 45 deg minkowski chamfer shape
  hull() for (v = [[c,0,0],[-c,0,0],[0,c,0],[0,-c,0],[0,0,c],[0,0,-c]])
    translate(v) cube(0.002, center = true);
}

// Tapped-hole cutter: subtract it to leave an internal (female) thread. Delegates
// to the inlined threads-scad ScrewThread (a direct polyhedron - far faster and
// cleaner than a twisted extrude). Imperial: pitch = 25.4/tpi; UN 60 deg = 30.
// Tapped-hole cutter: subtract it to leave an internal (female) thread, built on
// the inlined threads-scad ScrewThread (fast polyhedron). Imperial: pitch = 25.4/tpi,
// UN 60-deg -> tooth_angle 30. The key is tooth_height: the library default is a
// FULL pitch (deep, solid sharp V - looks terrible), so we truncate it. Smaller =
// shallower + wider flat crests; 0.5*pitch is a clean mid-depth cosmetic thread.
thread_th = 0.5;   // thread tooth_height as a fraction of pitch (how deep the teeth cut)
module thread_cutter(major, tpi, height) {
  p = inch / tpi;
  ScrewThread(major, height, pitch = p, tooth_angle = 30, tolerance = 0, tooth_height = thread_th * p);
}
// the thread's minor (crest) diameter - matches thread_cutter above
function thread_minor(major, tpi) = major - thread_th * (inch / tpi) / tan(30);

// Lead-in chamfer for a tapped-hole mouth (mouth at Z=0, bore runs +Z). It cones
// from (major/2 + c) at the face all the way IN to the minor radius, so it gouges
// out the ragged first partial thread rather than just widening the outer rim.
module countersink(major_d, minor_d, c) {
  rt = major_d / 2 + c;      // mouth radius at the face
  rb = minor_d / 2;          // deep end = the thread minor (reaches the hole)
  translate([0, 0, -0.01]) cylinder(h = rt - rb + 0.01, r1 = rt + 0.01, r2 = rb);
}

// An opening box: cross-section [x0..x1] x [z0..z1] swept along Y (0..depth),
// with a 45 deg chamfer around its perimeter at EACH Y-face (the mouth) that
// tapers back to the nominal cross-section at depth c. Sweeping only chamfers
// the two mouths - the long edges running in Y (shelf lip, wall corners) stay
// sharp. Buried mouth bevels land in already-removed space, so unioning the
// wide + narrow boxes gives a cleanly mouth-chamfered U opening.
module opening_prism(x0, x1, z0, z1, c) {
  eps = 0.01;
  w = x1 - x0; h = z1 - z0;
  translate([x0, c, z0]) cube([w, depth - 2 * c, h]);                 // straight core (nominal)
  hull() {                                                            // front mouth: grown at Y=0 -> nominal at Y=c
    translate([x0 - c, -eps, z0 - c]) cube([w + 2 * c, eps, h + 2 * c]);
    translate([x0, c, z0])            cube([w,         eps, h]);
  }
  hull() {                                                            // back mouth
    translate([x0 - c, depth,           z0 - c]) cube([w + 2 * c, eps, h + 2 * c]);
    translate([x0,     depth - c - eps, z0])     cube([w,         eps, h]);
  }
}

module t127_arch() {
  c      = chamfer;
  gap_hi = gap - 2 * shelf_step;                              // narrowed span above the shelf (= 24)
  color("#c0c0c0")                                            // silver; preview only
    difference() {
      intersection() {
        translate([0, depth, 0]) rotate([90, 0, 0]) translate([0, 0, c])   // chamfered block (size preserved)
          minkowski() {                                                    // sides+top shrunk by c; bottom EXTENDED
            linear_extrude(depth - 2 * c)                                  // below the deck so its bevel clips off
              translate([-(width / 2 - c), -c]) square([width - 2 * c, height]);
            octa(c);
          }
        translate([0, depth, 0]) rotate([90, 0, 0])                        // clip: 0.5 round on top, SHARP flat bottom
          linear_extrude(depth) arch_profile();
      }
      opening_prism(-gap / 2,    gap / 2,    -1,      shelf_z,             c);  // wide, up to the shelf; mouth chamfered
      opening_prism(-gap_hi / 2, gap_hi / 2, shelf_z, height - top_thick, c);  // narrow, to the top; mouth chamfered
      translate([0, bolt_back - bolt_hole_dia / 2, height - top_thick - 1])    // pusher-bolt hole (tapped)
        if (show_threads) thread_cutter(bolt_hole_dia, bolt_tpi, top_thick + 2);
        else              cylinder(h = top_thick + 2, d = bolt_hole_dia);
      for (p = screw_xy)                                                       // leg screw holes (tapped)
        translate([p[0], p[1], -1])
          if (show_threads) thread_cutter(screw_dia, screw_tpi, screw_depth + 1);
          else              cylinder(h = screw_depth + 1, d = screw_dia);
      if (show_threads) {                                                      // clean, circular chamfered mouths
        bc = 0.1 * inch / bolt_tpi;   sc = 0.1 * inch / screw_tpi;             //   mouth overshoot past major (~0.1*pitch)
        bmin = thread_minor(bolt_hole_dia, bolt_tpi);  smin = thread_minor(screw_dia, screw_tpi);
        translate([0, bolt_back - bolt_hole_dia / 2, height]) mirror([0, 0, 1]) countersink(bolt_hole_dia, bmin, bc);  // top mouth
        translate([0, bolt_back - bolt_hole_dia / 2, height - top_thick])       countersink(bolt_hole_dia, bmin, bc);  // bottom mouth
        for (p = screw_xy) translate([p[0], p[1], 0])                           countersink(screw_dia, smin, sc);      // leg-bottom mouths
      }
    }
}

// ---- bottom plate (separate part) --------------------------
// A 3mm plate under the arch. Front "U" slot lets the armature
// shaft slide in under the bolt; 4 clearance holes match the
// tapped holes in the leg bottoms so it screws on (removable).
module u_slot_2d() {
  yc = slot_depth - slot_w / 2;                       // round-end centre (lands under the bolt)
  c  = chamfer;                                        // 0.25 lead-in
  union() {
    translate([-slot_w / 2, -1]) square([slot_w, yc + 1]);   // slot, open at the front
    translate([0, yc]) circle(d = slot_w);                   // rounded closed end
    polygon([[-slot_w / 2 - c, -1], [ slot_w / 2 + c, -1],   // flared entrance: the two front
             [ slot_w / 2 + c,  0], [ slot_w / 2,      c],   // corners get a 0.25 x 45 deg
             [-slot_w / 2,      c], [-slot_w / 2 - c,  0]]); // lead-in chamfer
  }
}
// plate footprint: the 51 x 26 rectangle with its 4 corners chamfered 0.25 x 45
// (same as the arch's side edges) - extruded, these become vertical corner chamfers
module plate_2d() {
  c = chamfer;
  polygon([[-width / 2 + c, 0],         [ width / 2 - c, 0],
           [ width / 2,     c],         [ width / 2,     depth - c],
           [ width / 2 - c, depth],     [-width / 2 + c, depth],
           [-width / 2,     depth - c], [-width / 2,     c]]);
}
module t127_plate() {
  color("#333333")                          // darker hardened steel (matches T104 dowels)
    difference() {
      linear_extrude(plate_thick) plate_2d();                                      // plate, resting on Z0 (Z0..plate_thick)
      translate([0, 0, -1]) linear_extrude(plate_thick + 2) u_slot_2d();           // front U-slot, through
      for (p = screw_xy)                                                           // 4 clearance holes
        translate([p[0], p[1], -1]) cylinder(h = plate_thick + 2, d = plate_hole_dia);
    }
}

// ---- output (flip 'part' at the top) -----------------------
// the pusher bolt: 1/4-20 threaded shank (same thread profile as the tapped hole,
// so they mate) + a 7/16" hex head. Built tip-at-Z=0, head on top.
// A 45 deg lead-in chamfer is cut on the tip by intersecting the shank with an
// envelope that cones in to (major - cham) at Z=0 and opens to full dia by Z=cham.
module bolt_tip_env(major_r, cham, h) {
  big = major_r + 1;                                 // clear of the crests above the chamfer
  rotate_extrude()
    polygon([[0, 0], [major_r - cham, 0], [major_r, cham],
             [big, cham], [big, h], [0, h]]);
}
module t127_bolt() {
  r = bolt_hole_dia / 2;
  color("#8a8a8a")                                   // steel; preview only
    union() {
      intersection() {                                                      // threaded shank, tip chamfered
        if (show_threads) thread_cutter(bolt_hole_dia, bolt_tpi, bolt_len);
        else              cylinder(h = bolt_len, d = bolt_hole_dia);
        bolt_tip_env(r, bolt_tip_cham, bolt_len + 1);
      }
      translate([0, 0, bolt_len])                                           // hex head
        cylinder(h = bolt_head_h, r = bolt_head_af / (2 * cos(30)), $fn = 6);
    }
}

// a Phillips cross recess, opening at z=0 (full cross) and tapering to a point at
// z=depth (deeper in): two crossed flutes trimmed by an apex-up cone.
module phillips_recess(span, w, depth) {
  intersection() {
    union() {
      cube([span, w, 2 * depth], center = true);
      cube([w, span, 2 * depth], center = true);
    }
    cylinder(h = depth, r1 = span, r2 = 0, $fn = 48);   // wide at the face, point deep in
  }
}

// one mounting screw: threaded shank (mates the tapped leg hole) going UP, tip
// chamfered, with a Phillips pan head below (the head sits under the plate). Built
// tip-at-top; the exposed drive face points down.
module t127_screw() {
  color("#c0c0c0")                                   // light steel (silver); preview only
    union() {
      intersection() {                                                      // threaded shank, tip chamfered
        if (show_threads) thread_cutter(screw_dia, screw_tpi, screw_len);
        else              cylinder(h = screw_len, d = screw_dia);
        bolt_tip_env(screw_dia / 2, 0.4, screw_len + 1);
      }
      translate([0, 0, -screw_head_h])                                      // pan head, below the shank
        difference() {
          // exposed face (z=0) rim chamfered 45 deg; full dia from z=cham up
          rotate_extrude()
            polygon([[0, 0], [screw_head_dia / 2 - screw_head_cham, 0],
                     [screw_head_dia / 2, screw_head_cham],
                     [screw_head_dia / 2, screw_head_h], [0, screw_head_h]]);
          phillips_recess(screw_head_dia * 0.7, screw_flute_w, screw_head_h * 0.6);  // Phillips drive in the exposed face
        }
    }
}

// the four screws in the assembly: under each leg hole, tips screw_below below the
// plate's bottom face (Z0), pointing up at the holes they thread into (exploded view).
module t127_screws() {
  for (p = screw_xy)
    translate([p[0], p[1], -screw_below - screw_len]) t127_screw();
}

// where the bolt sits in the assembly: over its hole, tip bolt_above above the top face
bolt_pos = [0, bolt_back - bolt_hole_dia / 2, height + bolt_above];

if (part == "Arch")        t127_arch();
else if (part == "Plate")  t127_plate();
else if (part == "Bolt")   t127_bolt();
else if (part == "Screws") t127_screws();
else {                                                                   // all parts, assembled (exploded)
  t127_plate();                                                          // plate rests on Z0 (Z0..plate_thick)
  t127_screws();                                                         // screws beneath the plate
  translate([0, 0, plate_thick + arch_lift]) {                           // arch sits on the plate top, + explode gap
    t127_arch();
    translate(bolt_pos) t127_bolt();
  }
}

echo(str("leg width = ", leg_width, " mm;  opening = ", gap, " x ", height - top_thick, " mm"));
