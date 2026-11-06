import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Si la app no llega a arrancar, Angular no puede mostrar nada: en vez de una página en blanco, un mensaje
 * mínimo (estilos en línea: no depende de Tailwind ni de nada que pueda no haber cargado) y un botón Recargar.
 */
function showBootstrapError(): void {
  const box = document.createElement('main');
  box.setAttribute('role', 'alert');
  box.style.cssText =
    'max-width:28rem;margin:15vh auto;padding:2rem;font-family:system-ui,sans-serif;text-align:center;color:#0f172a';
  box.innerHTML = `
    <h1 style="font-size:1.25rem;margin:0 0 .5rem">No hemos podido abrir Revishop</h1>
    <p style="color:#475569;margin:0 0 1.5rem">Comprueba tu conexión y vuelve a intentarlo. Si sigue sin funcionar, prueba más tarde.</p>
    <button type="button" style="background:#2563eb;color:#fff;border:0;border-radius:.75rem;padding:.75rem 1.25rem;font:inherit;cursor:pointer">Recargar</button>`;
  box.querySelector('button')?.addEventListener('click', () => location.reload());
  document.body.replaceChildren(box);
}

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  console.error(err);
  showBootstrapError();
});
