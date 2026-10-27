import { T } from '../data/theme.js';
import React from 'react';

/* =========================================================================
   SECCIÓN 6 · COMPONENTES
   Gráficos SVG, contexto, campos, tarjetas, ventanas y avisos.
   ========================================================================= */

/* =========================================================================
   GRÁFICOS DIBUJADOS A MANO (SVG) — sin dependencias externas
   ========================================================================= */

export function LineChartSVG({ points, color, height = 180, onPointClick, selectedIndex }) {
  if (!color) color = T.cyan; // color del tema por defecto
  const w = 320;
  const padL = 36, padR = 14, padT = 16, padB = 26;
  const valid = points.filter((p) => typeof p.y === 'number');
  if (valid.length < 2) return null;
  const ys = valid.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  min -= pad; max += pad;
  const innerW = w - padL - padR, innerH = height - padT - padB;
  const xAt = (i) => (valid.length === 1 ? padL + innerW / 2 : padL + (innerW * i) / (valid.length - 1));
  const yAt = (v) => padT + innerH - ((v - min) / (max - min)) * innerH;
  const path = valid.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L ${xAt(valid.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  const gid = 'lg' + color.replace('#', '');
  const gridLines = 3;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const v = min + ((max - min) * i) / gridLines;
        const y = yAt(v);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(140,170,255,0.14)" strokeWidth="1" strokeDasharray="2,4" />
            <text x={4} y={y + 4} fontSize="10" fill="#A9B3CC" fontFamily="Inter, sans-serif">{Math.round(v)}</text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {selectedIndex !== null && selectedIndex !== undefined && valid[selectedIndex] && (
        <line x1={xAt(selectedIndex)} y1={padT} x2={xAt(selectedIndex)} y2={height - padB} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
      )}
      {valid.map((p, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(p.y)} r={i === selectedIndex ? 7 : i === valid.length - 1 ? 5 : 3.5}
          fill={i === selectedIndex ? '#FFFFFF' : color} stroke={i === selectedIndex ? color : '#060913'} strokeWidth={i === selectedIndex ? 3 : 1.5} />
      ))}
      {onPointClick && valid.map((p, i) => (
        <circle key={'hit' + i} cx={xAt(i)} cy={yAt(p.y)} r={14} fill="transparent"
          onClick={() => onPointClick(i)} style={{ cursor: 'pointer' }} />
      ))}
      {valid.map((p, i) => {
        if (valid.length > 6 && i % Math.ceil(valid.length / 6) !== 0 && i !== valid.length - 1) return null;
        return <text key={'t' + i} x={xAt(i)} y={height - 6} fontSize="10" fill="#C9D3EE" fontFamily="Inter, sans-serif" textAnchor="middle">{p.label}</text>;
      })}
    </svg>
  );
}
