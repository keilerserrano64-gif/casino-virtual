// =====================================================================
// ROYAL CASINO · Capa 2: Base de datos NoSQL (MongoDB 6+)
// Datos flexibles y de alto volumen: catálogo/configuración de juegos,
// logs de partidas jugada a jugada, preferencias del jugador, chat y
// notificaciones.
// Uso:  mongosh "mongodb://localhost:27017" 02_mongodb_init.js
// El campo usuario_id guarda el UUID del usuario en PostgreSQL (como string).
// =====================================================================

db = db.getSiblingDB("royal_casino");

// ---------------------------------------------------------------------
// 1) catalogo_juegos: configuración de cada juego (tabla de pagos, pesos, etc.)
// ---------------------------------------------------------------------
db.createCollection("catalogo_juegos", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["codigo", "nombre", "activo"],
    properties: {
      codigo:  { bsonType: "string" },
      nombre:  { bsonType: "string" },
      activo:  { bsonType: "bool" },
      config:  { bsonType: "object" }
    }
  }}
});
db.catalogo_juegos.createIndex({ codigo: 1 }, { unique: true });

db.catalogo_juegos.insertMany([
  {
    codigo: "tragamonedas", nombre: "Tragamonedas", activo: true, version: 1,
    config: {
      carretes: 3, lineas: 1, rtp_teorico: 95.96, volatilidad: "media",
      apuestas: [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
      tabla_pagos: { "7": 100, "diamante": 30, "estrella": 15, "naranja": 10,
                     "limon": 6, "cereza": 4, "dos_iguales": 1 },
      // Los pesos reales viven en js/tragamonedas_engine.js (WEIGHTS); aquí se documentan
      auto_giros: 10
    },
    etiquetas: ["slots", "clasico"]
  },
  {
    codigo: "dados", nombre: "Dados (Craps)", activo: true, version: 1,
    config: { apuestas: ["pass", "dont_pass", "come", "dont_come", "field", "place", "odds", "proposicion"],
              dados: 2, modo_turbo: true }
  },
  { codigo: "ruleta",    nombre: "Ruleta",    activo: true, version: 1, config: { tipo: "europea", numeros: 37 } },
  { codigo: "blackjack", nombre: "Blackjack", activo: true, version: 1, config: { mazos: 6, pago_blackjack: 1.5 } },
  { codigo: "poker",     nombre: "Póker",     activo: true, version: 1, config: {} },
  {
    codigo: "bingo", nombre: "Bingo", activo: true, version: 1,
    config: {
      salas: {
        bingo75: { cartones_max: 6, premio_linea: 0.5, premio_bingo: 15,  bolas_bote: 60 },
        bingo90: { cartones_max: 6, premio_linea: 0.5, premio_bingo: 4.5, bolas_bote: 63 }
      },
      bote_inicial: 1000, aporte_bote_pct: 5
    }
  },
  {
    codigo: "carreras", nombre: "Carreras de caballos", activo: true, version: 1,
    config: { caballos: 5, apuestas: ["ganador", "plaza", "show"], margen_casa_min_pct: 8 }
  }
]);

// ---------------------------------------------------------------------
// 2) logs_partidas: detalle jugada a jugada (muy alto volumen)
//    TTL: se conservan 180 días; la auditoría legal vive en PostgreSQL.
// ---------------------------------------------------------------------
db.createCollection("logs_partidas");
db.logs_partidas.createIndex({ partida_id: 1 });
db.logs_partidas.createIndex({ usuario_id: 1, creado_en: -1 });
db.logs_partidas.createIndex({ juego: 1, creado_en: -1 });
db.logs_partidas.createIndex({ creado_en: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

// Ejemplo de documento (tragamonedas):
db.logs_partidas.insertOne({
  partida_id: "00000000-0000-0000-0000-000000000001",
  usuario_id: "00000000-0000-0000-0000-0000000000aa",
  juego: "tragamonedas",
  apuesta: 100, premio: 400,
  resultado: { carretes: ["cereza", "cereza", "cereza"], linea_ganadora: true, multiplicador: 4 },
  rng: { fuente: "crypto.getRandomValues", semilla_hash: "sha256:ejemplo" },
  cliente: { navegador: "Chrome", turbo: false, auto: false },
  creado_en: new Date()
});

// ---------------------------------------------------------------------
// 3) preferencias_jugador: perfil dinámico (Configuración / Mi perfil)
// ---------------------------------------------------------------------
db.createCollection("preferencias_jugador");
db.preferencias_jugador.createIndex({ usuario_id: 1 }, { unique: true });
// Ejemplo:
// { usuario_id: "...", sonido: true, animaciones: true, idioma: "es", tema: "vegas",
//   juegos_favoritos: ["tragamonedas","dados"], apuesta_habitual: { tragamonedas: 100 },
//   avatar: "corona", actualizado_en: ISODate() }

// ---------------------------------------------------------------------
// 4) notificaciones
// ---------------------------------------------------------------------
db.createCollection("notificaciones");
db.notificaciones.createIndex({ usuario_id: 1, leida: 1, creado_en: -1 });
db.notificaciones.createIndex({ creado_en: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// ---------------------------------------------------------------------
// 5) chat_salas (bingo y torneos)
// ---------------------------------------------------------------------
db.createCollection("chat_mensajes");
db.chat_mensajes.createIndex({ sala: 1, creado_en: -1 });
db.chat_mensajes.createIndex({ creado_en: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

// ---------------------------------------------------------------------
// 6) eventos_bingo / botes (estado de juego compartido)
// ---------------------------------------------------------------------
db.createCollection("botes");
db.botes.createIndex({ juego: 1, sala: 1 }, { unique: true });
db.botes.insertMany([
  { juego: "bingo", sala: "bingo75", monto: 1000, actualizado_en: new Date() },
  { juego: "bingo", sala: "bingo90", monto: 1000, actualizado_en: new Date() }
]);

print("✔ MongoDB royal_casino inicializada");
