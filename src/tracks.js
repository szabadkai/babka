// Track definitions are pure data: a closed loop of clockwise control points
// for the centerline (smoothed into a spline at load), road width, and a
// palette. Adding a track = adding an entry here.
export const TRACKS = [
  {
    name: 'Sunny Loop',
    width: 110,
    points: [
      [400, 300], [900, 240], [1400, 250], [1800, 330], [2050, 600], [2040, 900],
      [1850, 1150], [1500, 1260], [1100, 1180], [850, 1290], [550, 1300], [300, 1100],
      [250, 800], [290, 500],
    ],
    colors: { grass: '#58b04c', road: '#5a5a66' },
  },
  {
    name: 'Hairpin Harbor',
    width: 100,
    points: [
      [350, 320], [800, 240], [1300, 230], [1750, 320], [2050, 560], [2080, 880],
      [1850, 1080], [1580, 1010], [1480, 760], [1280, 620], [1080, 760], [1030, 1040],
      [1180, 1280], [900, 1400], [520, 1360], [270, 1120], [230, 700],
    ],
    colors: { grass: '#3e9aa8', road: '#565664' },
  },
  {
    name: 'Snake Springs',
    width: 96,
    points: [
      [330, 300], [820, 220], [1300, 300], [1620, 540], [1400, 800], [1700, 1060],
      [2100, 1020], [2260, 1260], [2010, 1460], [1500, 1420], [1000, 1460], [600, 1360],
      [300, 1160], [210, 760], [350, 480],
    ],
    colors: { grass: '#c2a25a', road: '#6b5d52' },
  },
];
