// Navegación común de los tests con las pestañas nuevas:
// Entreno (Rutina · Cardio · Movilidad) · Progreso · Comida · Diana · Recursos, y el candado 🔒 en la cabecera.
import { screen, fireEvent, act } from '@testing-library/react';

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); }
async function pestana(nombre) { await click(screen.getAllByText(nombre, { selector: 'span' }).slice(-1)[0]); }
async function apartado(testid, nombre) {
  const b = Array.from(screen.getByTestId(testid).querySelectorAll('button')).find((x) => x.textContent === nombre);
  if (!b) throw new Error('No existe el apartado "' + nombre + '" en ' + testid);
  await click(b);
}

// 'Rutina' entra en Entreno → Rutina y abre el día activo (como tocarlo en la lista).
// 'Cardio' y 'Movilidad' son apartados de Entreno. 'Extras' ahora se llama 'Recursos'.
export async function irA(nombre) {
  if (nombre === 'Rutina' || nombre === 'Cardio' || nombre === 'Movilidad') {
    await pestana('Entreno');
    await apartado('entreno-secciones', nombre);
    if (nombre === 'Rutina') {
      const tarjeta = document.querySelector('[data-activo="true"]') || document.querySelector('[role="button"][data-testid^="dia-"]');
      if (tarjeta) await click(tarjeta);
    }
    return;
  }
  await pestana(nombre === 'Extras' ? 'Recursos' : nombre);
}
export async function desbloquear() { await click(screen.getByRole('button', { name: 'Desbloquear edición' })); }
export async function bloquear() { await click(screen.getByRole('button', { name: 'Bloquear edición' })); }
export async function comida(nombre) { await apartado('comida-secciones', nombre); }

// Al abrir la app se ve la lista de días; los tests que trabajan dentro de un día entran en el activo
export async function entrarDia() {
  if (!document.querySelector('[data-testid="entreno-secciones"]')) return;
  const tarjeta = document.querySelector('[data-activo="true"]') || document.querySelector('[role="button"][data-testid^="dia-"]');
  if (tarjeta) await click(tarjeta);
}
