import React, { useState } from 'react';
import { useGym } from './ui.jsx';
import { T } from '../data/theme.js';
import { Native, esIOS } from '../native/index.js';
import { CodeModal } from '../tabs/Ajustes.jsx';
import { DIAS_POSPONER, necesitaRecordatorioCopia } from '../utils/copias.js';

// Aviso visible (solo en la versión web) para hacer la copia de seguridad por código
export function AvisoCopiaWeb() {
  const { state, setPreferencia } = useGym();
  const [abierto, setAbierto] = useState(false);
  if (Native.isNative()) return null;
  const mostrar = necesitaRecordatorioCopia(state);
  if (!mostrar && !abierto) return null;
  return (
    <>
      {abierto && <CodeModal modo="backup" onClose={() => setAbierto(false)} />}
      {mostrar && (
        <div data-testid="aviso-copia" className="font-body" style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 14, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.4)' }}>
          <div style={{ color: '#FDE68A', fontSize: 12.5, lineHeight: 1.5 }}>
            💾 {esIOS() ? 'En iPhone, Safari puede borrar los datos de las webs que no se usan.' : 'Tus datos están solo en este navegador.'} Haz una copia de seguridad y guárdala fuera (correo, notas, Drive…).
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setAbierto(true)} className="font-body btn btn-primary" style={{ flex: 2, fontSize: 12.5, padding: '8px 10px' }}>Hacer copia ahora</button>
            <button onClick={() => setPreferencia({ avisoCopiaHasta: new Date(Date.now() + DIAS_POSPONER * 86400000).toISOString() })} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5, padding: '8px 10px', color: T.muted }}>Más tarde</button>
          </div>
        </div>
      )}
    </>
  );
}
