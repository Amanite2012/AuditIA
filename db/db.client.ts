/**
 * Client base de données — couche Data (CDC section 3.2 [DECISION-03]).
 *
 * - Chiffrement au repos : SQLCipher AES-256 [DECISION-02], clé stockée dans
 *   Android Keystore via expo-secure-store (section 6.1).
 * - Toutes les écritures des services passent par l'interface `DbClient`,
 *   ce qui permet de tester la logique métier contre le schéma SQL réel.
 * - [REL-03] Les écritures multi-instructions utilisent `withTransactionAsync`.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { MIGRATION_0001_SQL, MIGRATION_0001_VERSION } from './migrations/0001_initial';

/** Valeurs de liaison SQL positionnelles (`?`). */
export type SqlParam = string | number | null;

/**
 * Interface d'accès base — sous-ensemble de l'API `expo-sqlite` async.
 * Les services reçoivent un `DbClient` par injection : en production c'est la
 * base SQLCipher ouverte ci-dessous, en test un adaptateur better-sqlite3.
 */
export interface DbClient {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlParam[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

const DB_NAME = 'audit_assistant.db';
const DB_KEY_STORE_ID = 'sqlcipher_db_key_v1';

interface Migration {
  version: number;
  sql: string;
}

/** Migrations ordonnées. Toute évolution du schéma s'ajoute ici, jamais en place. */
export const MIGRATIONS: Migration[] = [{ version: MIGRATION_0001_VERSION, sql: MIGRATION_0001_SQL }];

/**
 * Applique les migrations manquantes (PRAGMA user_version), chacune dans une
 * transaction atomique [REL-03].
 */
export async function runMigrations(db: DbClient): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
    });
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}

/**
 * Récupère la clé SQLCipher depuis le Keystore, ou la génère au premier
 * lancement (256 bits aléatoires, hex). La clé ne quitte jamais l'appareil
 * [INVARIANT-01].
 */
async function getOrCreateDbKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DB_KEY_STORE_ID);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(DB_KEY_STORE_ID, key);
  return key;
}

let openedDb: SQLite.SQLiteDatabase | null = null;

/**
 * Ouvre (une seule fois) la base chiffrée SQLCipher et applique les migrations.
 * Le build active SQLCipher via le plugin expo-sqlite (`useSQLCipher: true`).
 */
export async function openEncryptedDatabase(): Promise<DbClient> {
  if (openedDb) return openedDb;
  const key = await getOrCreateDbKey();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`PRAGMA key = "x'${key}'"`);
  await db.execAsync('PRAGMA foreign_keys = ON');
  await runMigrations(db);
  openedDb = db;
  return db;
}
