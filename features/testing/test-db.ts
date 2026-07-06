/**
 * Adaptateur de test : implémente l'interface `DbClient` au-dessus de
 * better-sqlite3, avec le schéma réel /db/schema.sql. Permet de tester la
 * logique métier contre les vraies contraintes SQL (CHECK, FK, index)
 * — support de test uniquement, exclu de la couverture.
 *
 * Note : le binding natif better-sqlite3 est initialisé une seule fois par
 * process worker Jest et lève des SqliteError liées au sandbox du PREMIER
 * fichier de test chargé ; dans les autres fichiers, `instanceof Error` est
 * alors faux et `.rejects.toThrow()` ne les reconnaît pas. `normalizeError`
 * re-matérialise chaque erreur dans le realm du fichier courant.
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DbClient, SqlParam } from '../../db/db.client';

export interface TestDb extends DbClient {
  raw: Database.Database;
  close(): void;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new Error(message);
}

function rethrowing<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    throw normalizeError(error);
  }
}

/** Ouvre une base en mémoire, avec le schéma canonique appliqué par défaut. */
export function createTestDb(options: { applySchema?: boolean } = {}): TestDb {
  const raw = new Database(':memory:');
  raw.pragma('foreign_keys = ON');
  if (options.applySchema !== false) {
    const schema = readFileSync(join(__dirname, '../../db/schema.sql'), 'utf-8');
    raw.exec(schema);
  }

  return {
    raw,
    close: () => raw.close(),
    execAsync: async (sql: string): Promise<void> => {
      rethrowing(() => raw.exec(sql));
    },
    runAsync: async (sql: string, params: SqlParam[] = []): Promise<{ changes: number }> => {
      const result = rethrowing(() => raw.prepare(sql).run(...params));
      return { changes: result.changes };
    },
    getAllAsync: async <T>(sql: string, params: SqlParam[] = []): Promise<T[]> => {
      return rethrowing(() => raw.prepare(sql).all(...params)) as T[];
    },
    getFirstAsync: async <T>(sql: string, params: SqlParam[] = []): Promise<T | null> => {
      return (rethrowing(() => raw.prepare(sql).get(...params)) as T | undefined) ?? null;
    },
    withTransactionAsync: async (task: () => Promise<void>): Promise<void> => {
      rethrowing(() => raw.exec('BEGIN'));
      try {
        await task();
        rethrowing(() => raw.exec('COMMIT'));
      } catch (error) {
        raw.exec('ROLLBACK');
        throw normalizeError(error);
      }
    },
  };
}
