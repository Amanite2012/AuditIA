/** Libellés d'affichage des énumérations de briefing [BRIEF-01..05]. */
import type { AppType, Domain, DurationMin, InterlocutorType, MissionType } from '../../types';

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  audit_annuel: 'Audit annuel',
  controle_interne: 'Contrôle interne',
  revue_ciblee: 'Revue ciblée',
  autre: 'Autre',
};

export const DOMAIN_SHORT_LABELS: Record<Domain, string> = {
  acces: 'Accès',
  changements: 'Changements',
  operations: 'Opérations',
  continuite: 'Continuité',
};

export const APP_TYPE_LABELS: Record<AppType, string> = {
  erp: 'ERP',
  middleware: 'Middleware',
  batch: 'Batch',
  saas: 'SaaS',
  on_premise: 'On-premise',
  autre: 'Autre',
};

export const INTERLOCUTOR_LABELS: Record<InterlocutorType, string> = {
  dba: 'DBA',
  infra: 'Infrastructure',
  rssi: 'RSSI',
  responsable_applicatif: 'Resp. applicatif',
  dsi: 'DSI',
  autre: 'Autre',
};

export const DURATION_LABELS: Record<DurationMin, string> = {
  30: '30 min',
  45: '45 min',
  60: '60 min',
  90: '90 min',
};
