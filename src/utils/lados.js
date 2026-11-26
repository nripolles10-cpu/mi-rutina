// Lados de los ejercicios unilaterales: "brazo izquierdo", "pierna derecha"...
// El orden lo marca ladoInicio del ejercicio (por defecto, izquierdo).

const TREN_INFERIOR = ['cuadriceps', 'isquios', 'gluteo', 'gemelos', 'aductores', 'abductores'];
const TREN_SUPERIOR = ['pecho', 'pecho_sup', 'espalda', 'espalda_alta', 'hombro', 'hombro_lat', 'hombro_post', 'biceps', 'triceps', 'antebrazo', 'trapecio'];

// "brazo" para tren superior, "pierna" para tren inferior, "lado" para el resto (core, lumbar...)
export function parteDelCuerpo(cat) {
  if (TREN_INFERIOR.includes(cat)) return 'pierna';
  if (TREN_SUPERIOR.includes(cat)) return 'brazo';
  return 'lado';
}

// "brazo izquierdo", "pierna derecha" (la pierna es femenina)
export function nombreLado(cat, lado) {
  const parte = parteDelCuerpo(cat);
  const fem = parte === 'pierna';
  const adj = lado === 'derecho' ? (fem ? 'derecha' : 'derecho') : (fem ? 'izquierda' : 'izquierdo');
  return parte + ' ' + adj;
}

export function ladoInicioDe(ex) {
  return ex && ex.ladoInicio === 'derecho' ? 'derecho' : 'izquierdo';
}

// Los dos pasos de cada serie unilateral, en orden: [{ lado, texto }]
export function pasosUnilateral(ex) {
  const primero = ladoInicioDe(ex);
  const segundo = primero === 'izquierdo' ? 'derecho' : 'izquierdo';
  return [primero, segundo].map((lado) => ({ lado, texto: nombreLado(ex.cat, lado) }));
}
