-- =====================================================================
-- ROYAL CASINO · Capa 1: Base de datos relacional (PostgreSQL 15+)
-- Núcleo ACID: usuarios, billetera, transacciones, torneos y auditoría.
-- Las monedas del proyecto son VIRTUALES (sin dinero real), pero el
-- diseño es el mismo que usaría un casino real: libro mayor inmutable.
-- Uso:  psql -U postgres -c "CREATE DATABASE royal_casino;"
--       psql -U postgres -d royal_casino -f 01_postgresql_schema.sql
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS citext;     -- correo/usuario sin distinguir mayúsculas

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
CREATE TYPE rol_usuario        AS ENUM ('jugador', 'soporte', 'admin');
CREATE TYPE estado_cuenta      AS ENUM ('activa', 'suspendida', 'autoexcluida', 'cerrada');
CREATE TYPE estado_kyc         AS ENUM ('pendiente', 'en_revision', 'aprobado', 'rechazado');
CREATE TYPE tipo_documento     AS ENUM ('CC', 'CE', 'PASAPORTE', 'TI');
CREATE TYPE tipo_movimiento    AS ENUM ('apuesta', 'premio', 'bono', 'recompensa',
                                        'bienvenida', 'torneo_inscripcion',
                                        'torneo_premio', 'ajuste_admin', 'reembolso');
CREATE TYPE estado_partida     AS ENUM ('en_curso', 'finalizada', 'anulada');
CREATE TYPE estado_torneo      AS ENUM ('programado', 'abierto', 'en_curso', 'finalizado', 'cancelado');
CREATE TYPE estado_ticket      AS ENUM ('abierto', 'en_proceso', 'resuelto', 'cerrado');
CREATE TYPE estado_amistad     AS ENUM ('pendiente', 'aceptada', 'bloqueada');

-- ---------------------------------------------------------------------
-- Utilidad: updated_at automático
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- USUARIOS + KYC
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario          CITEXT      NOT NULL UNIQUE CHECK (char_length(usuario) BETWEEN 3 AND 18),
  nombre           VARCHAR(30) NOT NULL,
  correo           CITEXT      NOT NULL UNIQUE,
  password_hash    TEXT        NOT NULL,              -- crypt(pass, gen_salt('bf', 12)) o argon2 desde la app
  rol              rol_usuario   NOT NULL DEFAULT 'jugador',
  estado           estado_cuenta NOT NULL DEFAULT 'activa',
  nivel            INT         NOT NULL DEFAULT 1 CHECK (nivel >= 1),
  xp               BIGINT      NOT NULL DEFAULT 0 CHECK (xp >= 0),
  acepto_terminos  BOOLEAN     NOT NULL DEFAULT FALSE,
  ultimo_login     TIMESTAMPTZ,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER usuarios_updated BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE kyc_verificaciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_documento    tipo_documento NOT NULL,
  numero_documento  TEXT NOT NULL,                 -- cifrar a nivel de app/pgcrypto en producción
  fecha_nacimiento  DATE NOT NULL,
  pais              CHAR(2) NOT NULL DEFAULT 'CO',
  estado            estado_kyc NOT NULL DEFAULT 'pendiente',
  revisado_por      UUID REFERENCES usuarios(id),
  motivo_rechazo    TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_en       TIMESTAMPTZ,
  CONSTRAINT mayor_de_edad CHECK (fecha_nacimiento <= (CURRENT_DATE - INTERVAL '18 years')),
  UNIQUE (tipo_documento, numero_documento)
);

-- Juego responsable (límites y autoexclusión)
CREATE TABLE limites_juego (
  usuario_id        UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  limite_diario     BIGINT CHECK (limite_diario  > 0),
  limite_semanal    BIGINT CHECK (limite_semanal > 0),
  limite_mensual    BIGINT CHECK (limite_mensual > 0),
  autoexcluido_hasta TIMESTAMPTZ,
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sesiones_login (            -- historial de accesos (la sesión viva está en Redis)
  id           BIGSERIAL PRIMARY KEY,
  usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ip           INET,
  user_agent   TEXT,
  exitoso      BOOLEAN NOT NULL,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sesiones_usuario ON sesiones_login (usuario_id, creado_en DESC);

-- ---------------------------------------------------------------------
-- BILLETERA + LIBRO MAYOR (inmutable)
-- Montos en monedas enteras (BIGINT) para evitar errores de redondeo.
-- ---------------------------------------------------------------------
CREATE TABLE billeteras (
  usuario_id     UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  saldo          BIGINT NOT NULL DEFAULT 0 CHECK (saldo >= 0),   -- nunca negativo
  total_ganado   BIGINT NOT NULL DEFAULT 0,
  total_gastado  BIGINT NOT NULL DEFAULT 0,
  total_bonos    BIGINT NOT NULL DEFAULT 0,
  version        BIGINT NOT NULL DEFAULT 0,                      -- bloqueo optimista
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transacciones (
  id               BIGSERIAL PRIMARY KEY,
  usuario_id       UUID NOT NULL REFERENCES usuarios(id),
  tipo             tipo_movimiento NOT NULL,
  monto            BIGINT NOT NULL CHECK (monto <> 0),           -- + entra, - sale
  saldo_resultante BIGINT NOT NULL CHECK (saldo_resultante >= 0),
  concepto         VARCHAR(120) NOT NULL,
  partida_id       UUID,                                         -- FK lógica a partidas (se agrega abajo)
  torneo_id        UUID,
  clave_idempotencia UUID NOT NULL DEFAULT gen_random_uuid(),    -- evita cobros dobles por reintentos
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, clave_idempotencia)
);
CREATE INDEX idx_tx_usuario_fecha ON transacciones (usuario_id, creado_en DESC);
CREATE INDEX idx_tx_tipo          ON transacciones (tipo, creado_en DESC);

-- El libro mayor NO se edita ni se borra: solo se agregan filas.
CREATE OR REPLACE FUNCTION trg_transacciones_inmutables() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla transacciones es inmutable (usa un movimiento de ajuste).';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER transacciones_no_update BEFORE UPDATE OR DELETE ON transacciones
  FOR EACH ROW EXECUTE FUNCTION trg_transacciones_inmutables();

-- Función ACID: aplica un movimiento y actualiza saldo en UNA transacción.
CREATE OR REPLACE FUNCTION registrar_movimiento(
  p_usuario    UUID,
  p_tipo       tipo_movimiento,
  p_monto      BIGINT,
  p_concepto   TEXT,
  p_partida    UUID DEFAULT NULL,
  p_torneo     UUID DEFAULT NULL,
  p_clave      UUID DEFAULT gen_random_uuid()
) RETURNS BIGINT AS $$
DECLARE
  v_saldo BIGINT;
  v_id    BIGINT;
BEGIN
  -- Idempotencia: si la clave ya existe, devuelve la transacción previa
  SELECT id INTO v_id FROM transacciones WHERE usuario_id = p_usuario AND clave_idempotencia = p_clave;
  IF FOUND THEN RETURN v_id; END IF;

  -- Bloqueo de fila: serializa movimientos concurrentes del mismo jugador
  SELECT saldo INTO v_saldo FROM billeteras WHERE usuario_id = p_usuario FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Billetera inexistente para %', p_usuario; END IF;
  IF v_saldo + p_monto < 0 THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

  v_saldo := v_saldo + p_monto;

  UPDATE billeteras SET
    saldo         = v_saldo,
    total_ganado  = total_ganado  + CASE WHEN p_tipo IN ('premio','torneo_premio') THEN p_monto ELSE 0 END,
    total_gastado = total_gastado + CASE WHEN p_tipo IN ('apuesta','torneo_inscripcion') THEN -p_monto ELSE 0 END,
    total_bonos   = total_bonos   + CASE WHEN p_tipo IN ('bono','bienvenida','recompensa') THEN p_monto ELSE 0 END,
    version       = version + 1,
    actualizado_en = now()
  WHERE usuario_id = p_usuario;

  INSERT INTO transacciones (usuario_id, tipo, monto, saldo_resultante, concepto, partida_id, torneo_id, clave_idempotencia)
  VALUES (p_usuario, p_tipo, p_monto, v_saldo, p_concepto, p_partida, p_torneo, p_clave)
  RETURNING id INTO v_id;

  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- Al crear un usuario: billetera + bienvenida de 10.000 monedas (como en registro.html)
CREATE OR REPLACE FUNCTION trg_usuario_nuevo() RETURNS trigger AS $$
BEGIN
  INSERT INTO billeteras (usuario_id) VALUES (NEW.id);
  PERFORM registrar_movimiento(NEW.id, 'bienvenida', 10000, 'Bono de bienvenida');
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER usuarios_alta AFTER INSERT ON usuarios
  FOR EACH ROW EXECUTE FUNCTION trg_usuario_nuevo();

-- ---------------------------------------------------------------------
-- JUEGOS Y PARTIDAS (resumen financiero; el detalle jugada a jugada va a MongoDB)
-- ---------------------------------------------------------------------
CREATE TABLE juegos (
  id            SMALLSERIAL PRIMARY KEY,
  codigo        VARCHAR(30) NOT NULL UNIQUE,      -- 'tragamonedas','dados','ruleta','blackjack','poker','bingo','carreras'
  nombre        VARCHAR(60) NOT NULL,
  rtp_teorico   NUMERIC(5,2) CHECK (rtp_teorico BETWEEN 0 AND 100),
  apuesta_min   BIGINT NOT NULL DEFAULT 10 CHECK (apuesta_min > 0),
  apuesta_max   BIGINT NOT NULL DEFAULT 10000,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (apuesta_max >= apuesta_min)
);
INSERT INTO juegos (codigo, nombre, rtp_teorico, apuesta_min, apuesta_max) VALUES
  ('tragamonedas', 'Tragamonedas',     95.96, 10, 10000),
  ('dados',        'Dados (Craps)',    NULL,  10, 10000),
  ('ruleta',       'Ruleta',           NULL,  10, 10000),
  ('blackjack',    'Blackjack',        NULL,  10, 10000),
  ('poker',        'Póker',            NULL,  10, 10000),
  ('bingo',        'Bingo',            NULL,  10, 10000),
  ('carreras',     'Carreras',         NULL,  10, 10000);

CREATE TABLE partidas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID NOT NULL REFERENCES usuarios(id),
  juego_id       SMALLINT NOT NULL REFERENCES juegos(id),
  torneo_id      UUID,
  apostado       BIGINT NOT NULL CHECK (apostado >= 0),
  premio         BIGINT NOT NULL DEFAULT 0 CHECK (premio >= 0),
  estado         estado_partida NOT NULL DEFAULT 'en_curso',
  semilla_hash   TEXT,                             -- compromiso del RNG para auditoría
  iniciada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizada_en  TIMESTAMPTZ
);
CREATE INDEX idx_partidas_usuario ON partidas (usuario_id, iniciada_en DESC);
CREATE INDEX idx_partidas_juego   ON partidas (juego_id, iniciada_en DESC);

ALTER TABLE transacciones ADD CONSTRAINT fk_tx_partida FOREIGN KEY (partida_id) REFERENCES partidas(id);

-- Historial / estadísticas por jugador y juego (alimenta estadisticas.html e historial.html)
CREATE TABLE estadisticas_jugador (
  usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  juego_id      SMALLINT NOT NULL REFERENCES juegos(id),
  partidas      BIGINT NOT NULL DEFAULT 0,
  victorias     BIGINT NOT NULL DEFAULT 0,
  total_apostado BIGINT NOT NULL DEFAULT 0,
  total_premios BIGINT NOT NULL DEFAULT 0,
  mayor_premio  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, juego_id)
);

-- ---------------------------------------------------------------------
-- TORNEOS Y RANKING
-- ---------------------------------------------------------------------
CREATE TABLE torneos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(80) NOT NULL,
  juego_id      SMALLINT NOT NULL REFERENCES juegos(id),
  inscripcion   BIGINT NOT NULL DEFAULT 0 CHECK (inscripcion >= 0),
  bolsa_premios BIGINT NOT NULL DEFAULT 0 CHECK (bolsa_premios >= 0),
  cupo_max      INT CHECK (cupo_max > 0),
  estado        estado_torneo NOT NULL DEFAULT 'programado',
  inicia_en     TIMESTAMPTZ NOT NULL,
  termina_en    TIMESTAMPTZ NOT NULL,
  CHECK (termina_en > inicia_en)
);
ALTER TABLE partidas      ADD CONSTRAINT fk_partida_torneo FOREIGN KEY (torneo_id) REFERENCES torneos(id);
ALTER TABLE transacciones ADD CONSTRAINT fk_tx_torneo     FOREIGN KEY (torneo_id) REFERENCES torneos(id);

CREATE TABLE torneo_participantes (
  torneo_id   UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  puntos      BIGINT NOT NULL DEFAULT 0,
  posicion    INT,
  premio      BIGINT NOT NULL DEFAULT 0,
  inscrito_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (torneo_id, usuario_id)
);

-- Ranking global (instantánea; el ranking en vivo se calcula en Redis)
CREATE TABLE ranking_historico (
  periodo     DATE NOT NULL,                       -- primer día del mes
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  puntos      BIGINT NOT NULL,
  posicion    INT NOT NULL,
  PRIMARY KEY (periodo, usuario_id)
);

-- ---------------------------------------------------------------------
-- BONIFICACIONES, LOGROS, AMIGOS
-- ---------------------------------------------------------------------
CREATE TABLE bonificaciones (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(40) NOT NULL UNIQUE,         -- 'diario','bienvenida','lealtad_bingo'...
  nombre      VARCHAR(80) NOT NULL,
  monto       BIGINT NOT NULL CHECK (monto > 0),
  cooldown_h  INT,                                 -- NULL = una sola vez
  activa      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE bonos_reclamados (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  bono_id     INT  NOT NULL REFERENCES bonificaciones(id),
  reclamado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bonos_usuario ON bonos_reclamados (usuario_id, bono_id, reclamado_en DESC);

CREATE TABLE logros (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(40) NOT NULL UNIQUE,
  nombre      VARCHAR(80) NOT NULL,
  descripcion TEXT,
  xp          INT NOT NULL DEFAULT 0,
  recompensa  BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE logros_usuario (
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  logro_id    INT  NOT NULL REFERENCES logros(id),
  obtenido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, logro_id)
);

CREATE TABLE amistades (
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  amigo_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado      estado_amistad NOT NULL DEFAULT 'pendiente',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, amigo_id),
  CHECK (usuario_id <> amigo_id)
);

-- ---------------------------------------------------------------------
-- CONTENIDO Y SOPORTE (noticias, tickets)
-- ---------------------------------------------------------------------
CREATE TABLE noticias (
  id          SERIAL PRIMARY KEY,
  titulo      VARCHAR(140) NOT NULL,
  cuerpo      TEXT NOT NULL,
  autor_id    UUID REFERENCES usuarios(id),
  publicada   BOOLEAN NOT NULL DEFAULT FALSE,
  publicada_en TIMESTAMPTZ
);

CREATE TABLE tickets_soporte (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  asunto      VARCHAR(140) NOT NULL,
  mensaje     TEXT NOT NULL,
  estado      estado_ticket NOT NULL DEFAULT 'abierto',
  atendido_por UUID REFERENCES usuarios(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER tickets_updated BEFORE UPDATE ON tickets_soporte
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ---------------------------------------------------------------------
-- AUDITORÍA REGULATORIA (inmutable)
-- ---------------------------------------------------------------------
CREATE TABLE auditoria (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES usuarios(id),
  accion      VARCHAR(60) NOT NULL,                -- 'login','ajuste_saldo','cambio_rol','kyc_aprobado'...
  entidad     VARCHAR(40),
  entidad_id  TEXT,
  detalle     JSONB NOT NULL DEFAULT '{}',
  ip          INET,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_actor  ON auditoria (actor_id, creado_en DESC);
CREATE INDEX idx_auditoria_accion ON auditoria (accion, creado_en DESC);

CREATE TRIGGER auditoria_no_update BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION trg_transacciones_inmutables();

-- ---------------------------------------------------------------------
-- VISTAS útiles para las páginas del proyecto
-- ---------------------------------------------------------------------
CREATE VIEW v_ranking_global AS
SELECT u.id AS usuario_id, u.usuario, u.nivel, b.saldo,
       RANK() OVER (ORDER BY b.saldo DESC) AS posicion
FROM usuarios u JOIN billeteras b ON b.usuario_id = u.id
WHERE u.estado = 'activa' AND u.rol = 'jugador';

CREATE VIEW v_resumen_casino AS            -- panel admin / estadísticas
SELECT j.codigo,
       COUNT(p.id)                              AS partidas,
       COALESCE(SUM(p.apostado), 0)             AS apostado,
       COALESCE(SUM(p.premio), 0)               AS pagado,
       CASE WHEN SUM(p.apostado) > 0
            THEN ROUND(100.0 * SUM(p.premio) / SUM(p.apostado), 2) END AS rtp_real
FROM juegos j LEFT JOIN partidas p ON p.juego_id = j.id AND p.estado = 'finalizada'
GROUP BY j.codigo;

-- ---------------------------------------------------------------------
-- DATOS SEMILLA
-- ---------------------------------------------------------------------
INSERT INTO bonificaciones (codigo, nombre, monto, cooldown_h) VALUES
  ('bienvenida', 'Bono de bienvenida', 10000, NULL),
  ('diario',     'Bono diario',          1000, 24);

-- Administrador de ejemplo (README: admin / admin123). CÁMBIALA en cuanto despliegues.
INSERT INTO usuarios (usuario, nombre, correo, password_hash, rol, acepto_terminos)
VALUES ('admin', 'Administrador', 'admin@royalcasino.local',
        crypt('admin123', gen_salt('bf', 12)), 'admin', TRUE);
