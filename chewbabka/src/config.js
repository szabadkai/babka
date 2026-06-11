// Chew Babka — Töltelékzápor. Minden tartalom és hangolás egy helyen.
const CFG = {
  W: 480, H: 720,
  INK: '#1e0302',
  CREAM: '#fff6df',
  GROUND_Y: 640,

  PLAYER: { w: 96, h: 118, speed: 430, lerp: 14 },

  // weight: dobási esély-súly, r: sugár pixelben
  ITEMS: [
    { key: 'csoki',     pts: 10, weight: 5, r: 27 },
    { key: 'dio',       pts: 15, weight: 4, r: 27 },
    { key: 'makos',     pts: 20, weight: 3, r: 29 },
    { key: 'pisztacia', pts: 40, weight: 1, r: 29 },
    { key: 'mazsola',   pts: 0,  weight: 3, r: 17, bad: true },
  ],

  RAMP_S: 90,              // ennyi másodperc alatt ér a nehézség a maximumra
  SPAWN_MS: [1050, 420],   // dobási időköz: kezdő → végső
  FALL: [135, 330],        // esési sebesség px/s: kezdő → végső
  FALCON_S: [14, 24],      // a sólyom két átrepülése közti idő (s)

  LIVES: 3,
  COMBO_STEP: 5, COMBO_MAX: 5,

  TITLES: [                // [min. pont, cím] — csökkenő sorrendben
    [800, 'A HALHATATLAN'],
    [400, 'A RUSZTIKUS'],
    [150, 'A SZAFTOS'],
    [0,   'A MORZSA'],
  ],

  COPY: {
    sub: 'töltelékzápor!',
    how1: 'Kapd el a hulló tölteléket!',
    how2: 'A mazsolát messzire kerüld!',
    keys: '← →  /  egér  /  ujj      M némítás      P szünet',
    start: 'SPACE vagy katt — kezdjük!',
    again: 'SPACE vagy katt — újra!',
    youAre: 'te vagy:',
    paused: 'szünet',
    over: 'elfogyott a babka...',
  },
};
