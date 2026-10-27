import React, { useState, useMemo } from 'react';
import { Bar, chipAcento, Card, Chip, Label, LabeledNum, MacroLine, MiniBtn, Modal, NumInput, SectionTitle, Stepper, SupRow, useGym } from '../components/ui.jsx';
import { DIAS_SEMANA, MOMENTOS, OBJETIVOS, TIPO_RECETA, tipoRecetaLabel } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { copyText, toastResult } from '../utils/clipboard.js';
import { listaCompra, macrosFromIngredientes, qtyText, recKcal, recTotals, scaleQty, toggleFavorita } from '../utils/comida.js';
import { addDays, clone, fmt, fmtDateLong, fromYmd, num, stripAcc, uid, ymd } from '../utils/format.js';
import { effNutri, entryTotals, kcalOfMacros } from '../utils/health.js';

/* ---------- Elegir receta (para diario y plan) ---------- */

export function PickRecetaModal({ titulo, tipoInicial, onPick, onClose }) {
  const { state } = useGym();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState(tipoInicial || 'todos');
  const [sel, setSel] = useState(null);
  const [rac, setRac] = useState(1);
  const lista = state.comida.recetas.filter((r) => (tipo === 'todos' || r.tipo === tipo) && stripAcc(r.nombre).toLowerCase().indexOf(stripAcc(q).toLowerCase()) !== -1);
  return (
    <Modal title={titulo} onClose={onClose}>
      {!sel ? (
        <div>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receta…" className="font-body inp" style={{ marginBottom: 10 }} />
          <div className="gt-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
            <Chip active={tipo === 'todos'} onClick={() => setTipo('todos')}>Todas</Chip>
            {TIPO_RECETA.map((t) => <Chip key={t[0]} active={tipo === t[0]} onClick={() => setTipo(t[0])}>{t[1]}</Chip>)}
          </div>
          {lista.length === 0 && <div className="font-body" style={{ color: T.dim, fontSize: 13, textAlign: 'center', padding: 20 }}>No hay recetas con ese filtro.</div>}
          {lista.map((r) => (
            <div key={r.id} onClick={() => { setSel(r); setRac(1); }} className="card" style={{ marginBottom: 8, padding: 12, cursor: 'pointer' }}>
              <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{r.nombre}</div>
              <MacroLine t={recTotals(r, 1)} small />
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{sel.nombre}</div>
          <Label style={{ marginTop: 8 }}>Raciones</Label>
          <Stepper value={rac} onChange={setRac} min={0.5} max={10} step={0.5} />
          <div style={{ marginTop: 10 }}><MacroLine t={recTotals(sel, rac)} /></div>
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13, margin: '14px 0 4px' }}>Ingredientes para {fmt(rac, 2)} {rac === 1 ? 'ración' : 'raciones'}</div>
          {sel.ingredientes.map((x, i) => <SupRow key={i} label={x.n} value={qtyText(scaleQty(x.q, rac), x.u)} />)}
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13, margin: '14px 0 6px' }}>Cómo prepararla</div>
          {sel.pasos.map((p, i) => <div key={i} className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.55, marginBottom: 6, textAlign: 'left' }}><b style={{ color: T.cyan }}>{i + 1}.</b> {p}</div>)}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setSel(null)} className="font-body btn btn-ghost" style={{ flex: 1 }}>Atrás</button>
            <button onClick={() => { onPick(sel, rac); onClose(); }} className="font-body btn btn-primary" style={{ flex: 2 }}>Añadir</button>
          </div>
        </Card>
      )}
    </Modal>
  );
}

/* ---------- Diario ---------- */

export function AddManualModal({ momento, onAdd, onClose }) {
  const [nombre, setNombre] = useState('');
  const [p, setP] = useState(null), [c, setC] = useState(null), [g, setG] = useState(null), [kc, setKc] = useState(null);
  const kcalCalc = kcalOfMacros(p, c, g);
  const kcal = kc !== null ? kc : kcalCalc;
  return (
    <Modal title="Añadir comida a mano" onClose={onClose}>
      <Card>
        <Label>¿Qué has comido?</Label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. Plátano" className="font-body inp" style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <LabeledNum label="Proteína" suffix="g" value={p} onChange={setP} />
          <LabeledNum label="Hidratos" suffix="g" value={c} onChange={setC} />
          <LabeledNum label="Grasas" suffix="g" value={g} onChange={setG} />
        </div>
        <LabeledNum label="Calorías (si lo dejas vacío se calculan)" suffix="kcal" value={kc} onChange={setKc} placeholder={String(kcalCalc)} />
        <button disabled={!nombre.trim() || !kcal} onClick={() => { onAdd({ nombre: nombre.trim(), kcal: kcal, p: num(p), c: num(c), g: num(g) }); onClose(); }} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 16 }}>Añadir</button>
      </Card>
    </Modal>
  );
}

export function DiarioSec({ fecha, setFecha }) {
  const { state, commit, askConfirm } = useGym();
  const { plan } = effNutri(state);
  const lista = state.comida.diario[fecha] || [];
  const tot = entryTotals(lista);
  const [addMomento, setAddMomento] = useState(null);
  const [manual, setManual] = useState(null);
  const hoy = ymd(new Date());

  const addEntry = (momento, e) => commit((prev) => ({ ...prev, comida: { ...prev.comida, diario: { ...prev.comida.diario, [fecha]: (prev.comida.diario[fecha] || []).concat([{ id: uid(), momento, ...e }]) } } }));
  const setRac = (id, r) => commit((prev) => ({ ...prev, comida: { ...prev.comida, diario: { ...prev.comida.diario, [fecha]: (prev.comida.diario[fecha] || []).map((e) => {
    if (e.id !== id || !e.por) return e;
    return { ...e, raciones: r, kcal: e.por.kcal * r, p: e.por.p * r, c: e.por.c * r, g: e.por.g * r };
  }) } } }), { key: 'dia:' + id });
  const del = (id) => commit((prev) => ({ ...prev, comida: { ...prev.comida, diario: { ...prev.comida.diario, [fecha]: (prev.comida.diario[fecha] || []).filter((e) => e.id !== id) } } }));

  const filas = plan.falta ? [] : [
    ['Calorías', tot.kcal, plan.kcal, 'kcal', '#F5F7FF'], ['Proteína', tot.p, plan.protG, 'g', '#22D3EE'], ['Hidratos', tot.c, plan.carbG, 'g', '#A3E635'], ['Grasas', tot.g, plan.fatG, 'g', '#F472B6'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
        <MiniBtn onClick={() => setFecha(ymd(addDays(fromYmd(fecha), -1)))}>‹</MiniBtn>
        <span className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13, minWidth: 170, textAlign: 'center', textTransform: 'capitalize' }}>{fecha === hoy ? 'Hoy · ' : ''}{fmtDateLong(fromYmd(fecha).toISOString())}</span>
        <MiniBtn disabled={fecha >= hoy} onClick={() => setFecha(ymd(addDays(fromYmd(fecha), 1)))}>›</MiniBtn>
      </div>

      <Card style={{ marginBottom: 14 }}>
        {plan.falta ? (
          <div className="font-body" style={{ color: '#FDE68A', fontSize: 12.5, lineHeight: 1.5 }}>Rellena la calculadora nutricional (pestaña Extras) para ver cuánto te falta de tus calorías y macros. Ahora mismo llevas {Math.round(tot.kcal)} kcal.</div>
        ) : filas.map((f) => {
          const resta = f[2] - f[1];
          return (
            <div key={f[0]} style={{ marginBottom: 10 }}>
              <div className="font-body" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: T.text, fontWeight: 700 }}>{f[0]}</span>
                <span style={{ color: T.muted }}>{fmt(f[1], 0)} / {fmt(f[2], 0)} {f[3]} · <b style={{ color: resta >= 0 ? '#A3E635' : '#FB7185' }}>{resta >= 0 ? 'faltan ' + fmt(resta, 0) : 'te pasas ' + fmt(-resta, 0)}</b></span>
              </div>
              <Bar pct={f[2] > 0 ? (f[1] / f[2]) * 100 : 0} color={f[4]} height={9} />
            </div>
          );
        })}
      </Card>

      {MOMENTOS.map((m) => {
        const items = lista.filter((e) => e.momento === m[0]);
        return (
          <Card key={m[0]} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: items.length ? 8 : 0 }}>
              <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5 }}>{m[1]}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setAddMomento(m[0])} className="font-body btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>🍳 Receta</button>
                <button onClick={() => setManual(m[0])} className="font-body btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>✍️ A mano</button>
              </div>
            </div>
            {items.map((e) => (
              <div key={e.id} style={{ padding: '8px 0', borderTop: '1px solid rgba(140,170,255,0.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="font-body" style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{e.nombre}{e.por ? ' × ' + fmt(e.raciones, 2) : ''}</div>
                    <MacroLine t={e} small />
                  </div>
                  <MiniBtn title="Quitar" onClick={() => del(e.id)}>✕</MiniBtn>
                </div>
                {e.por && (
                  <div style={{ marginTop: 6 }}><Stepper value={e.raciones} onChange={(r) => setRac(e.id, r)} min={0.5} max={10} step={0.5} suffix="rac." /></div>
                )}
              </div>
            ))}
          </Card>
        );
      })}
      {lista.length > 0 && (
        <button onClick={() => askConfirm({ title: '¿Vaciar el día?', text: 'Se quitarán todas las comidas de este día.', confirmLabel: 'Vaciar', onConfirm: () => commit((prev) => { const d = { ...prev.comida.diario }; delete d[fecha]; return { ...prev, comida: { ...prev.comida, diario: d } }; }) })} className="font-body btn btn-danger" style={{ width: '100%', fontSize: 12.5 }}>🗑️ Vaciar este día</button>
      )}
      {addMomento && <PickRecetaModal titulo={'Añadir al diario · ' + addMomento} tipoInicial={addMomento}
        onPick={(r, rac) => addEntry(addMomento, { nombre: r.nombre, recetaId: r.id, raciones: rac, por: recTotals(r, 1), ...recTotals(r, rac) })} onClose={() => setAddMomento(null)} />}
      {manual && <AddManualModal momento={manual} onAdd={(e) => addEntry(manual, e)} onClose={() => setManual(null)} />}
    </div>
  );
}

/* ---------- Recetas ---------- */

export function RecetaEditor({ receta, onClose }) {
  const { commit } = useGym();
  const nueva = !receta;
  const [r, setR] = useState(() => receta ? clone(receta) : { id: 'r_' + uid(), nombre: '', tipo: 'comida', objetivos: ['mantenimiento'], p: 0, c: 0, g: 0, ingredientes: [{ n: '', q: null, u: 'g' }], pasos: [], propia: true });
  const [pasosTxt, setPasosTxt] = useState((r.pasos || []).join('\n'));
  const upd = (patch) => setR({ ...r, ...patch });
  const setIng = (i, patch) => upd({ ingredientes: r.ingredientes.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
  const toggleObj = (o) => upd({ objetivos: r.objetivos.indexOf(o) === -1 ? r.objetivos.concat([o]) : r.objetivos.filter((x) => x !== o) });
  const calc = macrosFromIngredientes(r.ingredientes);
  const conocidos = r.ingredientes.filter((x) => x.n.trim()).length - calc.desconocidos.length;
  const guardar = () => {
    const fin = { ...r, nombre: r.nombre.trim(), ingredientes: r.ingredientes.filter((x) => x.n.trim()), pasos: pasosTxt.split('\n').map((s) => s.trim()).filter(Boolean) };
    // Una receta de serie que modificas deja de garantizar que sus macros salen de las cantidades exactas
    if (!nueva && !fin.propia && JSON.stringify([fin.p, fin.c, fin.g, fin.ingredientes]) !== JSON.stringify([receta.p, receta.c, receta.g, receta.ingredientes])) fin.editada = true;
    commit((prev) => ({ ...prev, comida: { ...prev.comida, recetas: nueva ? prev.comida.recetas.concat([fin]) : prev.comida.recetas.map((x) => (x.id === fin.id ? fin : x)) } }));
    onClose();
  };
  return (
    <Modal title={nueva ? 'Nueva receta' : 'Editar receta'} onClose={onClose}>
      <Card>
        <Label>Nombre</Label>
        <input type="text" value={r.nombre} onChange={(e) => upd({ nombre: e.target.value })} className="font-body inp" style={{ marginBottom: 12 }} />
        <Label>Tipo</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{TIPO_RECETA.map((t) => <Chip key={t[0]} active={r.tipo === t[0]} onClick={() => upd({ tipo: t[0] })}>{t[1]}</Chip>)}</div>
        <Label>Objetivos para los que encaja</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{Object.keys(OBJETIVOS).map((o) => <Chip key={o} active={r.objetivos.indexOf(o) !== -1} accent={OBJETIVOS[o].color} onClick={() => toggleObj(o)}>{OBJETIVOS[o].label}</Chip>)}</div>
        <Label>Por ración</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <LabeledNum label="Proteína" suffix="g" value={r.p} onChange={(v) => upd({ p: v === null ? 0 : v })} />
          <LabeledNum label="Hidratos" suffix="g" value={r.c} onChange={(v) => upd({ c: v === null ? 0 : v })} />
          <LabeledNum label="Grasas" suffix="g" value={r.g} onChange={(v) => upd({ g: v === null ? 0 : v })} />
        </div>
        <div className="font-body" style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>Calorías por ración (se calculan): <b style={{ color: T.text }}>{kcalOfMacros(r.p, r.c, r.g) + ' kcal'}</b></div>
        <button disabled={conocidos <= 0} onClick={() => upd({ p: calc.p, c: calc.c, g: calc.g })} className="font-body btn btn-ghost" style={{ width: '100%', padding: '8px', fontSize: 12, marginBottom: 6 }}>🧮 Calcular macros con los ingredientes</button>
        {calc.desconocidos.length > 0 && <div className="font-body" style={{ color: T.dim, fontSize: 11, lineHeight: 1.5, marginBottom: 12 }}>{'No están en la tabla de alimentos (no cuentan en el cálculo): ' + calc.desconocidos.join(', ') + '.'}</div>}
        {calc.desconocidos.length === 0 && <div style={{ marginBottom: 12 }} />}
        <Label>Ingredientes (cantidad por ración)</Label>
        {r.ingredientes.map((x, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input type="text" value={x.n} placeholder="Ingrediente" onChange={(e) => setIng(i, { n: e.target.value })} className="font-body inp" style={{ flex: 2, minWidth: 0, fontSize: 12.5, padding: '8px' }} />
            <NumInput value={x.q} placeholder="cant." onChange={(v) => setIng(i, { q: v })} className="font-body inp" style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: '8px' }} />
            <input type="text" value={x.u} placeholder="ud." onChange={(e) => setIng(i, { u: e.target.value })} className="font-body inp" style={{ flex: 0.8, minWidth: 0, fontSize: 12.5, padding: '8px' }} />
            <MiniBtn onClick={() => upd({ ingredientes: r.ingredientes.filter((_, k) => k !== i) })}>✕</MiniBtn>
          </div>
        ))}
        <button onClick={() => upd({ ingredientes: r.ingredientes.concat([{ n: '', q: null, u: 'g' }]) })} className="font-body btn btn-ghost" style={{ width: '100%', padding: '8px', fontSize: 12, marginBottom: 12 }}>➕ Añadir ingrediente</button>
        <Label>Pasos (uno por línea)</Label>
        <textarea value={pasosTxt} onChange={(e) => setPasosTxt(e.target.value)} rows={5} className="font-body inp" style={{ fontSize: 13, lineHeight: 1.5 }} />
        <button disabled={!r.nombre.trim()} onClick={guardar} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 16 }}>Guardar receta</button>
      </Card>
    </Modal>
  );
}

export function RecetaDetalle({ receta, onClose, onEdit }) {
  const { state, commit, askConfirm, showToast } = useGym();
  const [rac, setRac] = useState(1);
  const [destino, setDestino] = useState(null); // 'diario' | 'plan'
  const [momento, setMomento] = useState(receta.tipo);
  const [fecha, setFecha] = useState(ymd(new Date()));
  const [dia, setDia] = useState(((new Date().getDay() + 6) % 7));
  const t = recTotals(receta, rac);

  const aDiario = () => {
    commit((prev) => ({ ...prev, comida: { ...prev.comida, diario: { ...prev.comida.diario, [fecha]: (prev.comida.diario[fecha] || []).concat([{ id: uid(), momento, nombre: receta.nombre, recetaId: receta.id, raciones: rac, por: recTotals(receta, 1), ...t }]) } } }));
    showToast('Añadido al diario ✓'); setDestino(null);
  };
  const aPlan = () => {
    commit((prev) => {
      const plan = { ...prev.comida.plan };
      const d = { desayuno: [], comida: [], cena: [], snack: [], ...(plan[dia] || {}) };
      d[momento] = d[momento].concat([{ id: uid(), recetaId: receta.id, raciones: rac }]);
      plan[dia] = d;
      return { ...prev, comida: { ...prev.comida, plan } };
    });
    showToast('Añadido al planificador ✓'); setDestino(null);
  };

  return (
    <Modal title="Receta" onClose={onClose}>
      <Card style={{ marginBottom: 12 }}>
        <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 17 }}>{receta.nombre}</div>
        <div className="font-body" style={{ color: T.muted, fontSize: 12, margin: '4px 0 8px' }}>{tipoRecetaLabel(receta.tipo)} · {receta.objetivos.map((o) => OBJETIVOS[o] ? OBJETIVOS[o].label : o).join(', ') || 'sin objetivo'}</div>
        <Label>Raciones</Label>
        <Stepper value={rac} onChange={setRac} min={0.5} max={10} step={0.5} />
        <div style={{ marginTop: 10 }}><MacroLine t={t} /></div>
        <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 4 }}>Por ración: {recKcal(receta)} kcal · P {receta.p} · C {receta.c} · G {receta.g}</div>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>Ingredientes</div>
        {receta.ingredientes.map((x, i) => <SupRow key={i} label={x.n} value={qtyText(scaleQty(x.q, rac), x.u)} />)}
        {!receta.propia && !receta.editada && <div className="font-body" style={{ color: T.dim, fontSize: 11, lineHeight: 1.5, marginTop: 6 }}>Las calorías y los macros están calculados con estas cantidades exactas ({fmt(rac, 2)} {rac === 1 ? 'ración' : 'raciones'}). Los pesos de arroz, pasta, avena y legumbres son en crudo o en seco.</div>}
        <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5, margin: '14px 0 6px' }}>Preparación</div>
        {receta.pasos.length === 0 && <div className="font-body" style={{ color: T.dim, fontSize: 12 }}>Sin pasos escritos.</div>}
        {receta.pasos.map((p, i) => <div key={i} className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.55, marginBottom: 6 }}><b style={{ color: T.cyan }}>{i + 1}.</b> {p}</div>)}
      </Card>

      {!destino ? (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setDestino('diario')} className="font-body btn btn-primary" style={{ flex: 1 }}>📓 Al diario</button>
            <button onClick={() => setDestino('plan')} className="font-body btn btn-primary" style={{ flex: 1 }}>📅 Al planificador</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => toggleFavorita(commit, receta.id)} className="font-body btn btn-ghost" style={{ flex: 1, color: (state.comida.favoritos || []).indexOf(receta.id) !== -1 ? '#FBBF24' : undefined }}>{(state.comida.favoritos || []).indexOf(receta.id) !== -1 ? '★ Favorita' : '☆ Favorita'}</button>
            <button onClick={onEdit} className="font-body btn btn-ghost" style={{ flex: 1 }}>✏️ Editar</button>
            <button onClick={() => askConfirm({ title: '¿Borrar receta?', text: '"' + receta.nombre + '" se borrará de tus recetas.', confirmLabel: 'Borrar', onConfirm: () => { commit((prev) => ({ ...prev, comida: { ...prev.comida, recetas: prev.comida.recetas.filter((x) => x.id !== receta.id), favoritos: (prev.comida.favoritos || []).filter((x) => x !== receta.id) } })); onClose(); } })} className="font-body btn btn-danger" style={{ flex: 1 }}>🗑️ Borrar</button>
          </div>
        </div>
      ) : (
        <Card>
          <Label>Momento</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{MOMENTOS.map((m) => <Chip key={m[0]} active={momento === m[0]} onClick={() => setMomento(m[0])}>{m[1]}</Chip>)}</div>
          {destino === 'diario' ? (
            <>
              <Label>Día</Label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="font-body inp" />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button onClick={() => setDestino(null)} className="font-body btn btn-ghost" style={{ flex: 1 }}>Atrás</button><button onClick={aDiario} className="font-body btn btn-primary" style={{ flex: 2 }}>Añadir al diario</button></div>
            </>
          ) : (
            <>
              <Label>Día de la semana</Label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{DIAS_SEMANA.map((d, i) => <Chip key={d} active={dia === i} onClick={() => setDia(i)} style={{ padding: '6px 10px', fontSize: 12 }}>{d.slice(0, 3)}</Chip>)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button onClick={() => setDestino(null)} className="font-body btn btn-ghost" style={{ flex: 1 }}>Atrás</button><button onClick={aPlan} className="font-body btn btn-primary" style={{ flex: 2 }}>Añadir al planificador</button></div>
            </>
          )}
        </Card>
      )}
    </Modal>
  );
}

export function RecetasSec() {
  const { state, commit } = useGym();
  const [soloFav, setSoloFav] = useState(false);
  const favs = state.comida.favoritos || [];
  const [obj, setObj] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [q, setQ] = useState('');
  const [det, setDet] = useState(null);
  const [edit, setEdit] = useState(null); // null | 'nueva' | receta
  const lista = state.comida.recetas.filter((r) => (obj === 'todos' || r.objetivos.indexOf(obj) !== -1) && (tipo === 'todos' || r.tipo === tipo) && (!soloFav || favs.indexOf(r.id) !== -1)
    && stripAcc(r.nombre).toLowerCase().indexOf(stripAcc(q).toLowerCase()) !== -1);
  const detR = det ? state.comida.recetas.find((r) => r.id === det) : null;

  return (
    <div>
      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receta…" className="font-body inp" style={{ marginBottom: 10 }} />
      <div className="gt-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, paddingBottom: 4 }}>
        <Chip active={obj === 'todos'} onClick={() => setObj('todos')}>Todos los objetivos</Chip>
        {Object.keys(OBJETIVOS).map((o) => <Chip key={o} active={obj === o} accent={OBJETIVOS[o].color} onClick={() => setObj(o)}>{OBJETIVOS[o].emoji} {OBJETIVOS[o].label}</Chip>)}
      </div>
      <div className="gt-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        <Chip active={tipo === 'todos'} onClick={() => setTipo('todos')}>Todas</Chip>
        {TIPO_RECETA.map((t) => <Chip key={t[0]} active={tipo === t[0]} onClick={() => setTipo(t[0])}>{t[1]}</Chip>)}
        <Chip active={soloFav} accent="#FBBF24" onClick={() => setSoloFav(!soloFav)}>⭐ Favoritas</Chip>
      </div>
      <button onClick={() => setEdit('nueva')} className="font-body btn btn-ghost" style={{ width: '100%', padding: '12px', borderRadius: 14, marginBottom: 12 }}>➕ Crear mi receta</button>
      <div className="font-body" style={{ color: T.dim, fontSize: 11.5, marginBottom: 8, lineHeight: 1.5 }}>{lista.length} recetas · toca una para ver los ingredientes con sus cantidades exactas y los pasos para cocinarla.</div>
      {lista.map((r) => (
        <div key={r.id} onClick={() => setDet(r.id)} className="card" style={{ marginBottom: 8, padding: 12, cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{r.nombre}</div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span className="font-body" style={chipAcento()}>{tipoRecetaLabel(r.tipo)}</span>
              <MiniBtn title="Favorita" onClick={(e) => { e.stopPropagation(); toggleFavorita(commit, r.id); }} style={{ color: favs.indexOf(r.id) !== -1 ? '#FBBF24' : undefined }}>{favs.indexOf(r.id) !== -1 ? '★' : '☆'}</MiniBtn>
            </span>
          </div>
          <div style={{ marginTop: 4 }}><MacroLine t={recTotals(r, 1)} small /></div>
          <div className="font-body" style={{ color: T.dim, fontSize: 10.5, marginTop: 3 }}>{r.objetivos.map((o) => OBJETIVOS[o] ? OBJETIVOS[o].label : o).join(' · ')}{r.propia ? ' · ✍️ mía' : ''} · {r.ingredientes.length} ingredientes · {r.pasos.length} pasos</div>
        </div>
      ))}
      {detR && !edit && <RecetaDetalle receta={detR} onClose={() => setDet(null)} onEdit={() => setEdit(detR)} />}
      {edit && <RecetaEditor receta={edit === 'nueva' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

/* ---------- Planificador semanal ---------- */

export function PlanSec() {
  const { state, commit, showToast } = useGym();
  const { plan: obj } = effNutri(state);
  const [pick, setPick] = useState(null); // {dia, momento}
  const rec = (id) => state.comida.recetas.find((r) => r.id === id);
  const diaPlan = (i) => ({ desayuno: [], comida: [], cena: [], snack: [], ...(state.comida.plan[i] || {}) });
  const totDia = (i) => { const d = diaPlan(i); let t = { kcal: 0, p: 0, c: 0, g: 0 }; MOMENTOS.forEach((m) => d[m[0]].forEach((it) => { const r = rec(it.recetaId); if (r) { const x = recTotals(r, it.raciones); t = { kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, g: t.g + x.g }; } })); return t; };
  const add = (dia, momento, r, rac) => commit((prev) => { const plan = { ...prev.comida.plan }; const d = { ...diaPlan(dia) }; d[momento] = d[momento].concat([{ id: uid(), recetaId: r.id, raciones: rac }]); plan[dia] = d; return { ...prev, comida: { ...prev.comida, plan } }; });
  const del = (dia, momento, id) => commit((prev) => { const plan = { ...prev.comida.plan }; const d = { ...diaPlan(dia) }; d[momento] = d[momento].filter((x) => x.id !== id); plan[dia] = d; return { ...prev, comida: { ...prev.comida, plan } }; });
  const aDiario = (i) => {
    const hoy = ymd(new Date()); const d = diaPlan(i); const nuevos = [];
    MOMENTOS.forEach((m) => d[m[0]].forEach((it) => { const r = rec(it.recetaId); if (r) nuevos.push({ id: uid(), momento: m[0], nombre: r.nombre, recetaId: r.id, raciones: it.raciones, por: recTotals(r, 1), ...recTotals(r, it.raciones) }); }));
    if (!nuevos.length) { showToast('Ese día no tiene comidas planificadas', 'warn'); return; }
    commit((prev) => ({ ...prev, comida: { ...prev.comida, diario: { ...prev.comida.diario, [hoy]: (prev.comida.diario[hoy] || []).concat(nuevos) } } }));
    showToast('Añadido al diario de hoy ✓');
  };

  return (
    <div>
      <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>Planifica una semana tipo. Con ella se genera la lista de la compra.</div>
      {DIAS_SEMANA.map((nombre, i) => {
        const d = diaPlan(i); const t = totDia(i);
        const hay = MOMENTOS.some((m) => d[m[0]].length);
        return (
          <Card key={nombre} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>{nombre}</div>
              {hay && <MacroLine t={t} small />}
            </div>
            {hay && !obj.falta && <div className="font-body" style={{ color: T.dim, fontSize: 11, marginBottom: 6 }}>Objetivo {obj.kcal} kcal · {t.kcal - obj.kcal >= 0 ? 'te pasas ' + Math.round(t.kcal - obj.kcal) : 'faltan ' + Math.round(obj.kcal - t.kcal)} kcal</div>}
            {MOMENTOS.map((m) => (
              <div key={m[0]} style={{ borderTop: '1px solid rgba(140,170,255,0.12)', padding: '7px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-body" style={{ color: T.muted, fontSize: 12 }}>{m[1]}</span>
                  <MiniBtn title="Añadir" onClick={() => setPick({ dia: i, momento: m[0] })}>+</MiniBtn>
                </div>
                {d[m[0]].map((it) => {
                  const r = rec(it.recetaId);
                  return (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <div className="font-body" style={{ color: r ? T.text : T.dim, fontSize: 12.5, minWidth: 0 }}>{r ? r.nombre : 'Receta eliminada'} × {fmt(it.raciones, 2)}</div>
                      <MiniBtn title="Quitar" onClick={() => del(i, m[0], it.id)}>✕</MiniBtn>
                    </div>
                  );
                })}
              </div>
            ))}
            {hay && <button onClick={() => aDiario(i)} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: 12 }}>📓 Pasar este día al diario de hoy</button>}
          </Card>
        );
      })}
      {pick && <PickRecetaModal titulo={DIAS_SEMANA[pick.dia] + ' · ' + pick.momento} tipoInicial={pick.momento} onPick={(r, rac) => add(pick.dia, pick.momento, r, rac)} onClose={() => setPick(null)} />}
    </div>
  );
}

export function CompraSec() {
  const { state, commit, showToast } = useGym();
  const items = useMemo(() => listaCompra(state), [state.comida.plan, state.comida.recetas]);
  const marcados = state.comida.compra || {};
  const toggle = (key) => commit((prev) => ({ ...prev, comida: { ...prev.comida, compra: { ...prev.comida.compra, [key]: !prev.comida.compra[key] } } }), { noUndo: true });
  const texto = () => 'Lista de la compra\n' + items.filter((x) => !marcados[x.key]).map((x) => '• ' + x.nombre + ' — ' + (x.q ? fmt(x.q, 1) + ' ' + (x.u || '') : x.u || '')).join('\n');
  const pendientes = items.filter((x) => !marcados[x.key]).length;

  if (!items.length) return <Card><div className="font-body" style={{ color: T.muted, fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>Todavía no hay nada planificado. Añade recetas en el planificador y aquí aparecerá la lista de la compra.</div></Card>;
  return (
    <div>
      <div className="font-body" style={{ color: T.muted, fontSize: 12, marginBottom: 10 }}>{pendientes} por comprar de {items.length}</div>
      <Card style={{ marginBottom: 12 }}>
        {items.map((x) => (
          <div key={x.key} onClick={() => toggle(x.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid rgba(140,170,255,0.1)', cursor: 'pointer' }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, border: '2px solid ' + (marcados[x.key] ? '#A3E635' : 'rgba(140,170,255,0.5)'), background: marcados[x.key] ? '#A3E635' : 'transparent', color: '#04101C', fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{marcados[x.key] ? '✓' : ''}</span>
            <span className="font-body" style={{ flex: 1, color: marcados[x.key] ? T.dim : T.text, fontSize: 13.5, textDecoration: marcados[x.key] ? 'line-through' : 'none' }}>{x.nombre}</span>
            <span className="font-body" style={{ color: T.muted, fontSize: 12.5, fontWeight: 700 }}>{x.q ? fmt(x.q, 1) + ' ' + (x.u || '') : x.u}</span>
          </div>
        ))}
      </Card>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => commit((prev) => ({ ...prev, comida: { ...prev.comida, compra: {} } }), { noUndo: true })} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>Limpiar marcas</button>
        <button onClick={async () => { if (!(await Native.share({ title: 'Lista de la compra', text: texto(), filename: 'lista_compra.txt', mime: 'text/plain;charset=utf-8' }))) { toastResult(showToast, copyText(texto()), 'Lista copiada ✓', 'No se pudo compartir'); } }} className="font-body btn btn-primary" style={{ flex: 1, fontSize: 12.5 }}>📤 Compartir lista</button>
      </div>
    </div>
  );
}

/* ---------- Agua (en litros; una botella de 1 L = 1) ---------- */

export function AguaSec() {
  const { state, commit } = useGym();
  const ag = state.comida.agua;
  const hoy = ymd(new Date());
  const n = ag.dias[hoy] || 0;
  const r2 = (v) => Math.round(v * 100) / 100;
  const set = (v) => commit((prev) => ({ ...prev, comida: { ...prev.comida, agua: { ...prev.comida.agua, dias: { ...prev.comida.agua.dias, [hoy]: Math.max(0, r2(v)) } } } }), { key: 'agua' });
  const meta = (v) => commit((prev) => ({ ...prev, comida: { ...prev.comida, agua: { ...prev.comida.agua, objetivo: v } } }));
  const ult = [];
  for (let i = 6; i >= 0; i--) { const k = ymd(addDays(new Date(), -i)); ult.push({ k, v: ag.dias[k] || 0 }); }
  const maxV = Math.max(ag.objetivo, ...ult.map((u) => u.v), 1);
  const botellas = Math.min(12, Math.max(Math.ceil(ag.objetivo), Math.ceil(n)));
  return (
    <div>
      <Card style={{ marginBottom: 14, textAlign: 'center' }}>
        <div className="font-body" style={{ color: T.dim, fontSize: 11.5 }}>Hoy</div>
        <div className="font-display" style={{ color: n >= ag.objetivo ? '#A3E635' : '#FFFFFF', fontSize: 46, fontWeight: 700, lineHeight: 1.05 }}>{fmt(n, 2)} / {fmt(ag.objetivo, 2)} L</div>
        <div className="font-body" style={{ color: T.muted, fontSize: 12, marginBottom: 12 }}>
          {fmt(n, 2)} {n === 1 ? 'botella' : 'botellas'} de 1 L {n >= ag.objetivo ? '· ¡objetivo cumplido! 💧' : '· te faltan ' + fmt(Math.max(0, r2(ag.objetivo - n)), 2) + ' L'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
          {Array.from({ length: botellas }).map((_, i) => {
            const nivel = Math.max(0, Math.min(1, n - i));
            return (
              <span key={i} onClick={() => set(nivel >= 1 ? i : i + 1)} title={'Botella ' + (i + 1)} style={{ position: 'relative', width: 44, height: 62, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: '1.5px solid ' + (nivel > 0 ? T.cyan : 'rgba(140,170,255,0.35)'), background: 'rgba(255,255,255,0.05)' }}>
                <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: nivel * 100 + '%', background: 'linear-gradient(180deg, rgba(var(--ac-rgb),0.55), rgba(56,189,248,0.85))' }} />
                <span className="font-body" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>{i + 1} L</span>
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={n <= 0} onClick={() => set(n - 0.5)} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>➖ 0,5 L</button>
          <button onClick={() => set(n + 0.5)} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>➕ 0,5 L</button>
          <button onClick={() => set(n + 1)} className="font-body btn btn-primary" style={{ flex: 1.4, fontSize: 12.5 }}>🍼 +1 L (botella)</button>
        </div>
        <div style={{ marginTop: 12, textAlign: 'left' }}>
          <LabeledNum label="Corregir el total de hoy (litros, por ejemplo 2,5)" suffix="L" value={n} onChange={(v) => set(v === null ? 0 : v)} />
        </div>
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <Label>Objetivo diario (litros)</Label>
        <Stepper value={ag.objetivo} onChange={meta} min={1} max={10} step={0.5} suffix="L" />
      </Card>
      <Card>
        <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Últimos 7 días (litros)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 96 }}>
          {ult.map((u) => (
            <div key={u.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div className="font-body" style={{ color: T.dim, fontSize: 10, marginBottom: 2 }}>{u.v ? fmt(u.v, 1) : ''}</div>
              <div style={{ width: '100%', height: Math.max(3, (u.v / maxV) * 60) + 'px', borderRadius: 6, background: u.v >= ag.objetivo ? '#A3E635' : u.v ? 'linear-gradient(180deg, #22D3EE, #818CF8)' : 'rgba(255,255,255,0.08)' }} />
              <div className="font-body" style={{ color: T.dim, fontSize: 10, marginTop: 3 }}>{DIAS_SEMANA[(fromYmd(u.k).getDay() + 6) % 7].slice(0, 1)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Pestaña ---------- */

export function ComidaTab() {
  const [sec, setSec] = useState('diario');
  const [fecha, setFecha] = useState(ymd(new Date()));
  const secs = [['diario', '📓 Diario'], ['recetas', '🍳 Recetas'], ['plan', '📅 Plan'], ['compra', '🛒 Compra'], ['agua', '💧 Agua']];
  return (
    <div>
      <SectionTitle emoji="🍽️">Comida</SectionTitle>
      <div className="gt-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {secs.map((s) => <Chip key={s[0]} active={sec === s[0]} onClick={() => setSec(s[0])}>{s[1]}</Chip>)}
      </div>
      {sec === 'diario' && <DiarioSec fecha={fecha} setFecha={setFecha} />}
      {sec === 'recetas' && <RecetasSec />}
      {sec === 'plan' && <PlanSec />}
      {sec === 'compra' && <CompraSec />}
      {sec === 'agua' && <AguaSec />}
    </div>
  );
}
