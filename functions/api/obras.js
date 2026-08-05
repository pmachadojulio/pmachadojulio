import { respond, authGuard, mutateObras, ghPut, nextId, cleanObraFields } from './_lib.js';

export async function onRequestPost({ env, request }) {
  if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
  try {
    const body = await request.json();
    const obra = cleanObraFields(body.obra || {});
    if (!obra.titulo) return respond({ ok: false, error: 'Falta título' }, 400);

    if (body.imagen && body.imagen.base64 && body.imagen.filename) {
      const filename = String(body.imagen.filename).replace(/[^a-zA-Z0-9._-]/g, '');
      const res = await ghPut(env, `imagenes/${filename}`, body.imagen.base64, `Admin: imagen ${filename}`, null);
      if (!res.ok) return respond({ ok: false, error: `No pude subir la imagen (${res.data?.message || res.status})` }, 500);
      obra.imagen = `/imagenes/${filename}`;
    }

    const out = await mutateObras(env, current => {
      const obras = current.obras || [];
      const index = obras.findIndex(o => o.id && obra.id && o.id === obra.id);
      const nueva = { ...obra, id: obra.id || nextId(obras) };
      if (index >= 0) {
        obras[index] = { ...obras[index], ...nueva };
      } else {
        obras.push(nueva);
      }
      return { json: { obras }, message: `Admin: ${index >= 0 ? `actualicé "${nueva.titulo}"` : `nueva obra "${nueva.titulo}"`}`, obra: nueva };
    });
    return respond({ ok: true, obra: out.result.obra });
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

    let removed = null;
    const out = await mutateObras(env, current => {
      const obras = current.obras || [];
      const index = obras.findIndex(o => o.id === id);
      if (index < 0) return { json: null, message: '' };
      [removed] = obras.splice(index, 1);
      return { json: { obras }, message: `Admin: eliminé "${removed.titulo}"` };
    });
    if (!removed && out.ok && out.result.json === null) {
      return respond({ ok: false, error: 'Obra no encontrada' }, 404);
    }
    return respond({ ok: true });
  } catch (err) {
    return respond({ ok: false, error: String(err.message || err) }, 500);
  }
}
