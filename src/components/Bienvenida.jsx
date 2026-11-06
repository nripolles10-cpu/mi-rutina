import React, { useState } from 'react';
import { Card, Chip, Label, LabeledNum, useGym } from './ui.jsx';
import { T } from '../data/theme.js';
import { pesoActualDe } from '../utils/peso.js';

// Ficha inicial: se muestra mientras la persona no ha puesto su nombre. Solo rellena sus propios datos.
export function Bienvenida() {
  const { state, guardarFormulario } = useGym();
  const f = state.formulario;
  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState(f.sexo || 'M');
  const [alturaCm, setAlturaCm] = useState(f.alturaCm);
  const [pesoKg, setPesoKg] = useState(pesoActualDe(state)); // si ya había un peso guardado, se ve y se puede cambiar
  const listo = nombre.trim().length > 0;

  const empezar = () => {
    if (!listo) return;
    guardarFormulario({ ...f, nombre: nombre.trim(), sexo, alturaCm, pesoInicialKg: pesoKg, objetivoPesoKg: state.peso.objetivoKg });
  };

  return (
    <div role="dialog" aria-label="Crea tu ficha" style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(6,9,19,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.07em', color: '#FFFFFF', marginBottom: 6 }}>MI RUTINA 💪</div>
        <p className="font-body" style={{ color: T.dim, fontSize: 13, marginTop: 0, marginBottom: 14 }}>Crea tu ficha. Tus datos se quedan solo en tu móvil o navegador.</p>
        <Label>Tu nombre</Label>
        <input type="text" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Escribe tu nombre" className="font-body inp" style={{ marginBottom: 12 }} />
        <Label>Sexo</Label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <Chip active={sexo === 'M'} onClick={() => setSexo('M')}>Hombre</Chip>
          <Chip active={sexo === 'F'} onClick={() => setSexo('F')}>Mujer</Chip>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <LabeledNum label="Altura (cm)" value={alturaCm} onChange={setAlturaCm} />
          <LabeledNum label="Peso actual (kg)" value={pesoKg} onChange={setPesoKg} />
        </div>
        <button disabled={!listo} onClick={empezar} className="font-body btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 14 }}>Empezar</button>
        <p className="font-body" style={{ color: T.dim, fontSize: 11, marginBottom: 0, marginTop: 10 }}>Edad, objetivo de peso y lo demás lo puedes cambiar luego en ⚙️ Ajustes.</p>
      </Card>
    </div>
  );
}
