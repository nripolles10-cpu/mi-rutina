
export const CARDIO = [
  { id: 'cinta', name: 'Cinta', frecuencia: '3 días / semana', detalle: '20 min · inclinación 12 · velocidad 4,5' },
  { id: 'calle', name: 'Por la calle', frecuencia: '2 días / semana', detalle: '10.000 pasos' },
];

/* =========================================================================
   TU RUTINA ACTUAL (semilla). Series: (reps × kg). La primera es top set y las demás back-off,
   salvo que se indique otro tipo. Los objetivos con texto guardan también su valor numérico.
   ========================================================================= */

export const SEED_EXERCISES = {
  // ---- Día 1: Pierna A ----
  gemelo: { name: 'Gemelo de pie', cat: 'gemelos', comentario: 'Pesado, técnica perfecta.', objetivo: { text: '120 kg', value: 120 },
    sets: [{ reps: 7, weight: 100 }, { reps: 7, weight: 90 }, { reps: 8, weight: 80 }] },
  aductores: { name: 'Aductores', cat: 'aductores', comentario: 'Pies fuera, control en cada punto, lento.', objetivo: { text: '115 kg + minis, técnica perfecta', value: 115 },
    sets: [{ reps: 9, weight: 102.5, nota: '+ minis' }, { reps: 8, weight: 95.5, nota: '+ minis' }] },
  extCuadricepsUni: { name: 'Extensión de cuádriceps unilateral', cat: 'cuadriceps', comentario: 'Solo repeticiones completas, cincha.', objetivo: null,
    sets: [{ reps: 8, weight: 73 }, { reps: 8, weight: 66 }] },
  beltSquat: { name: 'Belt squat', cat: 'cuadriceps', comentario: 'Primer eslabón, máximo recorrido.', objetivo: { text: '120 kg', value: 120 },
    sets: [{ reps: 5, weight: 100 }, { reps: 5, weight: 90 }] },
  prensaPlacas: { name: 'Prensa de placas', cat: 'cuadriceps', comentario: 'Unilateral, técnica CBUM, tensión continua.', objetivo: { text: '100 kg', value: 100 },
    sets: [{ reps: 8, weight: 75.3 }, { reps: 9, weight: 68.3 }] },
  extCuadricepsBi: { name: 'Extensión de cuádriceps bilateral', cat: 'cuadriceps', comentario: 'Control, cincha.', objetivo: null,
    sets: [{ tipo: 'rp', weight: 73, reps: null, tandas: [null, null, null] }] },
  // ---- Día 2: Pecho, hombro y bíceps ----
  aperturasMaq: { name: 'Aperturas en máquina', cat: 'pecho', comentario: 'Calentamiento, control.', objetivo: { text: '134 kg', value: 134 },
    sets: [{ tipo: 'warm', reps: 8, weight: 127 }, { tipo: 'warm', reps: 9, weight: 113 }] },
  pressIncMaq: { name: 'Press inclinado en máquina', cat: 'pecho', comentario: 'Prono, técnica de Andoni, técnica antes que peso.', objetivo: { text: '70 kg', value: 70 },
    sets: [{ reps: 7, weight: 60 }, { reps: 8, weight: 50 }] },
  elevLat: { name: 'Elevaciones laterales', cat: 'hombro', comentario: 'Sin straps, control.', objetivo: { text: '30 kg', value: 30 },
    sets: [{ reps: 5, weight: 25 }, { reps: 8, weight: 20 }, { reps: 10, weight: 15 }] },
  pressMaq: { name: 'Press en máquina', cat: 'pecho', comentario: 'Agarre neutro, técnica.', objetivo: { text: '80 kg', value: 80 },
    sets: [{ reps: 7, weight: 65 }, { reps: 6, weight: 55 }] },
  curlBayesian: { name: 'Curl bayesian en polea', cat: 'biceps', comentario: 'Sujetarse.', objetivo: { text: '50 kg', value: 50 },
    sets: [{ reps: 7, weight: 32 }, { reps: 10, weight: 27 }] },
  curlPredicador: { name: 'Curl predicador', cat: 'biceps', comentario: 'Técnica Nacho.', objetivo: null,
    sets: [{ reps: 8, weight: 32 }, { reps: 8, weight: 23 }] },
  // ---- Día 3: Pierna B (el gemelo de pie es el mismo del Día 1) ----
  femoralSentadoA: { name: 'Femoral sentado', cat: 'isquios', comentario: 'Cincha, control.', objetivo: { text: '108 kg', value: 108 },
    sets: [{ reps: 9, weight: 106.5 }, { reps: 7, weight: 99.5 }, { reps: 7, weight: 92.5 }] },
  pesoMuertoBelt: { name: 'Peso muerto belt', cat: 'lumbar', comentario: '', objetivo: { text: '200 kg', value: 200 },
    sets: [{ reps: 8, weight: 140 }, { reps: 8, weight: 120 }] },
  hipThrust: { name: 'Hip thrust', cat: 'gluteo', comentario: 'Control total.', objetivo: { text: '100 kg', value: 100 },
    sets: [{ reps: 8, weight: 95 }, { reps: 8, weight: 75 }] },
  abduccion: { name: 'Abducción de cadera', cat: 'abductores', comentario: 'Control total.', objetivo: { text: 'Máquina entera', value: null },
    sets: [{ reps: 8, weight: 93 }, { reps: 8, weight: 79 }] },
  absMaquinaB: { name: 'Abdominales en máquina', cat: 'core', comentario: 'Al fallo técnico.', objetivo: { text: 'Maxearla', value: null },
    sets: [{ reps: 9, weight: 77 }, { reps: 10, weight: 68 }] },
  // ---- Día 4: Espalda, hombro y tríceps ----
  remoT: { name: 'Remo T en máquina', cat: 'espalda', comentario: 'Técnica.', objetivo: null,
    sets: [{ reps: 8, weight: 100 }, { reps: 8, weight: 90 }] },
  jalonPecho: { name: 'Jalón al pecho', cat: 'espalda', comentario: 'Unilateral.', objetivo: null,
    sets: [{ reps: 7, weight: 59 }, { reps: 7, weight: 50 }] },
  encogimientos: { name: 'Encogimientos en remo', cat: 'trapecio', comentario: 'Técnica Josema, trapecio, al fallo.', objetivo: null,
    sets: [{ reps: 10, weight: 79 }, { reps: 10, weight: 66 }, { reps: 11, weight: 59 }] },
  remoGironda: { name: 'Remo gironda', cat: 'espalda', comentario: 'Unilateral.', objetivo: null,
    sets: [{ reps: 7, weight: 50 }, { reps: 8, weight: 41 }] },
  aperturasAtras: { name: 'Aperturas hacia atrás', cat: 'hombro', comentario: 'Rango fijo de 12 repes entre las 2 series, máquina entera, buena técnica.', objetivo: { text: 'Máquina entera con buena técnica', value: null },
    sets: [{ reps: 12, weight: 66 }, { reps: 12, weight: 52 }] },
  pressFrances: { name: 'Press francés en máquina', cat: 'triceps', comentario: '', objetivo: { text: '80 kg', value: 80 },
    sets: [{ reps: 8, weight: 60 }, { reps: 9, weight: 50 }] },
  extTricepsPolea: { name: 'Extensión de tríceps en polea', cat: 'triceps', comentario: 'Barra.', objetivo: { text: '36 kg', value: 36 },
    sets: [{ reps: 10, weight: 32 }, { reps: 10, weight: 23 }] },
  // ---- Día 5: Abs y músculos más ----
  pressIncMulti: { name: 'Press inclinado en Multipower', cat: 'pecho', comentario: 'Sin barra.', objetivo: { text: '100 kg', value: 100 },
    sets: [{ reps: 7, weight: 85 }, { reps: 8, weight: 75 }] },
  femoralSentadoB: { name: 'Femoral sentado', cat: 'isquios', comentario: 'Cincha, control.', objetivo: { text: '104 kg', value: 104 },
    sets: [{ reps: 8, weight: 84 }, { reps: 8, weight: 70 }] },
  absMaquinaE: { name: 'Abdominales en máquina', cat: 'core', comentario: 'Al fallo técnico.', objetivo: null,
    sets: [{ reps: 8, weight: 73 }, { reps: 8, weight: 64 }] },
  antebrazoPolea: { name: 'Antebrazo en polea', cat: 'antebrazo', comentario: 'Barra recta, al fallo técnico.', objetivo: null,
    sets: [{ reps: null, weight: null }, { reps: null, weight: null }] },
};

// Los "equipo" (lo que llevas cada día) son los de tu archivo original donde el día coincide.
export const DAYS_SEED = [
  { id: 'piernaA', label: 'Pierna A', equipo: 'Banda, mosquetón y cincha',
    ids: ['gemelo', 'aductores', 'extCuadricepsUni', 'beltSquat', 'prensaPlacas', 'extCuadricepsBi'] },
  { id: 'pecho', label: 'Pecho, hombro y bíceps', equipo: 'Muñequeras y de polea',
    ids: ['aperturasMaq', 'pressIncMaq', 'elevLat', 'pressMaq', 'curlBayesian', 'curlPredicador'] },
  { id: 'piernaB', label: 'Pierna B', equipo: 'Straps, cinturón y cincha',
    ids: ['gemelo', 'femoralSentadoA', 'pesoMuertoBelt', 'hipThrust', 'abduccion', 'absMaquinaB'] },
  { id: 'espalda', label: 'Espalda, hombro y tríceps', equipo: 'Straps',
    ids: ['remoT', 'jalonPecho', 'encogimientos', 'remoGironda', 'aperturasAtras', 'pressFrances', 'extTricepsPolea'] },
  { id: 'abs', label: 'Abs y músculos +', equipo: 'Straps',
    ids: ['pressIncMulti', 'femoralSentadoB', 'absMaquinaE', 'antebrazoPolea'] },
];
