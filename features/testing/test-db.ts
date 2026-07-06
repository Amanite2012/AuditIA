/**
 * Adaptateur de test : implémente l'interface `DbClient` au-dessus de
 * better-sqlite3, avec le schéma réel /db/schema.sql. Permet de tester la
 * logique métier contre les vraies contraintes SQL (CHECK, FK, index)
 * — support de test uniquement, exclu de la couverture.
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DbClient, SqlParam } from '../../db/db.client';

export interface TestDb extends DbClient {
  raw: Database.Database;
  close(): void;
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
      raw.exec(sql);
    },
    runAsync: async (sql: string, params: SqlParam[] = []): Promise<{ changes: number }> => {
      const result = raw.prepare(sql).run(...params);
      return { changes: result.changes };
    },
    getAllAsync: async <T>(sql: string, params: SqlParam[] = []): Promise<T[]> => {
      return raw.prepare(sql).all(...params) as T[];
    },
    getFirstAsync: async <T>(sql: string, params: SqlParam[] = []): Promise<T | null> => {
      return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    withTransactionAsync: async (task: () => Promise<void>): Promise<void> => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
