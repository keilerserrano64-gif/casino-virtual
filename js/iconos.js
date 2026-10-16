/* iconos.js — iconos de línea (Lucide, licencia ISC: https://lucide.dev/license) y símbolos de los tragamonedas.
   Solo presentación: los motores siguen usando sus símbolos de texto; aquí se dibujan como SVG.
   Se carga ANTES de app.js. Uso: RCIcon('plane') · RCSym('🍒') · RCGameIcon('Aviator') */
(() => {
  'use strict';
  const P = {"cherry":"<path d=\"M2 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z\" /><path d=\"M12 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z\" /><path d=\"M7 14c3.22-2.91 4.29-8.75 5-12 1.66 2.38 4.94 9 5 12\" /><path d=\"M22 9c-4.29 0-7.14-2.33-10-7 5.71 0 10 4.67 10 7Z\" />",
    "citrus":"<path d=\"M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04z\" /><path d=\"M19.65 15.66A8 8 0 0 1 8.35 4.34\" /><path d=\"m14 10-5.5 5.5\" /><path d=\"M14 17.85V10H6.15\" />",
    "star":"<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />",
    "gem":"<path d=\"M6 3h12l4 6-10 13L2 9Z\" /><path d=\"M11 3 8 9l4 13 4-13-3-6\" /><path d=\"M2 9h20\" />",
    "crown":"<path d=\"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z\" /><path d=\"M5 21h14\" />",
    "hourglass":"<path d=\"M5 22h14\" /><path d=\"M5 2h14\" /><path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\" /><path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\" />",
    "amphora":"<path d=\"M10 2v5.632c0 .424-.272.795-.653.982A6 6 0 0 0 6 14c.006 4 3 7 5 8\" /><path d=\"M10 5H8a2 2 0 0 0 0 4h.68\" /><path d=\"M14 2v5.632c0 .424.272.795.652.982A6 6 0 0 1 18 14c0 4-3 7-5 8\" /><path d=\"M14 5h2a2 2 0 0 1 0 4h-.68\" /><path d=\"M18 22H6\" /><path d=\"M9 2h6\" />",
    "bird":"<path d=\"M16 7h.01\" /><path d=\"M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20\" /><path d=\"m20 7 2 .5-2 .5\" /><path d=\"M10 18v3\" /><path d=\"M14 17.75V21\" /><path d=\"M7 18a6 6 0 0 0 3.84-10.61\" />",
    "bug":"<path d=\"m8 2 1.88 1.88\" /><path d=\"M14.12 3.88 16 2\" /><path d=\"M9 7.13v-1a3.003 3.003 0 1 1 6 0v1\" /><path d=\"M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6\" /><path d=\"M12 20v-9\" /><path d=\"M6.53 9C4.6 8.8 3 7.1 3 5\" /><path d=\"M6 13H2\" /><path d=\"M3 21c0-2.1 1.7-3.9 3.8-4\" /><path d=\"M20.97 5c0 2.1-1.6 3.8-3.5 4\" /><path d=\"M22 13h-4\" /><path d=\"M17.2 17c2.1.1 3.8 1.9 3.8 4\" />",
    "apple":"<path d=\"M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z\" /><path d=\"M10 2c1 .5 2 2 2 5\" />",
    "grape":"<path d=\"M22 5V2l-5.89 5.89\" /><circle cx=\"16.6\" cy=\"15.89\" r=\"3\" /><circle cx=\"8.11\" cy=\"7.4\" r=\"3\" /><circle cx=\"12.35\" cy=\"11.65\" r=\"3\" /><circle cx=\"13.91\" cy=\"5.85\" r=\"3\" /><circle cx=\"18.15\" cy=\"10.09\" r=\"3\" /><circle cx=\"6.56\" cy=\"13.2\" r=\"3\" /><circle cx=\"10.8\" cy=\"17.44\" r=\"3\" /><circle cx=\"5\" cy=\"19\" r=\"3\" />",
    "banana":"<path d=\"M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5\" /><path d=\"M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z\" />",
    "candy":"<path d=\"m9.5 7.5-2 2a4.95 4.95 0 1 0 7 7l2-2a4.95 4.95 0 1 0-7-7Z\" /><path d=\"M14 6.5v10\" /><path d=\"M10 7.5v10\" /><path d=\"m16 7 1-5 1.37.68A3 3 0 0 0 19.7 3H21v1.3c0 .46.1.92.32 1.33L22 7l-5 1\" /><path d=\"m8 17-1 5-1.37-.68A3 3 0 0 0 4.3 21H3v-1.3a3 3 0 0 0-.32-1.33L2 17l5-1\" />",
    "lollipop":"<circle cx=\"11\" cy=\"11\" r=\"8\" /><path d=\"m21 21-4.3-4.3\" /><path d=\"M11 11a2 2 0 0 0 4 0 4 4 0 0 0-8 0 6 6 0 0 0 12 0\" />",
    "cake-slice":"<circle cx=\"9\" cy=\"7\" r=\"2\" /><path d=\"M7.2 7.9 3 11v9c0 .6.4 1 1 1h16c.6 0 1-.4 1-1v-9c0-2-3-6-7-8l-3.6 2.6\" /><path d=\"M16 13H3\" /><path d=\"M16 17H3\" />",
    "zap":"<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\" />",
    "book-open":"<path d=\"M12 7v14\" /><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\" />",
    "sparkles":"<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" /><path d=\"M20 3v4\" /><path d=\"M22 5h-4\" /><path d=\"M4 17v2\" /><path d=\"M5 18H3\" />",
    "diamond":"<path d=\"M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z\" />",
    "plane":"<path d=\"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z\" />",
    "plane-takeoff":"<path d=\"M2 22h20\" /><path d=\"M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z\" />",
    "plane-landing":"<path d=\"M2 22h20\" /><path d=\"M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z\" />",
    "rocket":"<path d=\"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z\" /><path d=\"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z\" /><path d=\"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0\" /><path d=\"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5\" />",
    "orbit":"<circle cx=\"12\" cy=\"12\" r=\"3\" /><circle cx=\"19\" cy=\"5\" r=\"2\" /><circle cx=\"5\" cy=\"19\" r=\"2\" /><path d=\"M10.4 21.9a10 10 0 0 0 9.941-15.416\" /><path d=\"M13.5 2.1a10 10 0 0 0-9.841 15.416\" />",
    "fish":"<path d=\"M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z\" /><path d=\"M18 12v.5\" /><path d=\"M16 17.93a9.77 9.77 0 0 1 0-11.86\" /><path d=\"M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33\" /><path d=\"M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4\" /><path d=\"m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98\" />",
    "banknote":"<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\" /><circle cx=\"12\" cy=\"12\" r=\"2\" /><path d=\"M6 12h.01M18 12h.01\" />",
    "trending-up":"<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\" /><polyline points=\"16 7 22 7 22 13\" />",
    "trending-down":"<polyline points=\"22 17 13.5 8.5 8.5 13.5 2 7\" /><polyline points=\"16 17 22 17 22 11\" />",
    "disc-3":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M6 12c0-1.7.7-3.2 1.8-4.2\" /><circle cx=\"12\" cy=\"12\" r=\"2\" /><path d=\"M18 12c0 1.7-.7 3.2-1.8 4.2\" />",
    "spade":"<path d=\"M5 9c-1.5 1.5-3 3.2-3 5.5A5.5 5.5 0 0 0 7.5 20c1.8 0 3-.5 4.5-2 1.5 1.5 2.7 2 4.5 2a5.5 5.5 0 0 0 5.5-5.5c0-2.3-1.5-4-3-5.5l-7-7-7 7Z\" /><path d=\"M12 18v4\" />",
    "club":"<path d=\"M17.28 9.05a5.5 5.5 0 1 0-10.56 0A5.5 5.5 0 1 0 12 17.66a5.5 5.5 0 1 0 5.28-8.6Z\" /><path d=\"M12 17.66L12 22\" />",
    "dice-5":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /><path d=\"M16 8h.01\" /><path d=\"M8 8h.01\" /><path d=\"M8 16h.01\" /><path d=\"M16 16h.01\" /><path d=\"M12 12h.01\" />",
    "flag":"<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\" /><line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\" />",
    "grid-3x3":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /><path d=\"M3 9h18\" /><path d=\"M3 15h18\" /><path d=\"M9 3v18\" /><path d=\"M15 3v18\" />",
    "cloud":"<path d=\"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z\" />",
    "target":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><circle cx=\"12\" cy=\"12\" r=\"6\" /><circle cx=\"12\" cy=\"12\" r=\"2\" />",
    "wind":"<path d=\"M12.8 19.6A2 2 0 1 0 14 16H2\" /><path d=\"M17.5 8a2.5 2.5 0 1 1 2 4H2\" /><path d=\"M9.8 4.4A2 2 0 1 1 11 8H2\" />",
    "trophy":"<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\" /><path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\" /><path d=\"M4 22h16\" /><path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\" /><path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\" /><path d=\"M18 2H6v7a6 6 0 0 0 12 0V2Z\" />",
    "layout-grid":"<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\" /><rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\" /><rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\" /><rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\" />",
    "flame":"<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\" />",
    "house":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />",
    "coins":"<circle cx=\"8\" cy=\"8\" r=\"6\" /><path d=\"M18.09 10.37A6 6 0 1 1 10.34 18\" /><path d=\"M7 6h1v4\" /><path d=\"m16.71 13.88.7.71-2.82 2.82\" />",
    "bell":"<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\" /><path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\" />",
    "user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /><circle cx=\"12\" cy=\"7\" r=\"4\" />",
    "users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /><circle cx=\"9\" cy=\"7\" r=\"4\" /><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /><path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />",
    "search":"<circle cx=\"11\" cy=\"11\" r=\"8\" /><path d=\"m21 21-4.3-4.3\" />",
    "volume-2":"<path d=\"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z\" /><path d=\"M16 9a5 5 0 0 1 0 6\" /><path d=\"M19.364 18.364a9 9 0 0 0 0-12.728\" />",
    "volume-x":"<path d=\"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z\" /><line x1=\"22\" x2=\"16\" y1=\"9\" y2=\"15\" /><line x1=\"16\" x2=\"22\" y1=\"9\" y2=\"15\" />",
    "arrow-left":"<path d=\"m12 19-7-7 7-7\" /><path d=\"M19 12H5\" />",
    "play":"<polygon points=\"6 3 20 12 6 21 6 3\" />",
    "shield-check":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /><path d=\"m9 12 2 2 4-4\" />",
    "award":"<path d=\"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\" /><circle cx=\"12\" cy=\"8\" r=\"6\" />",
    "gift":"<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\" /><path d=\"M12 8v13\" /><path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\" /><path d=\"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5\" />",
    "circle-dot":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><circle cx=\"12\" cy=\"12\" r=\"1\" />",
    "hexagon":"<path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\" />",
    "heart":"<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\" />",
    "egg":"<path d=\"M12 22c6.23-.05 7.87-5.57 7.5-10-.36-4.34-3.95-9.96-7.5-10-3.55.04-7.14 5.66-7.5 10-.37 4.43 1.27 9.95 7.5 10z\" />",
    "cookie":"<path d=\"M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5\" /><path d=\"M8.5 8.5v.01\" /><path d=\"M16 15.5v.01\" /><path d=\"M12 12v.01\" /><path d=\"M11 17v.01\" /><path d=\"M7 14v.01\" />",
    "x":"<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />",
    "info":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M12 16v-4\" /><path d=\"M12 8h.01\" />",
    "check":"<path d=\"M20 6 9 17l-5-5\" />",
    "triangle-alert":"<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /><path d=\"M12 9v4\" /><path d=\"M12 17h.01\" />",
    "circle-x":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m15 9-6 6\" /><path d=\"m9 9 6 6\" />"};

  const icon = (name, cls = '') => P[name]
    ? `<svg class="ic ic-${name} ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name]}</svg>`
    : '';

  // juego (nombre canónico de RC.GAME_INFO o clave del motor de crash) -> icono
  const GAME = {
    Tragamonedas: 'cherry', Ruleta: 'disc-3', Blackjack: 'club', Poker: 'spade', Dados: 'dice-5', Carreras: 'flag',
    Bingo: 'grid-3x3', Aviator: 'plane', Spaceman: 'orbit', JetX: 'plane-takeoff', 'Cricket X': 'target', Aero: 'plane-landing',
    Zeppelin: 'cloud', 'Space XY': 'rocket', 'Big Bass Crash': 'fish', 'Cash It': 'banknote', 'High Striker': 'trending-up',
    'Gates of Olympus': 'zap', 'Book of Dead': 'book-open', Starburst: 'sparkles', 'Sweet Bonanza': 'candy', Torneo: 'trophy',
    aviator: 'plane', spaceman: 'orbit', jetx: 'plane-takeoff', cricketx: 'target', aero: 'plane-landing', zeppelin: 'cloud',
    spacexy: 'rocket', bigbass: 'fish', cashit: 'banknote', highstriker: 'trending-up',
  };
  const gameIcon = (name, cls) => icon(GAME[name] || 'circle-dot', cls);

  // símbolo de tragamonedas -> [icono o texto, color]
  const RUBY = '#c25560', EMERALD = '#4caf78', SAPPHIRE = '#5b8fd1', AMETHYST = '#9b7fd1', TOPAZ = '#d8a24a', GOLD = '#c9a24a', IVORY = '#e8e2d2';
  const SYM = {
    '🍒': ['cherry', RUBY], '🍋': ['citrus', '#d8c35a'], '🍊': ['citrus', '#d88a4a'], '⭐': ['star', GOLD], '💎': ['gem', SAPPHIRE],
    '7️⃣': ['7', RUBY], '🎰': ['BAR', IVORY],
    '👑': ['crown', GOLD], '⏳': ['hourglass', TOPAZ], '💍': ['diamond', IVORY], '🏺': ['amphora', '#c98a5a'],
    '🔴': ['hexagon', RUBY], '🟣': ['hexagon', AMETHYST], '🟢': ['hexagon', EMERALD], '🔵': ['hexagon', SAPPHIRE], '🟡': ['hexagon', TOPAZ], '🟠': ['hexagon', '#d88a4a'],
    '⚡': ['zap', GOLD], '🔮': ['circle-dot', AMETHYST],
    '🍉': ['cake-slice', EMERALD], '🍇': ['grape', AMETHYST], '🍎': ['apple', RUBY], '🍑': ['egg', '#e0a07a'], '🍌': ['banana', '#d8c35a'],
    '🍐': ['apple', '#9cbf5a'], '🍓': ['heart', RUBY], '🫐': ['grape', SAPPHIRE], '🍭': ['lollipop', GOLD], '🍬': ['candy', '#e0a07a'],
    '🤠': ['user', GOLD], '🦅': ['bird', TOPAZ], '🪲': ['bug', EMERALD], '📖': ['book-open', GOLD], '🌟': ['sparkles', GOLD],
    'A': ['A', RUBY], 'K': ['K', SAPPHIRE], 'Q': ['Q', AMETHYST], 'J': ['J', EMERALD], '10': ['10', TOPAZ],
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEYS = Object.keys(SYM).sort((a, b) => b.length - a.length);
  // Devuelve HTML. Admite texto extra detrás del símbolo (p. ej. «🔮×5»).
  function sym(s) {
    s = String(s ?? '');
    const k = KEYS.find(x => s.startsWith(x));
    if (!k) return esc(s);
    const [v, c] = SYM[k], rest = s.slice(k.length);
    const art = P[v] ? icon(v, 'sym-ic') : `<b class="sym-tx${v.length > 1 ? ' sm' : ''}">${v}</b>`;
    return `<span class="sym" style="--sc:${c}" data-sym="${esc(k)}">${art}${rest ? `<em>${esc(rest)}</em>` : ''}</span>`;
  }

  window.RCIcon = icon;
  window.RCGameIcon = gameIcon;
  window.RCSym = sym;
})();
