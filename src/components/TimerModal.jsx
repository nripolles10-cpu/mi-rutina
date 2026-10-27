import React, { useState } from 'react';
import { Bar, Card, LabeledNum, Modal } from '../components/ui.jsx';
import { T } from '../data/theme.js';
import { fmtMS } from '../utils/format.js';
import { esIOS, isNative } from '../native/index.js';

// Texto que explica si el aviso con la pantalla bloqueada está programado de verdad
function avisoTexto(timer) {
  if (!isNative() && esIOS()) return 'En iPhone el aviso solo suena con la app abierta y en primer plano (iOS no deja programar avisos a una web, y tampoco vibra). Deja la pantalla encendida durante el descanso.';
  if (!isNative()) return 'En el navegador solo vibra y suena con la app abierta; el aviso con la pantalla apagada funciona en la app instalada.';
  if (!timer) return 'Al empezar se programa un aviso que suena aunque bloquees la pantalla o cierres la app.';
  const n = timer.notif;
  if (!n) return 'Programando el aviso…';
  if (n.ok && n.exacto === 'denied') return 'Aviso programado, pero Android puede retrasarlo unos segundos o minutos porque la app no tiene permiso de "alarmas exactas". Mira Ajustes → Avisos del descanso.';
  if (n.ok) return 'Aviso programado: sonará aunque apagues la pantalla o cierres la app.';
  if (n.motivo === 'permiso') return 'Sin permiso de notificaciones: solo avisará con la app abierta. Actívalo en Ajustes del móvil → Apps → Mi Rutina → Notificaciones.';
  return 'No se pudo programar el aviso: solo avisará con la app abierta.';
}

export function TimerModal({ timer, nowMs, startTimer, addTimer, stopTimer, onClose }) {
  const presets = [30, 45, 60, 90, 120, 180, 300];
  const [custom, setCustom] = useState(null);
  const resta = timer ? timer.end - nowMs : 0;
  const etiqueta = (s) => (s < 60 ? s + ' s' : s % 60 === 0 ? s / 60 + ' min' : Math.floor(s / 60) + ' min ' + (s % 60) + ' s');
  return (
    <Modal title="⏱️ Descanso entre series" onClose={onClose}>
      <Card style={{ textAlign: 'center' }}>
        {timer ? (
          <div>
            <div className="font-display" style={{ color: '#FFFFFF', fontSize: 76, fontWeight: 700, lineHeight: 1 }}>{fmtMS(resta)}</div>
            <div style={{ margin: '12px 0' }}><Bar pct={(resta / (timer.total * 1000)) * 100} color={T.cyan} height={12} /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => addTimer(-15)} className="font-body btn btn-ghost" style={{ flex: 1 }}>−15 s</button>
              <button onClick={() => addTimer(15)} className="font-body btn btn-ghost" style={{ flex: 1 }}>+15 s</button>
              <button onClick={stopTimer} className="font-body btn btn-danger" style={{ flex: 1 }}>Parar</button>
            </div>
            <button onClick={onClose} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 12 }}>Seguir entrenando (sigue contando)</button>
          </div>
        ) : (
          <div>
            <div className="font-body" style={{ color: T.muted, fontSize: 12.5, marginBottom: 12 }}>Elige cuánto vas a descansar y toca para empezar:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {presets.map((s) => (
                <button key={s} onClick={() => startTimer(s)} className="font-body btn btn-primary" style={{ fontSize: 14, padding: '14px 4px' }}>{etiqueta(s)}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 14 }}>
              <LabeledNum label="Otro tiempo (segundos, de 10 a 600)" suffix="s" value={custom} onChange={setCustom} />
              <button disabled={!custom || custom < 10 || custom > 600} onClick={() => startTimer(Math.round(custom))} className="font-body btn btn-primary" style={{ flexShrink: 0 }}>Empezar</button>
            </div>
          </div>
        )}
        <div className="font-body" style={{ color: T.dim, fontSize: 11, lineHeight: 1.5, marginTop: 16, textAlign: 'left' }} data-testid="timer-aviso">
          {avisoTexto(timer)}
          {' '}El tiempo se calcula con la hora real, así que no se descuadra.
        </div>
      </Card>
    </Modal>
  );
}
