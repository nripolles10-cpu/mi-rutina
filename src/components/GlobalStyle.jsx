import React from 'react';

export function GlobalStyle() {
  return (
    <style>{`
      :root {
        --muted: #A9B3CC; --dim: #6F7A96;
        /* Áreas seguras (notch y barra de gestos). En Android, Capacitor rellena --safe-area-inset-*; en el navegador se usa env() */
        --safe-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
        --safe-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
        --kb-pad: 0px;
        /* Color de acento (Ajustes → Apariencia) */
        --ac: #22D3EE; --ac2: #818CF8; --ac-claro: #7DE9FA; --ac-rgb: 34,211,238;
      }
      /* Pestaña Rutina: el texto secundario gris pasa a blanco / casi blanco para leerse mejor */
      .rutina-scope { --muted: #F1F4FC; --dim: #DCE2F2; }
      .rutina-scope .lbl { color: #F1F4FC; }
      .rutina-scope .inp::placeholder { color: #C3CBE3; }
      html, body, #root { background:#060913; margin:0; height:100%; }
      * { -webkit-tap-highlight-color: transparent; }
      .font-display { font-family: 'Rajdhani', 'Bahnschrift', 'Arial Narrow', 'Roboto Condensed', sans-serif; }
      .font-body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; }
      .gt-scroll::-webkit-scrollbar { display: none; }
      input, textarea, select, button { outline: none; font-family: inherit; }
      button:focus-visible, select:focus-visible { outline: 2px solid var(--ac); outline-offset: 2px; }
      input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
      input[type=date] { color-scheme: dark; min-height: 38px; }

      .bg-grid {
        background-image:
          radial-gradient(60% 38% at 8% 0%, rgba(var(--ac-rgb),0.17), transparent 70%),
          radial-gradient(55% 38% at 100% 100%, rgba(167,139,250,0.18), transparent 70%),
          linear-gradient(rgba(140,170,255,0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(140,170,255,0.045) 1px, transparent 1px);
        background-size: auto, auto, 30px 30px, 30px 30px;
      }
      .card {
        position: relative; box-sizing: border-box;
        background: rgba(12,18,34,0.74);
        border: 1px solid rgba(140,170,255,0.17);
        border-radius: 18px; padding: 14px;
        -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 28px rgba(0,0,0,0.32);
      }
      .lbl { color: var(--muted); font-size:11.5px; font-weight:700; margin-bottom:6px; letter-spacing:0.02em; }
      .inp {
        width:100%; box-sizing:border-box;
        background: rgba(7,11,22,0.92); border:1px solid rgba(140,170,255,0.28); border-radius:10px;
        color:#F5F7FF; font-size:14px; padding:9px 10px;
        transition: border-color .15s, box-shadow .15s;
      }
      .inp:focus { border-color:var(--ac); box-shadow:0 0 0 3px rgba(var(--ac-rgb),0.18); }
      .inp::placeholder { color:#6F7A96; }
      .btn {
        font-weight:800; font-size:13px; border-radius:12px; padding:11px 14px; cursor:pointer;
        border:1px solid transparent; transition: transform .12s, box-shadow .15s, opacity .15s;
      }
      .btn:active { transform: scale(0.98); }
      .btn:disabled { opacity:.38; cursor:default; }
      .btn-primary { background: linear-gradient(135deg, var(--ac), var(--ac2)); color:#04101C; box-shadow:0 6px 20px rgba(var(--ac-rgb),0.28); }
      .btn-ghost { background: rgba(255,255,255,0.04); color:#C9D3EE; border:1px dashed rgba(140,170,255,0.42); }
      .btn-danger { background: rgba(251,113,133,0.10); color:#FDA4AF; border:1px solid rgba(251,113,133,0.42); }
      .mini {
        width:30px; height:28px; border-radius:8px; border:1px solid rgba(140,170,255,0.3);
        background: rgba(255,255,255,0.05); color:#E7EAF8; font-size:13px; font-weight:800; cursor:pointer;
        display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;
      }
      .mini:disabled { opacity:.28; cursor:default; }
      .arrow-btn {
        background: rgba(255,255,255,0.06); border:1px solid rgba(140,170,255,0.28); color:#F5F7FF;
        font-size:22px; width:38px; height:38px; border-radius:999px; cursor:pointer; flex-shrink:0; line-height:1; padding:0;
      }
      .hbtn {
        background: rgba(255,255,255,0.05); color:#E7EAF8; border:1px solid rgba(140,170,255,0.25); border-radius:999px;
        width:30px; height:30px; font-size:14px; font-weight:800; line-height:1; padding:0; cursor:pointer;
        display:inline-flex; align-items:center; justify-content:center; white-space:nowrap;
      }
      .hbtn:disabled { opacity:.3; cursor:default; }
      .set-select {
        width:100%; box-sizing:border-box; font-weight:700; font-size:13.5px; border-radius:10px;
        border-width:1.5px; border-style:solid; padding:9px 8px; cursor:pointer;
      }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
    `}</style>
  );
}
