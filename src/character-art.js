import { characterGeometry } from './character/geometry.js';

/** Shared explorer: local +Y crown, +Z face, waist origin. Animation owns only
 * presentation transforms; root position and gameplay state belong to the host. */
export function createCharacterArt(THREE) {
  const { loft, sweep, paint, batch, silhouette } = characterGeometry(THREE);
  const root = new THREE.Group(); root.name = 'Tidekin_Character';
  function group(parent, name, p = [0, 0, 0]) {
    const node = new THREE.Group(); node.name = name; node.position.set(...p); parent.add(node); return node;
  }
  const body = group(root, 'Explorer_Body');
  const material = (name, roughness, metalness = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness, metalness });
    mat.name = name; return mat;
  };
  const skin = material('Skin', .88), cloth = material('Canvas', .98), hair = material('Chestnut', .92);
  const olive = material('Olive', .96), leather = material('Leather', .76), coral = material('CoralCloth', .98);
  const brass = material('Brass', .57, .24), face = material('Face', .74);
  const palette = {
    skin: [0xf2b17f, 0xa67e80, 0xffd6a0], cloth: [0xe9cfa0, 0x8b9992, 0xffefc7],
    hair: [0x75432b, 0x343942, 0xc38b50], olive: [0x697e48, 0x3c5c5b, 0xb3b078],
    leather: [0x94623b, 0x4c454b, 0xd6a368], coral: [0xdd4f50, 0x8c4358, 0xff967a],
    brass: [0xdca955, 0x906134, 0xffd486], white: [0xfff4df, 0xdfd5b8, 0xffffff],
  };
  function mesh(parent, geometry, mat, colors, p = [0, 0, 0], scale = [1, 1, 1]) {
    const node = new THREE.Mesh(paint(geometry, colors[0], colors[1], colors[2], mat.name), mat);
    node.position.set(...p); node.scale.set(...scale); parent.add(node); return node;
  }
  function oval(parent, mat, colors, p, scale, segments = 14) {
    return mesh(parent, new THREE.SphereGeometry(1, segments, 10), mat, colors, p, scale);
  }
  function line(parent, points, radius, mat, colors, segments = 12) {
    return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 6, false), mat, colors);
  }
  function shape(parent, draw, mat, colors, p, depth = .008) {
    const outline = new THREE.Shape(); draw(outline);
    const geometry = silhouette(outline, depth);
    return mesh(parent, geometry, mat, colors, p);
  }
  function shadowPlane(node, color, weight) {
    const tint = new THREE.Color(color), positions = node.geometry.attributes.position;
    const colors = node.geometry.attributes.color;
    for (let i = 0; i < colors.count; i++) {
      const amount = weight(positions.getX(i), positions.getY(i), positions.getZ(i));
      colors.setXYZ(i, colors.getX(i) * (1 - amount) + tint.r * amount,
        colors.getY(i) * (1 - amount) + tint.g * amount, colors.getZ(i) * (1 - amount) + tint.b * amount);
    }
  }
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  // Shaped shoulder, chest, waist and hem; forward placket and collar planes.
  const shirtGeometry = loft([
    [.015, .198, .158], [.07, .256, .202, .006, -.026], [.13, .264, .204, .009, -.020],
    [.22, .246, .179, .016, -.023], [.30, .270, .191, .010, -.028],
    [.40, .289, .184, -.004, -.017], [.49, .239, .149, -.009, -.007], [.55, .125, .105],
  ], 20, .55);
  const shirtPositions = shirtGeometry.attributes.position;
  for (let i = 0; i < shirtPositions.count; i++) {
    const x = shirtPositions.getX(i), y = shirtPositions.getY(i), z = shirtPositions.getZ(i);
    if (y < .25) shirtPositions.setY(i, y + (x * .10 + .042 * smooth(-.02, .15, x)) * (1 - y / .25));
    if (z > .04) {
      const ridge = Math.max(0, 1 - Math.abs(x + .15 - y * .12) / .15);
      const valley = Math.max(0, 1 - Math.abs(x - .095 + y * .30) / .13);
      const lower = Math.max(0, 1 - Math.abs(y - .20) / .24);
      shirtPositions.setZ(i, z + .070 * ridge * lower - .059 * valley * lower);
    }
  }
  shirtGeometry.computeVertexNormals();
  const shirt = mesh(body, shirtGeometry, cloth, palette.cloth);
  // Three garment-scale masses span several rings: warm shoulder/chest,
  // cool gathered flank, and one diagonal crest following the actual fold.
  shadowPlane(shirt, 0x718786, (x, y, z) => .68 * smooth(.01, .15, z) *
    smooth(-.055, .13, x + y * .18) * (1 - smooth(.31, .53, y)));
  shadowPlane(shirt, 0xffedc8, (x, y, z) => .48 * smooth(.01, .15, z) *
    (1 - smooth(-.08, .13, x - y * .22)) * smooth(.045, .28, y));
  shadowPlane(shirt, 0xf7dcaf, (x, y, z) => .36 * smooth(.01, .15, z) *
    (1 - smooth(.055, .15, Math.abs(x + .15 - y * .12))) * (1 - smooth(.30, .49, y)));
  // The gathered waist sits opposite the chest turn and overlaps the relaxed
  // thigh root. Its existing sections keep the hip seam covered in depth.
  mesh(body, loft([[-.2, .248, .16, 0, .04], [-.15, .27, .176, 0, .04],
    [-.045, .25, .163, 0, .04], [.018, .221, .154, 0, .04]], 18, .8), olive, palette.olive);
  mesh(body, loft([[.006, .228, .164, 0, .04], [.045, .231, .167, 0, .04], [.063, .225, .161, 0, .04]], 20, .8), leather, palette.leather);
  const buckle = mesh(body, new THREE.TorusGeometry(.036, .009, 5, 12), brass, palette.brass, [.07, .035, .18], [1.25, .85, 1]);
  buckle.rotation.z = .08;
  line(body, [[0, .50, .125], [.018, .36, .185], [.012, .16, .176], [.009, .08, .162]], .007, cloth, [0xcbbb94]);
  for (const y of [.37, .25, .12]) oval(body, leather, [0x745337], [.016, y, .19], [.011, .011, .008], 8);
  for (const side of [-1, 1]) {
    shape(body, s => { s.moveTo(0, 0); s.lineTo(side * .11, -.065); s.lineTo(side * .16, .025); s.lineTo(side * .05, .08); s.closePath(); }, cloth, palette.white, [side * .017, .48, .12]);
    mesh(body, sweep([[side * .20, .39, .117], [side * .16, .30, .16], [side * .17, .20, .145]], .013, .008, 6, 6), cloth, [0xd8c8a2]);
  }
  mesh(body, loft([[.52, .072, .075], [.63, .085, .082], [.72, .10, .082]], 14), skin, palette.skin);

  // Turn at the neck socket, not the skull centre. The visual offset preserves
  // face coordinates while the same returned head node owns its attitude.
  const head = group(body, 'Explorer_Head', [0, .68, .004]);
  const headVisual = group(head, 'Head_Visual', [0, .18, 0]);
  // Broad cheeks, small rounded chin, tall forehead: one continuous face.
  const faceSurface = mesh(headVisual, loft([
    [-.255, .074, .103, .057, .012], [-.235, .15, .173, .049, .013], [-.17, .226, .225, .031, .012],
    [-.07, .278, .259, .007, .006], [.07, .282, .252, -.006], [.18, .265, .233, -.018],
    [.26, .21, .194, -.024], [.305, .10, .10, -.022], [.316, .018, .025, -.02],
  ], 28), skin, palette.skin);
  shadowPlane(faceSurface, 0xcc775d, (x, y, z) => z > .11 ? .22 * Math.exp(-(((Math.abs(x) - .185) / .105) ** 2 + ((y + .09) / .10) ** 2)) : 0);
  // One quiet cheek-to-jaw plane, leaving the eyes and smiling centre warm.
  shadowPlane(faceSurface, 0xa98682, (x, y, z) => .34 *
    Math.max(0, Math.min(1, (x + y * .45 - .025) / .16)) *
    Math.max(0, Math.min(1, (.09 - y) / .20)) * (z > .05 ? 1 : .5));
  for (const side of [-1, 1]) {
    oval(headVisual, skin, palette.skin, [side * .285, -.013, -.03], [.065, .09, .052]);
    oval(headVisual, skin, [0xc78765, 0xb57a61, 0xe8a079], [side * .31, -.016, .008], [.018, .049, .016], 10);
    // The fuller near cheek joins the jaw; the far cheek stays quieter as the
    // face turns. Thin embedded volumes avoid separate round cheek buttons.
    oval(headVisual, skin, [0xe7a17b, 0xbc8580, 0xffcc9e],
      [side * .19, side < 0 ? -.083 : -.062, side < 0 ? .214 : .219],
      [side < 0 ? .056 : .066, side < 0 ? .042 : .053, .007]);
  }
  mesh(headVisual, loft([[-.064, .038, .035, .278], [-.034, .054, .048, .282], [.005, .043, .039, .269], [.075, .021, .016, .25]], 14), skin, palette.skin);

  // Animated groups survive rigid batching; each eye shares one face material.
  const eyes = [];
  const eyeLook = group(headVisual, 'Eye_Look', [0, .044, .237]);
  for (const side of [-1, 1]) {
    const eye = group(headVisual, side < 0 ? 'Eye_Left' : 'Eye_Right', [side * .11, .044, .237]);
    eye.rotation.y = side * .12;
    oval(eye, face, [0xf1dfbd, 0xbcb69b, 0xfff1d5], [0, 0, .008], [.081, .075, .029], 18);
    const iris = oval(eye, face, [0x795330, 0x49403b, 0xb07c46], [-side * .004, -.002, .035], [.048, .056, .014]);
    const pupil = oval(eye, face, [0x26302c], [-side * .003, -.002, .048], [.027, .039, .005]);
    const glint = oval(eye, face, [0xffffff], [-.013, .022, .054], [.011, .014, .003], 10);
    // One paired gaze draw, sharing the eye-centre blink plane. Bake each
    // eye's yaw into its existing marks without creating more articulation.
    for (const mark of [iris, pupil, glint]) {
      mark.position.applyQuaternion(eye.quaternion); mark.position.x += side * .11;
      mark.quaternion.copy(eye.quaternion); eyeLook.add(mark);
    }
    line(eye, [[-.067, .046, .015], [0, .075, .008], [.066, .047, .015]], .009, face, [0x684433], 10);
    eyes.push(eye);
    mesh(headVisual, sweep([[side * .03, .145, .251], [side * .102, side < 0 ? .210 : .185, .255], [side * .185, side < 0 ? .180 : .151, .227]], .018, .009, 8, 6), hair, palette.hair);
  }
  shape(headVisual, s => {
    s.moveTo(-.113, .066); s.quadraticCurveTo(-.014, -.004, .115, .045);
    s.quadraticCurveTo(.091, -.076, .003, -.082); s.quadraticCurveTo(-.082, -.069, -.113, .066);
  }, face, [0x794435], [0, -.13, .259]);
  shape(headVisual, s => {
    s.moveTo(-.092, .049); s.quadraticCurveTo(0, -.002, .096, .032);
    s.lineTo(.078, -.005); s.quadraticCurveTo(0, -.025, -.077, -.013); s.closePath();
  }, face, palette.white, [0, -.13, .269], .003);
  oval(headVisual, face, [0xd88d77], [.018, -.185, .269], [.044, .016, .004], 10);

  // One swept crown feeds the lock roots; only its trailing exits project.
  // Keep the whole front of the paired goggles ahead of this connected mass.
  const hairCap = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * .56);
  const capPositions = hairCap.attributes.position;
  for (let i = 0; i < capPositions.count; i++) {
    const x = capPositions.getX(i), z = capPositions.getZ(i), y = capPositions.getY(i);
    const temple = Math.max(0, Math.abs(x) - .40) * Math.max(0, .38 - y);
    const notch = (1 - Math.max(0, y)) * Math.max(0, Math.abs(x) - .34);
    capPositions.setXYZ(i, x * (.278 - temple * .17) + Math.max(0, y) * .065,
      .105 + y * .248 + Math.max(0, z) * .18 + temple * .30 + notch * .045, -.048 + z * .235);
  }
  hairCap.computeVertexNormals(); mesh(headVisual, hairCap, hair, palette.hair);
  const locks = [
    { p: [[-.245, .23, .02], [-.25, .38, .07], [-.135, .413, .14], [-.06, .35, .20]], w: .070, d: .031 },
    { p: [[-.18, .31, -.06], [-.09, .455, -.025], [.17, .43, .015], [.39, .31, -.10]], w: .092, d: .032 },
    { p: [[.16, .38, -.05], [.27, .35, -.045], [.38, .315, -.05], [.43, .315, -.08]], w: .056, d: .022 },
    { p: [[-.24, .25, .04], [-.28, .22, .09], [-.30, .17, .06], [-.30, .13, .018]], w: .043, d: .018 },
    { p: [[.205, .20, -.035], [.29, .15, -.025], [.385, .105, -.055], [.44, .13, -.12]], w: .045, d: .019 },
    { p: [[-.20, .13, -.20], [-.27, .015, -.22], [-.24, -.07, -.19], [-.12, -.10, -.23]], w: .040, d: .019 },
    { p: [[.135, .16, -.22], [.245, .035, -.265], [.36, -.035, -.23], [.37, -.045, -.16]], w: .044, d: .020 },
  ];
  locks.forEach((lock, i) => {
    mesh(headVisual, sweep(lock.p, lock.w, lock.d, 12, 8, true, .78), hair,
      i < 2 ? [0x875137, 0x41404a, 0xd69a58] : palette.hair);
  });

  const goggles = group(headVisual, 'Explorer_Goggles');
  function goggleRim(radius, thickness) {
    const geometry = new THREE.TorusGeometry(radius, thickness, 6, 24);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), distance = Math.hypot(x, y);
      const c = x / distance, s = y / distance, edge = distance - radius;
      // Soft corners and a flatter top break the paired-circle face pattern.
      positions.setXY(i, Math.sign(c) * Math.abs(c) ** .87 * .096 + c * edge,
        Math.sign(s) * Math.abs(s) ** .88 * .082 + s * edge);
    }
    geometry.computeVertexNormals(); return geometry;
  }
  for (const side of [-1, 1]) {
    mesh(goggles, goggleRim(.10, .007), leather, [0x76573e], [side * .11, 0, -.004]);
    mesh(goggles, goggleRim(.10, .006), brass, palette.brass, [side * .11, 0, .006]);
    // Opaque blue-green glass reads as a pair at the ordinary camera distance.
    // Shared Face material keeps the existing eight-material budget.
    oval(goggles, face, [0x527c79, 0x365e65, 0xb4d5bc], [side * .11, 0, -.003], [.087, .073, .002], 16);
    line(goggles, [[side * .211, 0, -.005], [side * .239, -.009, -.025], [side * .25, -.015, -.04]], .01, leather, palette.leather, 4);
  }
  line(goggles, [[-.017, .008, .01], [0, .025, .015], [.017, .008, .01]], .007, brass, palette.brass, 6);
  // The reference costume keeps its goggles stowed on the crown in both scenes.
  // Gameplay owns air; presentation does not need to cover brows/eyes in water.
  const goggleBand = group(headVisual, 'Goggle_Band');
  line(goggleBand, [[-.245, 0, .17], [-.31, .014, .018], [-.245, .018, -.21],
    [0, .012, -.29], [.245, .018, -.21], [.31, .014, .018], [.245, 0, .17]], .014, leather, palette.leather, 18);
  goggles.position.set(0, .33, .287); goggles.rotation.x = -.72;
  goggleBand.position.y = .21; goggleBand.scale.set(.94, 1, .94);

  mesh(body, loft([[.527, .102, .089], [.55, .12, .105], [.595, .117, .101], [.615, .09, .083]], 16), coral, palette.coral);
  const kerchief = shape(body, s => { s.moveTo(-.099, .014); s.quadraticCurveTo(0, -.014, .101, .014);
    s.lineTo(.077, -.07); s.lineTo(.005, -.148); s.lineTo(-.058, -.094); s.closePath(); }, coral, palette.coral, [0, .579, 0], .012);
  const kerchiefPositions = kerchief.geometry.attributes.position;
  for (let i = 0; i < kerchiefPositions.count; i++) {
    const fold = Math.max(0, Math.min(1, -kerchiefPositions.getY(i) / .13));
    kerchiefPositions.setZ(i, kerchiefPositions.getZ(i) + .102 + fold * .086);
  }
  kerchief.geometry.computeVertexNormals(); paint(kerchief.geometry, ...palette.coral, 'CoralCloth');
  // Front kerchief + an open shoulder silhouette: the accent must survive the
  // ordinary camera. Existing three cloth groups keep the same draw budget.
  const scarfBase = group(body, 'Scarf_Base', [.075, .595, .055]);
  mesh(scarfBase, sweep([[0, 0, 0], [.16, .065, .02], [.32, .025, .06], [.43, -.055, .09]], .096, .018, 12, 8, false), coral, palette.coral);
  const scarfTip = group(scarfBase, 'Scarf_Tip', [.43, -.055, .09]);
  const tail = shape(scarfTip, s => { s.moveTo(0, .105); s.quadraticCurveTo(.12, .091, .27, .041);
    s.lineTo(.21, -.018); s.lineTo(.285, -.103); s.quadraticCurveTo(.12, -.074, 0, -.105); s.closePath(); }, coral, palette.coral, [0, 0, 0], .012);
  const tailPositions = tail.geometry.attributes.position;
  for (let i = 0; i < tailPositions.count; i++) {
    const x = tailPositions.getX(i), y = tailPositions.getY(i);
    tailPositions.setZ(i, tailPositions.getZ(i) + Math.sin(x * 7) * .045 + y * .12);
  }
  tail.geometry.computeVertexNormals(); paint(tail.geometry, ...palette.coral, 'CoralCloth');
  const scarfSecond = group(body, 'Scarf_Second', [.02, .574, -.028]);
  mesh(scarfSecond, sweep([[0, 0, 0], [.12, -.075, -.105], [.33, -.126, -.073], [.54, -.095, -.025]], .047, .011, 10, 8), coral, [0xc5464a, 0x80333d, 0xf37b6c]);

  // Functional diagonal leather strap and shaped hip satchel.
  mesh(body, sweep([[-.185, .478, .118], [-.09, .32, .196], [.087, .11, .18], [.252, -.08, .077]], .026, .009, 14, 6, false), leather, palette.leather);
  mesh(body, sweep([[-.185, .478, -.12], [-.086, .29, -.179], [.252, -.08, -.06]], .023, .008, 12, 6, false), leather, palette.leather);
  mesh(body, loft([[-.24, .075, .042], [-.205, .10, .055], [-.075, .10, .052], [-.055, .085, .038]], 12, .55), leather, palette.leather, [.303, 0, .035]);
  shape(body, s => { s.moveTo(-.087, 0); s.lineTo(.087, 0); s.lineTo(.072, -.065); s.quadraticCurveTo(0, -.10, -.073, -.065); s.closePath(); }, leather, [0xac7345, 0x6a422e, 0xca9259], [.30, -.065, .09]);
  oval(body, brass, palette.brass, [.30, -.123, .102], [.012, .013, .007], 8);

  const arms = [], legs = [];
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'Left' : 'Right';
    const shoulder = group(body, 'Shoulder_' + suffix, [side * .255, .452 + (side > 0 ? .014 : -.037), -.015]);
    const sleeve = mesh(shoulder, loft([[-.183, .088, .09], [-.133, .102, .109, .005, side * .011],
      [-.073, .106, .111, -.005, side * .011], [-.015, .119, .116], [.04, .067, .076]], 16, .83), cloth, palette.cloth);
    shadowPlane(sleeve, 0x788e89, (x, y, z) => .43 * smooth(-.015, .06, z) *
      smooth(-.035, .075, x * side - y * .16));
    const cuff = mesh(shoulder, loft([[-.202, .094, .093], [-.185, .106, .105], [-.16, .098, .098]], 16, .83), cloth, [0xe8d3a9, 0xaa9178, 0xffedc5]);
    const cuffPositions = cuff.geometry.attributes.position;
    for (let i = 0; i < cuffPositions.count; i++) cuffPositions.setY(i, cuffPositions.getY(i) + cuffPositions.getX(i) * side * .18);
    cuff.geometry.computeVertexNormals(); paint(cuff.geometry, 0xe8d3a9, 0x8e9b92, 0xffedc5, 'Canvas');
    mesh(shoulder, loft([[-.353, .055, .057], [-.29, .064, .066], [-.18, .074, .076]], 14), skin, palette.skin);
    const elbow = group(shoulder, 'Elbow_' + suffix, [0, -.345, 0]);
    mesh(elbow, loft([[-.259, .038, .04], [-.21, .048, .052], [-.083, .06, .064, -.006], [.023, .054, .056]], 14), skin, palette.skin);
    const hand = group(elbow, 'Hand_' + suffix, [0, -.267, .004]);
    mesh(hand, loft([[-.079, .055, .030, .004], [-.044, .062, .035], [-.004, .039, .027], [.018, .037, .026]], 12, .58), skin, palette.skin);
    for (let finger = 0; finger < 4; finger++) {
      const x = (finger - 1.5) * .027, length = .054 - Math.abs(finger - 1.5) * .010;
      mesh(hand, sweep([[x, -.062, .002], [x * 1.12, -.092, .014], [x * 1.07 + side * .003, -.079 - length, .034]], .0125, .0135, 6, 6, false), skin, palette.skin);
    }
    mesh(hand, sweep([[side * .043, -.024, .005], [side * .077, -.048, .022], [side * .071, -.078, .043]], .021, .017, 7, 6), skin, palette.skin);
    arms.push({ shoulder, elbow, hand, side });

    const hip = group(body, 'Hip_' + suffix, [side * .135, -.168, 0]);
    mesh(hip, loft([[-.292, .117, .122, .007, side * .009], [-.21, .136, .144, .002, side * .012], [-.09, .133, .139], [.035, .115, .12]], 16, .59), olive, palette.olive);
    mesh(hip, loft([[-.303, .121, .126, .007, side * .009], [-.275, .129, .135, .007, side * .009], [-.249, .132, .137, .005, side * .01]], 16, .59), olive, [0x9b9f6b, 0x5c7770, 0xccbe87]);
    mesh(hip, loft([[-.387, .064, .067], [-.33, .076, .073], [-.264, .078, .075]], 14), skin, palette.skin);
    const knee = group(hip, 'Knee_' + suffix, [0, -.384, 0]);
    mesh(knee, loft([[-.284, .049, .053], [-.20, .058, .067, -.008], [-.085, .075, .080, -.008], [.02, .065, .066]], 14, .78), skin, palette.skin);
    const ankle = group(knee, 'Ankle_' + suffix, [0, -.284, 0]);
    // Unequal toe/heel sections. Boots finish at -0.98, waist-local.
    mesh(ankle, loft([[-.428, .077, .125, .043], [-.411, .09, .142, .045], [-.363, .100, .142, .043], [-.291, .083, .108, .014], [-.23, .075, .082]], 16, .61), leather, palette.leather, [0, .284, 0]);
    mesh(ankle, loft([[-.422, .084, .137, .045], [-.40, .091, .145, .045], [-.389, .09, .141, .044]], 16, .7), leather, [0x5e4030, 0x3e3028, 0x967052], [0, .284, 0]);
    mesh(ankle, loft([[-.260, .079, .090], [-.237, .083, .092], [-.213, .077, .085]], 14), leather, [0xc18e57, 0x7d7569, 0xe8bf80], [0, .284, 0]);
    const laces = line(ankle, [[-.04, -.338, .114], [0, -.345, .138], [.04, -.331, .116]], .007, cloth, [0xdac59b], 6);
    laces.position.y = .284;
    legs.push({ hip, knee, ankle, side });
  }

  // A waist pivot connects the outward reach to the torso. Hip/ankle chains
  // remain on the returned body so the host's planted sole targets do not move.
  const upperBody = group(body, 'Upper_Body');
  for (const child of body.children.slice()) {
    if (child !== upperBody && !legs.some(leg => leg.hip === child)) upperBody.add(child);
  }
  // Keep the planted-foot solve inside the host-owned body heading. A local
  // waist translation then turns with the raft instead of shifting the soles.
  const pelvis = group(body, 'Pose_Pelvis');
  for (const child of body.children.slice()) if (child !== pelvis) pelvis.add(child);
  batch(root);
  // Reuse group quaternion values: no new injected engine capability and no
  // per-frame allocation. The waist pivot is neutral during root roll/body yaw
  // in water, so the existing neck counter-rotation remains exact.
  const desiredHead = head.quaternion.clone(), inverseRoot = root.quaternion.clone();
  const neutralHead = head.quaternion.clone().identity();
  const footOffset = new THREE.Vector3();
  let lean = 0, yaw = 0, phase = 0, seconds = 0, swim = 0, reach = 0, gaze = 0;
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = THREE.MathUtils.clamp;
  function animate({ dt = 0, time, moving = false, surface = false, facing = 1, vertical = 0,
    working = false, progress = 0, reducedMotion = false, reset = false, deck = false } = {}) {
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .1);
    facing = facing < 0 ? -1 : 1;
    vertical = Number.isFinite(vertical) ? clamp(vertical, -.65, .65) : 0;
    progress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
    if (reset) { phase = 0; seconds = 0; }
    if (!reducedMotion) {
      phase += dt * (moving && !deck ? surface ? 5.4 : 4.2 : 1.6);
      seconds = Number.isFinite(time) ? time : seconds + dt;
    }
    const blend = reset || reducedMotion ? 1 : 1 - Math.exp(-dt * 8);
    const active = !deck && (moving || working);
    swim = mix(swim, active ? 1 : 0, blend);
    reach = mix(reach, !deck && working ? 1 : 0, blend);
    lean = deck ? 0 : mix(lean, active ? -facing * (Math.PI / 2 - vertical) : 0, blend);
    yaw = deck ? 0 : mix(yaw, facing * (active ? .96 : .32), blend);
    root.rotation.z = lean; body.rotation.y = yaw;
    body.rotation.z = 0;
    pelvis.position.set(deck ? -.045 : 0, 0, deck ? .015 : 0);
    pelvis.rotation.z = deck ? -.065 : 0;
    const motion = reducedMotion ? 0 : 1;
    const breath = Math.sin(phase * .61) * motion;
    // Opposed pelvis/chest lines connect the fixed supporting foot to the
    // outward point. Water returns both pivots and the waist offset to neutral.
    upperBody.position.set(deck ? -.035 : 0, 0, deck ? .01 : 0);
    // Chest depth and the advancing shoulder carry the point; the neck only
    // completes the turn, preserving an open three-quarter face.
    upperBody.rotation.set(0, deck ? -.28 : 0, deck ? .235 : 0);
    head.rotation.set(deck ? -.14 : -.025 * swim + breath * .014,
      deck ? -.16 : yaw * .094 * swim + breath * .014,
      deck ? -.045 : clamp(lean * .28, -.43, .43) - .035 * (1 - swim));
    if (!deck) {
      desiredHead.copy(head.quaternion);
      head.quaternion.copy(body.quaternion).invert()
        .multiply(inverseRoot.copy(root.quaternion).invert()).multiply(desiredHead);
      // Limit total neck attitude, including yaw, rather than separately
      // clamping Euler components and introducing a twist at facing reversal.
      const angle = 2 * Math.acos(clamp(Math.abs(head.quaternion.w), 0, 1));
      if (angle > 1.28) head.quaternion.slerp(neutralHead, 1 - 1.28 / angle);
    }
    head.position.y = .68 + breath * .003;
    const blinkPhase = ((seconds % 4.9) + 4.9) % 4.9;
    const blink = reducedMotion ? 1 : 1 - Math.sin(clamp((blinkPhase - 4.48) / .18, 0, 1) * Math.PI) * .92;
    for (const eye of eyes) eye.scale.y = blink;
    gaze = mix(gaze, deck ? -.028 : working ? facing * .022 : 0, blend);
    eyeLook.position.x = gaze; eyeLook.scale.y = blink;

    // Body yaw turned the wide folded surface into a strip. Counter that yaw
    // during travel, keeping thickness/curvature and a clear off-torso lane.
    scarfBase.rotation.set(.08 + Math.sin(phase * .84) * .07 * motion,
      -.12 - yaw * swim + Math.sin(phase * .61 + .7) * .07 * motion, mix(.05, -.82, swim) + Math.sin(phase * .72) * .08 * motion);
    scarfTip.rotation.set(-.10 + Math.sin(phase * .84 - .65) * .10 * motion, -.08,
      -.12 + Math.sin(phase * .72 - .65) * .13 * motion);
    scarfSecond.rotation.set(.08 + Math.sin(phase * .84 - 1) * .07 * motion, -.16 - yaw * swim, mix(-.10, -.92, swim));

    for (let i = 0; i < arms.length; i++) {
      const { shoulder, elbow, hand, side } = arms[i], p = phase + i * Math.PI;
      const stroke = Math.sin(p) * motion, pull = Math.max(0, Math.cos(p)) * motion;
      shoulder.position.y = .452 + (deck ? side < 0 ? .008 : -.022 : side > 0 ? .014 : -.037);
      shoulder.position.z = deck ? side < 0 ? .025 : -.045 : -.015;
      if (deck) {
        // The reference explorer reaches out toward the world. Local -X maps
        // to open water at the host's raft yaw; the other hand rests at the belt.
        shoulder.rotation.set(side < 0 ? -.26 : -.25, side < 0 ? .48 : .16,
          side < 0 ? -1.64 + breath * .035 : .17);
        elbow.rotation.set(side < 0 ? -.18 : -1.26, 0, 0);
        hand.rotation.set(side < 0 ? -.10 : .18, side * .12, side * .08);
        continue;
      }
      const restShoulder = (side > 0 ? -.38 : -.58) + stroke * .09;
      const shoulderX = mix(restShoulder, -.98 + stroke * (surface ? 1.05 : .68), swim);
      const primary = side === facing;
      shoulder.rotation.set(mix(shoulderX, primary ? -1.46 + progress * .20 : -.78 + progress * .12, reach), side * mix(.04 * swim, .12, reach),
        side * mix(mix(side > 0 ? .42 : .58, .25 + pull * .12, swim), primary ? .63 : .43, reach));
      const restElbow = (side > 0 ? -.86 : -1.08) - stroke * .12;
      elbow.rotation.x = mix(mix(restElbow, -.4 - pull * .66, swim), primary ? -.50 - progress * .20 : -.56 - progress * .12, reach);
      hand.rotation.set(mix(side > 0 ? -.10 : .12 + stroke * .08, .14 + stroke * .09, swim), side * mix(.05 * swim, .20, reach), side * .04);
    }
    for (let i = 0; i < legs.length; i++) {
      const { hip, knee, ankle, side } = legs[i], kick = Math.sin(phase * 1.35 + i * Math.PI) * motion;
      hip.position.x = side * (deck && side < 0 ? .153 : .135);
      hip.position.z = deck ? side > 0 ? .045 : -.026 : 0;
      // Water rest opens the silhouette in the camera plane. Deck joints are
      // compensated below to preserve the established planted foot targets.
      hip.rotation.set(deck ? side > 0 ? -.10 : .035 : mix((side > 0 ? .24 : -.64) + kick * .14, (side > 0 ? -.04 : -.26) + kick * .22, swim),
        deck ? 0 : side * .12 * (1 - swim), deck ? side > 0 ? .43 : .115 : mix(side > 0 ? .22 : -.42, side * (side > 0 ? .055 : .11), swim));
      knee.rotation.set(deck ? side > 0 ? .22 : .085 : mix((side > 0 ? .34 : 1.22) + kick * .20,
        (side > 0 ? .20 : .72) + Math.max(0, -kick) * .28, swim), 0,
        deck ? side > 0 ? -.65 : -.02 : mix(side > 0 ? -.08 : .24, 0, swim));
      if (deck) {
        // Keep the original sole positions and toe yaw while the hip/knee
        // gesture opposes the shoulders. Ankle leveling adds no draw call.
        ankle.rotation.set(0, side * .11, 0);
        inverseRoot.copy(pelvis.quaternion).invert();
        desiredHead.copy(inverseRoot).multiply(ankle.quaternion);
        hip.position.set(side * (side < 0 ? .153 : .135), -.836, side > 0 ? .045 : -.026)
          .sub(pelvis.position).applyQuaternion(inverseRoot);
        ankle.quaternion.copy(knee.quaternion).invert()
          .multiply(inverseRoot.copy(hip.quaternion).invert()).multiply(desiredHead);
        footOffset.copy(ankle.position).applyQuaternion(knee.quaternion)
          .add(knee.position).applyQuaternion(hip.quaternion);
        hip.position.sub(footOffset);
      } else {
        hip.position.y = -.168; ankle.rotation.set(0, 0, 0);
      }
    }
  }
  animate({ deck: true, reset: true });
  return { root, body, head, arms, legs, animate };
}
