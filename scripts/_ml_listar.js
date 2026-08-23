const fs = require('fs');
const t = JSON.parse(fs.readFileSync('marketing/mercadolibre/ml_tokens.json', 'utf8')).access_token;
(async () => {
  const all = await fetch('https://api.mercadolibre.com/users/189676135/items/search?search_type=scan&limit=100', { headers: { Authorization: 'Bearer ' + t } }).then(r => r.json());
  const logIds = new Set(JSON.parse(fs.readFileSync('marketing/mercadolibre/ml_log.json', 'utf8')).filter(x => x.ok && !x.dry && x.id).map(x => x.id));
  for (const id of (all.results || [])) {
    const it = await fetch('https://api.mercadolibre.com/items/' + id + '?attributes=title,status', { headers: { Authorization: 'Bearer ' + t } }).then(r => r.json());
    console.log(id, '|', it.status, '|', logIds.has(id) ? '(nuestro)' : 'FUERA-DE-LOG |', it.title);
  }
})();
