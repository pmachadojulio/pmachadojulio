import { respond, createToken } from './_lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();
    if (!env.ADMIN_PASSWORD) {
      return respond({ ok: false, error: 'ADMIN_PASSWORD no configurada en Cloudflare' }, 500);
    }
    if (password !== env.ADMIN_PASSWORD) {
      return respond({ ok: false, error: 'Contraseña incorrecta' }, 401);
    }
    const token = await createToken(env);
    return respond({ ok: true, token });
  } catch (err) {
    return respond({ ok: false, error: 'Error en login' }, 400);
  }
}
