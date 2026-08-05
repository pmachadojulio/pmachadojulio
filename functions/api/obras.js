import { respond, authGuard, loadObras, saveObras, ghPut, encodeB64, nextId, cleanObraFields } from './_lib.js';

export async function onRequestPost({ env, request }) {
  if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
  try {
    const body = await request.json();
    const obra = cleanObraFields(body.obra || {});
    if (!obra.titulo) return respond({ ok: false, error: 'Falta título' }, 400);

    const obras = (await loadObras(env)).obras || [];
    const index = obras.findIndex(o => o.id && obra.id && o.id === obra.id);

    if (body.imagen && body.imagen.base64 && body.imagen.filename) {
      const filename = String(body.imagen.filename).replace(/[^a-zA-Z0-9._-]/g, '');
      const res = await ghPut(env, `imagenes/${filename}`, body.imagen.base64, `Admin: imagen ${filename}`, null);
      if (!res.ok) return respond({ ok: false, error: `No pude subir la imagen (${res.data?.message || res.status})` }, 500);
      obra.imagen = `/imagenes/${filename}`;
    }

    const nueva = { ...obra, id: obra.id || nextId(obras) };
    if (index >= 0) {
      obras[index] = { ...obras[index], ...nueva };
    } else {
      obras.push(nueva);
    }

    await saveObras(env, { obras }, index >= 0 ? `Admin: actualicé "${nueva.titulo}"` : `Admin: nueva obra "${nueva.titulo}"`);
    return respond({ ok: true, obra: nueva });
  } catch (err) {
    return respond({ ok: false, error: String(err.message || err) }, 500);
  }
}

export async function onRequestDelete({ env, request }) {
  if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
  try {
    const url = new URL(request.url, 'https://jcmachado.com');
    const id = url.searchParams.get('id');
    if (!id) return respond({ ok: false, error: 'Falta id' }, 400);
    const obras = (await loadObras(env)).obras || [];
    const index = obras.findIndex(o => o.id === id);
    if (index < 0) return respond({ ok: false, error: 'Obra no encontrada' }, 404);
    const [removed] = obras.splice(index, 1);
    await saveObras(env, { obras }, `Admin: eliminé "${removed.titulo}"`);
    return respond({ ok: true });
  } catch (err) {
    return respond({ ok: false, error: String(err.message || err) }, 500);
  }
}
