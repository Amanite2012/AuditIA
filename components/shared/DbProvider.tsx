/**
 * Contexte React fournissant le client base chiffrée aux écrans.
 * Composant d'infrastructure UI — aucune logique métier [DECISION-03].
 */
import React, { createContext, useContext } from 'react';

import type { DbClient } from '../../db/db.client';

const DbContext = createContext<DbClient | null>(null);

export function DbProvider({ db, children }: { db: DbClient; children: React.ReactNode }): React.ReactElement {
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

/** Client base — disponible uniquement sous <DbProvider>. */
export function useDb(): DbClient {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb doit être utilisé sous <DbProvider>.');
  return db;
}
