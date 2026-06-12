export class AuditEntryDto {
  id: string;
  utilisateur_id: string | null;
  nom_utilisateur: string | null;
  action: string;
  module: string;
  table_concernee: string | null;
  enregistrement_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export class AuditListDto {
  data: AuditEntryDto[];
  total: number;
  page: number;
  limit: number;
}
