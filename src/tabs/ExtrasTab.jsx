import React, { useState, useMemo } from 'react';
import { chipAcento, Card, Chip, EditLockBar, Label, LabeledNum, MiniBtn, SectionTitle, SupRow, TextField, useGym } from '../components/ui.jsx';
import { ACTIVIDADES, ACTIVIDAD_FACTOR, OBJETIVOS, RITMOS } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { fmt, formatDecimal, safeUrl, uid } from '../utils/format.js';
import { GRASA_PCT_MIN, GRASA_REFERENCIA, KCAL_MINIMAS, RANGO_GRASA, effNutri, gastoReal } from '../utils/health.js';
import { aplicarObjetivoPeso, validarObjetivoPeso } from '../utils/peso.js';
import { calc1RM, calcDiscos } from '../utils/training.js';

/* =========================================================================
   TAB: EXTRAS
   ========================================================================= */

export function AjusteRealCard({ plan }) {
  const { state, commit } = useGym();
  const gr = useMemo(() => gastoReal(state), [state.comida.diario, state.peso.historial]);
  const n = state.nutricion;
  const { obj } = effNutri(state);
  const delta = plan && !plan.falta ? plan.delta : 0;
  return (
    <Card style={{ marginBottom: 22 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14, marginBottom: 6 }}>🔬 Ajuste con tus datos reales (opcional)</div>
      <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
        Con al menos 14 días de comidas apuntadas en el Diario y registros de peso de 14 días o más, calculo tu gasto real: calorías medias − cambio de peso × 7700 ÷ días.
      </div>
      {!gr.ok && <div className="font-body" style={{ color: '#FDE68A', fontSize: 12, lineHeight: 1.5, padding: '10px 12px', borderRadius: 12, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.3)' }}>{gr.motivo}</div>}
      {gr.ok && (
        <div>
          <SupRow label={'Calorías medias (' + gr.dias + ' días con diario)'} value={gr.kcalMed + ' kcal'} />
          <SupRow label={'Cambio de peso (' + gr.span + ' días)'} value={(gr.kgSemana > 0 ? '+' : '') + fmt(gr.kgSemana, 2) + ' kg/semana'} />
          <SupRow label="Gasto real estimado (mantenimiento)" value={gr.tdee + ' kcal'} highlight />
          {plan && !plan.falta && <SupRow label={'Estimación de la fórmula'} value={plan.tdeeEst + ' kcal'} />}
          <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
            Con tu gasto real, tu objetivo de {obj.label.toLowerCase()} quedaría en <b style={{ color: T.text }}>{gr.tdee + delta} kcal</b>.
          </div>
          {n.tdeeReal ? (
            <button onClick={() => commit((prev) => ({ ...prev, nutricion: { ...prev.nutricion, tdeeReal: null } }))} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 10, fontSize: 12.5 }}>↩️ Volver a la estimación por fórmula</button>
          ) : (
            <button onClick={() => commit((prev) => ({ ...prev, nutricion: { ...prev.nutricion, tdeeReal: gr.tdee } }))} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 10, fontSize: 12.5 }}>Usar mi gasto real en la calculadora</button>
          )}
        </div>
      )}
    </Card>
  );
}

export function NutricionCard() {
  const { state, commit } = useGym();
  const { n, eff, plan, obj } = effNutri(state);
  const mant = n.objetivo === 'mantenimiento';
  const upd = (patch) => commit((prev) => ({ ...prev, nutricion: { ...prev.nutricion, ...patch } }), { key: 'nut:' + Object.keys(patch).join() });
  // El sexo es un único dato (el de Ajustes): cambiarlo aquí lo cambia también allí
  const setSexo = (sexo) => commit((prev) => ({ ...prev, formulario: { ...prev.formulario, sexo }, nutricion: { ...prev.nutricion, sexo: null } }));
  // El objetivo de peso es el mismo que en Progreso y Ajustes. Mientras escribes solo se guarda si es un peso válido.
  const setObjetivo = (v) => { if (v === null || validarObjetivoPeso(v).ok) commit((prev) => aplicarObjetivoPeso(prev, v === null ? null : validarObjetivoPeso(v).kg)); };

  const avisos = [];
  if (!plan.falta) {
    if (n.objetivo === 'definicion' && eff.objetivoKg && eff.objetivoKg >= eff.kg) avisos.push('Tu peso objetivo (' + fmt(eff.objetivoKg) + ' kg) no es menor que tu peso actual: para definir tendría que ser más bajo.');
    if (n.objetivo === 'volumen' && eff.objetivoKg && eff.objetivoKg <= eff.kg) avisos.push('Tu peso objetivo (' + fmt(eff.objetivoKg) + ' kg) no es mayor que tu peso actual: para volumen tendría que ser más alto.');
    if (plan.ajustadoAlSuelo) avisos.push('Con este ritmo bajarías a ' + plan.kcalSinSuelo + ' kcal, por debajo del mínimo seguro (' + plan.suelo + ' kcal: ' + (plan.suelo > KCAL_MINIMAS[plan.sexo] ? 'tu metabolismo basal' : fmt(KCAL_MINIMAS[plan.sexo]) + ' kcal para ' + (plan.sexo === 'F' ? 'mujer' : 'hombre')) + '). Te dejo en ese mínimo.');
    else if (plan.kcal < plan.bmr) avisos.push('Estas calorías quedan por debajo de tu metabolismo basal (' + plan.bmr + ' kcal). Conviene un ritmo más suave.');
    if (plan.deficitExcesivo) avisos.push('El déficit es grande (' + Math.abs(plan.delta) + ' kcal/día, unos ' + fmt(Math.abs(plan.semanal), 2) + ' kg/semana). Lo recomendable es no pasar del 25 % de tu gasto ni perder más del 1 % de tu peso por semana: elige un ritmo más suave.');
    if (plan.grasaIgnorada) avisos.push('El % de grasa que has puesto (' + fmt(eff.grasaPct) + ' %) no es creíble para ' + (plan.sexo === 'F' ? 'una mujer' : 'un hombre') + ' (entre ' + RANGO_GRASA[plan.sexo][0] + ' y ' + RANGO_GRASA[plan.sexo][1] + ' %): no lo uso y calculo con Mifflin-St Jeor.');
    if (plan.carbBajo) avisos.push('Con estas calorías no llegan ni la proteína ni la grasa recomendadas: sube calorías o elige un ritmo más suave.');
  }

  const macros = plan.falta ? [] : [
    { key: 'carb', label: 'Hidratos', emoji: '🍚', color: '#A3E635', g: plan.carbG, kcal: plan.carbKcal, extra: 'el resto de las calorías' },
    { key: 'prot', label: 'Proteína', emoji: '🥩', color: '#22D3EE', g: plan.protG, kcal: plan.protKcal, extra: fmt(plan.protF, 1) + ' g por kg' + (plan.pesoRef < eff.kg ? ' (de ' + fmt(plan.pesoRef) + ' kg)' : '') },
    { key: 'fat', label: 'Grasas', emoji: '🥑', color: '#F472B6', g: plan.fatG, kcal: plan.fatKcal, extra: plan.fatG > Math.round(plan.fatF * plan.pesoRef) ? 'mínimo ' + Math.round(GRASA_PCT_MIN[plan.sexo] * 100) + ' % de las kcal' : fmt(plan.fatF, 1) + ' g por kg' },
  ];
  const totalK = plan.falta ? 1 : Math.max(1, plan.protKcal + plan.carbKcal + plan.fatKcal);

  return (
    <div>
      <Card style={{ marginBottom: 22 }}>
        <div className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
          Elige tu objetivo, dime tu peso y a cuánto quieres llegar, y te calculo calorías y macros del día.
        </div>

        <Label>¿Qué fase quieres?</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {Object.keys(OBJETIVOS).map((k) => (
            <Chip key={k} active={n.objetivo === k} accent={OBJETIVOS[k].color} onClick={() => upd({ objetivo: k })}>{OBJETIVOS[k].emoji} {OBJETIVOS[k].label}</Chip>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <LabeledNum label="Peso actual" suffix="kg" value={n.pesoActual} placeholder={eff.kg ? formatDecimal(eff.kg) : 'kg'} onChange={(v) => upd({ pesoActual: v })} />
          {!mant && <LabeledNum label="¿A qué peso quieres llegar?" suffix="kg" value={state.peso.objetivoKg || null} placeholder="kg" onChange={setObjetivo} />}
        </div>

        {!mant && (
          <>
            <Label>Ritmo</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {Object.keys(RITMOS).map((k) => (
                <Chip key={k} active={n.ritmo === k} accent={obj.color} onClick={() => upd({ ritmo: k })}>{RITMOS[k].label} · {n.objetivo === 'volumen' ? '+' + RITMOS[k].vol : '−' + RITMOS[k].def} kcal</Chip>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <LabeledNum label="Edad" suffix="años" value={n.edad} placeholder={eff.edad ? String(eff.edad) : 'años'} onChange={(v) => upd({ edad: v })} />
          <LabeledNum label="Altura" suffix="cm" value={n.alturaCm} placeholder={eff.alturaCm ? String(eff.alturaCm) : 'cm'} onChange={(v) => upd({ alturaCm: v })} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-end' }}>
          <LabeledNum label="% de grasa corporal (opcional)" suffix="%" value={n.grasaPct} placeholder={eff.grasaPct ? formatDecimal(eff.grasaPct) : '—'} onChange={(v) => upd({ grasaPct: v })} />
          <div className="font-body" style={{ flex: 1, color: T.dim, fontSize: 10.5, lineHeight: 1.4, paddingBottom: 10 }}>Si lo pones (y es creíble para tu sexo), uso Katch-McArdle, por masa magra (mejor para gente musculada).</div>
        </div>
        <Label>Sexo</Label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <Chip active={eff.sexo === 'M'} onClick={() => setSexo('M')}>Hombre</Chip>
          <Chip active={eff.sexo === 'F'} onClick={() => setSexo('F')}>Mujer</Chip>
        </div>
        <Label>Nivel de actividad</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {ACTIVIDADES.map((a) => <Chip key={a[0]} active={eff.actividad === a[0]} onClick={() => upd({ actividad: a[0] })}>{a[1]}</Chip>)}
        </div>

        {plan.falta ? (
          <div className="font-body" style={{ color: '#FCD34D', fontSize: 12.5, lineHeight: 1.5, padding: '12px', borderRadius: 12, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.35)' }}>
            Para calcular tu gasto diario necesito tu peso, edad y altura (o tu % de grasa). Rellénalos arriba y aparecerá el resultado.
          </div>
        ) : (
          <div style={{ borderTop: '1px solid rgba(140,170,255,0.14)', paddingTop: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div className="font-body" style={{ color: T.dim, fontSize: 11.5 }}>Calorías objetivo al día</div>
              <div className="font-display" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.05, color: '#FFFFFF', textShadow: '0 0 18px ' + obj.color + '99' }}>{plan.kcal} kcal</div>
              <div className="font-body" style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 800, color: obj.color, background: obj.color + '1F', border: '1px solid ' + obj.color + '66', borderRadius: 999, padding: '4px 12px' }}>
                {plan.delta > 0 ? '+' + plan.delta + ' kcal/día de superávit' : plan.delta < 0 ? '−' + Math.abs(plan.delta) + ' kcal/día de déficit' : 'Sin superávit ni déficit'}
              </div>
            </div>

            <div style={{ marginBottom: 4 }}>
              <SupRow label={n.tdeeReal ? 'Tu gasto en mantenimiento (real, de tus datos)' : 'Tu gasto en mantenimiento (estimado)'} value={plan.tdee + ' kcal'} />
              <SupRow label={'Metabolismo basal (' + plan.metodo + (plan.lbm ? ', masa magra ' + fmt(plan.lbm) + ' kg' : '') + ')'} value={plan.bmr + ' kcal'} />
              <SupRow label="Objetivo de calorías" value={plan.kcal + ' kcal'} highlight />
              {plan.semanas !== null && <SupRow label={'Ritmo orientativo (' + fmt(Math.abs(plan.semanal), 2) + ' kg/semana)'} value={fmt(eff.objetivoKg) + ' kg en ~' + plan.semanas + ' semanas'} />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '14px 0 12px' }}>
              {macros.map((m) => (
                <div key={m.key} style={{ textAlign: 'center', borderRadius: 14, padding: '12px 4px', background: m.color + '12', border: '1px solid ' + m.color + '55' }}>
                  <div style={{ fontSize: 20 }}>{m.emoji}</div>
                  <div className="font-body" style={{ color: m.color, fontSize: 11.5, fontWeight: 800, marginTop: 2 }}>{m.label}</div>
                  <div className="font-display" style={{ color: T.text, fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>{m.g} g</div>
                  <div className="font-body" style={{ color: T.muted, fontSize: 11 }}>{m.kcal} kcal · {Math.round((m.kcal / totalK) * 100)}%</div>
                  <div className="font-body" style={{ color: T.dim, fontSize: 10, marginTop: 2 }}>{m.extra}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: 'rgba(7,11,22,0.9)', border: '1px solid rgba(140,170,255,0.18)' }}>
              {macros.map((m) => <div key={m.key} style={{ width: (m.kcal / totalK) * 100 + '%', background: m.color }} />)}
            </div>

            {plan.lbm && plan.mifflin !== null && (
              <div data-testid="nota-masa-magra" className="font-body" style={{ color: '#BAE6FD', fontSize: 12, lineHeight: 1.5, marginTop: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.35)' }}>
                ℹ️ Con tu % de grasa calculo por <b>masa magra</b> ({fmt(plan.lbm)} kg), que ya refleja tu sexo; la edad no entra en esta fórmula. Con la fórmula estándar (sexo, edad, altura y peso) tu metabolismo basal sería <b>{plan.mifflin} kcal</b> en vez de {plan.bmr}. Los macros sí se ajustan a tu sexo{plan.sexo === 'F' ? ' (más grasa en la dieta)' : ''} y a tu peso de referencia ({fmt(plan.pesoRef)} kg, con un {GRASA_REFERENCIA[plan.sexo]} % de grasa).
              </div>
            )}
            {avisos.map((a, i) => (
              <div key={i} className="font-body" style={{ color: '#FCD34D', fontSize: 12, lineHeight: 1.5, marginTop: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.35)' }}>⚠️ {a}</div>
            ))}
            <div className="font-body" style={{ color: T.dim, fontSize: 10.5, marginTop: 12, lineHeight: 1.5 }}>
              Estimación orientativa ({plan.metodo}, factor de actividad {fmt(ACTIVIDAD_FACTOR[eff.actividad], 2)}). No sustituye a un nutricionista.
            </div>
          </div>
        )}
      </Card>
      <AjusteRealCard plan={plan} />
    </div>
  );
}

export function MovilidadCard() {
  const { state, commit, showToast } = useGym();
  const editMode = state.meta.editMode;
  const mov = state.extras.movilidad;
  const upd = (patch, k) => commit((prev) => ({ ...prev, extras: { ...prev.extras, movilidad: { ...prev.extras.movilidad, ...patch } } }), { key: 'mov:' + k });
  return (
    <div style={{ marginBottom: 22 }}>
      <div onClick={() => { if (!Native.openUrl(mov.url)) showToast('El enlace del vídeo no es válido (tiene que empezar por https://)', 'warn'); }} className="card" style={{ display: 'block', padding: 16, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #7C3AED, #F472B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎬</div>
          <div style={{ flex: 1 }}>
            <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{mov.titulo}</div>
            <div className="font-body" style={{ color: safeUrl(mov.url) ? T.muted : '#FDE68A', fontSize: 12, marginTop: 2 }}>{safeUrl(mov.url) ? 'Abrir vídeo ↗' : 'Enlace no válido: corrígelo en modo edición'}</div>
          </div>
        </div>
      </div>
      {editMode && (
        <Card style={{ marginTop: 8 }}>
          <Label>Título del vídeo</Label>
          <TextField value={mov.titulo} onChange={(v) => upd({ titulo: v }, 't')} placeholder="ej. Rutina de movilidad matutina" />
          <Label style={{ marginTop: 10 }}>Enlace del vídeo</Label>
          <TextField value={mov.url} onChange={(v) => upd({ url: v }, 'u')} placeholder="https://www.youtube.com/…" />
        </Card>
      )}
    </div>
  );
}

export function SuplementosSection() {
  const { state, commit, askConfirm } = useGym();
  const editMode = state.meta.editMode;
  const sups = state.extras.suplementos;
  const setSups = (fn, key) => commit((prev) => ({ ...prev, extras: { ...prev.extras, suplementos: fn(prev.extras.suplementos) } }), key ? { key: key } : {});
  const patchSup = (id, patch, key) => setSups((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)), key);
  const patchFila = (sid, fid, patch, key) => setSups((arr) => arr.map((s) => (s.id === sid ? { ...s, filas: s.filas.map((r) => (r.id === fid ? { ...r, ...patch } : r)) } : s)), key);

  return (
    <div style={{ marginBottom: 22 }}>
      {sups.length === 0 && <Card><p className="font-body" style={{ color: T.muted, fontSize: 13, textAlign: 'center', margin: 0 }}>No tienes suplementos apuntados.{editMode ? '' : ' Desbloquea la edición para añadirlos.'}</p></Card>}
      {sups.map((s) => (
        <Card key={s.id} style={{ marginBottom: 14 }}>
          {editMode ? (
            <>
              <Label>Nombre</Label>
              <TextField value={s.nombre} onChange={(v) => patchSup(s.id, { nombre: v }, 'sup:' + s.id + ':n')} placeholder="ej. Creatina" />
              <Label style={{ marginTop: 10 }}>Nota</Label>
              <TextField multiline value={s.nota} onChange={(v) => patchSup(s.id, { nota: v }, 'sup:' + s.id + ':nota')} placeholder="Texto libre (cuándo tomarlo, ciclos…)" rows={2} />
            </>
          ) : (
            <>
              <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{s.nombre}</div>
              {s.nota ? <p className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{s.nota}</p> : null}
            </>
          )}
          {s.filas.map((r) => (
            editMode ? (
              <div key={r.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
                <input type="text" value={r.label} placeholder="Concepto" onChange={(e) => patchFila(s.id, r.id, { label: e.target.value }, 'sup:' + r.id + ':l')} className="font-body inp" style={{ flex: 1.2, minWidth: 0, fontSize: 12.5, padding: '8px' }} />
                <input type="text" value={r.value} placeholder="Dosis" onChange={(e) => patchFila(s.id, r.id, { value: e.target.value }, 'sup:' + r.id + ':v')} className="font-body inp" style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: '8px' }} />
                <MiniBtn title="Destacar" onClick={() => patchFila(s.id, r.id, { destacado: !r.destacado })} style={{ color: r.destacado ? '#FCD34D' : undefined }}>★</MiniBtn>
                <MiniBtn title="Quitar fila" onClick={() => patchSup(s.id, { filas: s.filas.filter((x) => x.id !== r.id) })}>✕</MiniBtn>
              </div>
            ) : (
              <SupRow key={r.id} label={r.label} value={r.value} highlight={r.destacado} />
            )
          ))}
          {editMode && (
            <>
              <button onClick={() => patchSup(s.id, { filas: s.filas.concat([{ id: uid(), label: '', value: '', destacado: false }]) })} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 10, padding: '8px', fontSize: 12 }}>➕ Añadir fila</button>
              <button onClick={() => askConfirm({ title: '¿Quitar suplemento?', text: 'Se quitará "' + s.nombre + '".', confirmLabel: 'Quitar', onConfirm: () => setSups((arr) => arr.filter((x) => x.id !== s.id)) })} className="font-body btn btn-danger" style={{ width: '100%', marginTop: 8, fontSize: 12 }}>🗑️ Quitar este suplemento</button>
            </>
          )}
        </Card>
      ))}
      {editMode && (
        <button onClick={() => setSups((arr) => arr.concat([{ id: 'sup_' + uid(), nombre: 'Nuevo suplemento', nota: '', filas: [{ id: uid(), label: 'Dosis', value: '', destacado: false }] }]))} className="font-body btn btn-ghost" style={{ width: '100%', padding: '13px', borderRadius: 14 }}>➕ Añadir suplemento</button>
      )}
    </div>
  );
}

export function OneRMCard() {
  const [peso, setPeso] = useState(null);
  const [reps, setReps] = useState(null);
  const r = calc1RM(peso, reps);
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🏋️ Calculadora de 1RM</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <LabeledNum label="Peso levantado" suffix="kg" value={peso} onChange={setPeso} />
        <LabeledNum label="Repeticiones (1–30)" value={reps} onChange={setReps} />
      </div>
      {r ? (
        <div style={{ marginTop: 12 }} data-testid="rm-resultado">
          <div style={{ textAlign: 'center', padding: '4px 0 10px' }}>
            <div className="font-body" style={{ color: T.muted, fontSize: 12 }}>Tu máximo para 1 repetición (1RM) es aproximadamente</div>
            <div className="font-display" style={{ color: '#FFFFFF', fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>{fmt(r.media) + ' kg'}</div>
            <div className="font-body" style={{ color: T.dim, fontSize: 11.5 }}>{'Entre ' + fmt(r.min) + ' y ' + fmt(r.max) + ' kg según el método de cálculo'}</div>
          </div>
          <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 12.5, margin: '8px 0 4px' }}>Qué peso usar según el porcentaje de tu máximo</div>
          {r.tabla.map((t) => <SupRow key={t.pct} label={t.pct + ' % del máximo (unas ' + t.reps + (t.reps === 1 ? ' repetición)' : ' repeticiones)')} value={fmt(t.kg) + ' kg'} />)}
          <div className="font-body" style={{ color: T.dim, fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>El 1RM es el peso máximo que podrías levantar una sola vez. Se estima a partir de una serie con menos repeticiones y es más fiable con 10 repeticiones o menos. Es la media de dos fórmulas conocidas (Epley y Brzycki).</div>
        </div>
      ) : <div className="font-body" style={{ color: T.dim, fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>Escribe el peso y las repeticiones de una serie (por ejemplo 100 kg × 6) para estimar el máximo que levantarías en una sola repetición.</div>}
    </Card>
  );
}

export function DiscosCard() {
  const [barra, setBarra] = useState(20);
  const [objetivo, setObjetivo] = useState(null);
  const lado = calcDiscos(barra, objetivo);
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🧮 Calculadora de discos</div>
      <Label>Peso de la barra</Label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: barra === 0 ? 6 : 12 }}>
        {[20, 15, 10].map((b) => <Chip key={b} active={barra === b} onClick={() => setBarra(b)}>{b} kg</Chip>)}
        <Chip active={barra === 0} onClick={() => setBarra(0)}>Sin barra (0 kg)</Chip>
      </div>
      {barra === 0 && <div className="font-body" style={{ color: T.dim, fontSize: 11.5, lineHeight: 1.5, marginBottom: 12 }}>Para máquinas: solo cuentan los discos que metas, la máquina no suma peso.</div>}
      <LabeledNum label="Peso total que quieres montar" suffix="kg" value={objetivo} onChange={setObjetivo} />
      {lado && lado.menor && <div className="font-body" style={{ color: '#FDE68A', fontSize: 12, marginTop: 10 }}>El objetivo es menor que la barra.</div>}
      {lado && !lado.menor && (
        <div style={{ marginTop: 12 }} data-testid="discos-resultado">
          <div className="font-body" style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>{barra === 0 ? 'En cada lado (sin contar ninguna barra):' : 'En cada lado de la barra:'}</div>
          {lado.usados.length === 0 ? <div className="font-body" style={{ color: T.text, fontWeight: 700 }}>{barra === 0 ? 'Sin discos' : 'Solo la barra'}</div> : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {lado.usados.map((u) => <span key={u[0]} className="font-body" style={{ ...chipAcento, fontSize: 13, fontWeight: 800, padding: '6px 12px' }}>{u[1] + ' × ' + fmt(u[0], 2) + ' kg'}</span>)}
            </div>
          )}
          {lado.usados.length > 0 && <div className="font-body" style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>Total en discos: <b style={{ color: T.text }}>{fmt(lado.enDiscos, 2) + ' kg'}</b>{barra > 0 ? ' + barra ' + barra + ' kg' : ''}</div>}
          {lado.resto > 0 && <div className="font-body" style={{ color: '#FDE68A', fontSize: 12, marginTop: 8 }}>{'No se puede montar exacto con estos discos: te quedas en ' + fmt(lado.montado, 2) + ' kg (faltan ' + fmt(lado.resto * 2, 2) + ' kg).'}</div>}
        </div>
      )}
    </Card>
  );
}

/* ---------- Glosario de técnicas ---------- */
export const GLOSARIO = [
  ['🔥 Top set', 'La serie más pesada del ejercicio, normalmente la primera tras calentar. Es la que marca tu récord y tu progreso.'],
  ['📐 Back-off', 'Series después del top set con algo menos de peso (un 10–20 % menos) para sumar volumen con buena técnica.'],
  ['⚡ Rest-pause', 'Haces una serie casi al fallo, descansas 10–20 segundos y sacas unas pocas repeticiones más (las "tandas") con el mismo peso.'],
  ['🔻 Dropset', 'Al llegar al fallo bajas el peso (un 20–30 %) sin descansar y sigues. Cada bajada es un "descenso".'],
  ['🌡️ Calentamiento', 'Series ligeras antes del trabajo de verdad. No cuentan como series efectivas ni para el volumen.'],
  ['📊 Series efectivas', 'Las series que cuentan para el músculo: el calentamiento no cuenta; cada tanda o descenso extra suma media serie.'],
  ['🎯 Fallo técnico', 'El punto en el que ya no puedes hacer otra repetición con buena técnica, aunque "a lo bruto" saldría alguna más.'],
  ['🔢 RIR', 'Repeticiones en reserva: cuántas te quedarían antes del fallo. RIR 2 = podrías hacer 2 más.'],
  ['📈 Sobrecarga progresiva', 'Ir subiendo poco a poco el peso, las repeticiones o las series para que el músculo siga mejorando.'],
  ['🔁 Doble progresión', 'Con un peso fijo subes repeticiones hasta el máximo del rango (por ejemplo, 10); entonces subes el peso y vuelves al mínimo (6).'],
  ['💪 1RM', 'El peso máximo que podrías levantar una sola vez. La app lo estima con tus series, sin tener que probarlo.'],
  ['🧘 Semana de descarga', 'Una semana más suave (menos peso o menos series) cada 4–8 semanas para recuperarte y seguir progresando.'],
  ['📦 Volumen', 'Kilos totales levantados: peso × repeticiones de todas las series (sin calentamientos).'],
  ['🔀 Alternos', 'Dos ejercicios que se turnan semana a semana en el mismo hueco de la rutina.'],
];

export function GlosarioCard() {
  const [abierto, setAbierto] = useState(null);
  return (
    <Card style={{ marginBottom: 22, padding: 8 }}>
      {GLOSARIO.map((g, i) => (
        <div key={g[0]} style={{ borderTop: i ? '1px solid rgba(140,170,255,0.12)' : 'none' }}>
          <button onClick={() => setAbierto(abierto === i ? null : i)} className="font-body" style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: T.text, fontWeight: 700, fontSize: 13.5, padding: '10px 6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
            <span>{g[0]}</span><span style={{ color: T.muted, transform: abierto === i ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>
          {abierto === i && <div className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.55, padding: '0 6px 10px' }}>{g[1]}</div>}
        </div>
      ))}
    </Card>
  );
}

export function ExtrasTab() {
  return (
    <div>
      <EditLockBar />
      <SectionTitle emoji="🥗">Calculadora nutricional</SectionTitle>
      <NutricionCard />

      <SectionTitle emoji="🎥">Movilidad</SectionTitle>
      <MovilidadCard />

      <SectionTitle emoji="💊">Suplementación recomendada</SectionTitle>
      <SuplementosSection />

      <SectionTitle emoji="🧰">Calculadoras</SectionTitle>
      <OneRMCard />
      <DiscosCard />

      <SectionTitle emoji="📖">Glosario de técnicas</SectionTitle>
      <GlosarioCard />
    </div>
  );
}
