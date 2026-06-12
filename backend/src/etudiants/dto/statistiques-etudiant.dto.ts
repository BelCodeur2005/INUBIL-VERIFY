export class StatistiquesEtudiantDto {
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
  partages: {
    actifs: number;
    total_consultations: number;
  };
}
