export class StatistiquesGlobalesDto {
  universites: {
    actives: number;
    total: number;
  };
  documents: {
    total: number;
    actifs: number;
    en_validation: number;
    revoques: number;
  };
  verifications: {
    total: number;
    ce_mois: number;
  };
  etudiants: number;
  utilisateurs: number;
  partages: {
    actifs: number;
  };
}
