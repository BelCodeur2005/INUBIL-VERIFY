export class PartageResponseDto {
  id: string;
  document_id: string;
  document_titre: string;
  token_acces: string;
  email_destinataire: string | null;
  universite_destinataire: string | null;
  date_expiration: Date | null;
  statut: string;
  nb_consultations: number;
  derniere_consultation: Date | null;
  created_at: Date;
}
