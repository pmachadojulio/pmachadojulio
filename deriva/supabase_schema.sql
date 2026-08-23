-- ============================================================================
-- Deriva · Galería nómada — Schema Supabase (free tier, sin tarjeta)
-- Backend de back-office. El SITIO PÚBLICO queda estático (build-deriva.js
-- lee data/derivantes.json + data/obras_derivantes.json que yo sync desde acá).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Derivantes (artistas del colectivo)
-- ---------------------------------------------------------------------------
create table if not exists derivantes (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,            -- usado en URLs: /deriva/derivante/<slug>
  nombre        text not null,
  ciudad        text,                            -- Córdoba, Bs As, etc.
  lat           numeric(9,6),                     -- para el "mapa de derivas"
  lng           numeric(9,6),
  statement     text,                            -- su dérive personal (1-3 líneas)
  bio           text,
  foto          text,                            -- url de storage
  fundador      boolean default false,           -- Julio = true, siempre primero
  aprobado      boolean default false,           -- curador debe aprobar para publicar
  created_at    timestamptz default now(),
  user_id       uuid references auth.users(id)   -- login del artista (panel propio)
);

-- ---------------------------------------------------------------------------
-- 2. Obras de derivantes (catálogo complementario)
-- ---------------------------------------------------------------------------
create table if not exists obras_derivantes (
  id            uuid primary key default gen_random_uuid(),
  derivante_id  uuid references derivantes(id) on delete cascade,
  titulo        text not null,
  anio          int,
  tecnica       text,
  imagen        text,                            -- url storage
  precio        text,                            -- "$100.000" o "Consultar"
  disponible    boolean default true,
  vendida       boolean default false,
  certificado   text,
  aprobado      boolean default false,           -- curador aprueba antes de publicar
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 3. Consultas (leads del sitio público -> artista + curador)
-- ---------------------------------------------------------------------------
create table if not exists consultas (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid references obras_derivantes(id) on delete set null,
  derivante_id  uuid references derivantes(id) on delete set null,
  nombre        text,
  contacto      text,                            -- email o tel
  mensaje       text,
  canal         text default 'web',              -- web | whatsapp | email
  leida         boolean default false,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 4. RLS (Row Level Security) — cada artista ve SOLO sus filas
-- ---------------------------------------------------------------------------
alter table derivantes       enable row level security;
alter table obras_derivantes enable row level security;
alter table consultas        enable row level security;

-- Lectura pública SOLO de lo aprobado (el sitio estático necesita leer)
create policy "public read derivantes aprobados"
  on derivantes for select to anon
  using (aprobado = true);

create policy "public read obras aprobadas"
  on obras_derivantes for select to anon
  using (aprobado = true);

-- El artista (user_id) edita solo sus propios derivantes/obras
create policy "artista owns derivante"
  on derivantes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "artista owns obras"
  on obras_derivantes for all to authenticated
  using (derivante_id in (
    select id from derivantes where user_id = auth.uid()))
  with check (derivante_id in (
    select id from derivantes where user_id = auth.uid()));

-- El artista ve solo sus consultas
create policy "artista reads own consultas"
  on consultas for select to authenticated
  using (derivante_id in (
    select id from derivantes where user_id = auth.uid()));

-- Inserción de consultas desde la web (anónimo) siempre permitida
create policy "public insert consultas"
  on consultas for insert to anon
  with check (true);

-- ============================================================================
-- NOTA DE SEGURIDAD: el curador (vos) necesita un rol admin para aprobar.
-- Solución simple en free tier: usás la Service Role Key desde un script local
-- (supabase-js con SERVICE_ROLE) para hacer el sync + aprobar. Nunca esa key
-- en el front-end estático.
-- ============================================================================
