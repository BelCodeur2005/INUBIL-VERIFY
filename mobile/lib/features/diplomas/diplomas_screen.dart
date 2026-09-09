import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'diploma.dart';
import 'diploma_card.dart';
import 'diploma_detail_screen.dart';

enum _Filtre { tous, certifies, enAttente }

/// Ecran "Mes diplomes" — etape 1 de la methode (design + donnees statiques).
/// GET /etudiants/moi/documents + GET /etudiants/moi/documents/:id/pdf seront
/// branches a l'etape 3.
class DiplomasScreen extends StatefulWidget {
  const DiplomasScreen({super.key});

  @override
  State<DiplomasScreen> createState() => _DiplomasScreenState();
}

class _DiplomasScreenState extends State<DiplomasScreen> {
  final _rechercheController = TextEditingController();
  String _recherche = '';
  _Filtre _filtre = _Filtre.tous;
  String? _telechargementEnCoursId;

  @override
  void dispose() {
    _rechercheController.dispose();
    super.dispose();
  }

  Future<void> _telecharger(Diplome d) async {
    setState(() => _telechargementEnCoursId = d.id);
    // TODO(etape 3) : GET /etudiants/moi/documents/:id/pdf puis ouvrir l'URL presignee.
    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    setState(() => _telechargementEnCoursId = null);
  }

  void _partager(Diplome d) {
    // TODO(etape 3) : Share.share (package share_plus) du lien de verification.
  }

  @override
  Widget build(BuildContext context) {
    final nbCertifies = diplomesFactices.where((d) => d.statut == StatutDiplome.certifie).length;
    final nbEnAttente = diplomesFactices.where((d) => d.statut == StatutDiplome.enCours).length;

    final filtres = diplomesFactices.where((d) {
      final correspondRecherche = _recherche.isEmpty ||
          d.typeDocument.toLowerCase().contains(_recherche) ||
          d.universite.toLowerCase().contains(_recherche) ||
          d.numeroUnique.toLowerCase().contains(_recherche);
      final correspondFiltre = switch (_filtre) {
        _Filtre.tous => true,
        _Filtre.certifies => d.statut == StatutDiplome.certifie,
        _Filtre.enAttente => d.statut == StatutDiplome.enCours,
      };
      return correspondRecherche && correspondFiltre;
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenMargin,
            AppSpacing.sm,
            AppSpacing.screenMargin,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _rechercheController,
                onChanged: (v) => setState(() => _recherche = v.toLowerCase()),
                decoration: const InputDecoration(
                  hintText: 'Rechercher par intitulé, établissement...',
                  prefixIcon: Icon(Icons.search, size: 20),
                  isDense: true,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _ChipFiltre(
                      label: 'Tous (${diplomesFactices.length})',
                      selectionne: _filtre == _Filtre.tous,
                      onTap: () => setState(() => _filtre = _Filtre.tous),
                    ),
                    const SizedBox(width: 8),
                    _ChipFiltre(
                      label: 'Certifiés ($nbCertifies)',
                      selectionne: _filtre == _Filtre.certifies,
                      onTap: () => setState(() => _filtre = _Filtre.certifies),
                    ),
                    const SizedBox(width: 8),
                    _ChipFiltre(
                      label: 'En attente ($nbEnAttente)',
                      selectionne: _filtre == _Filtre.enAttente,
                      onTap: () => setState(() => _filtre = _Filtre.enAttente),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: filtres.isEmpty
              ? _EtatVide(recherche: _recherche.isNotEmpty)
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.screenMargin),
                  itemCount: filtres.length,
                  separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (context, i) {
                    final d = filtres[i];
                    return DiplomaCard(
                      diplome: d,
                      telechargementEnCours: _telechargementEnCoursId == d.id,
                      onOuvrir: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => DiplomaDetailScreen(diplome: d)),
                      ),
                      onTelecharger: () => _telecharger(d),
                      onPartager: () => _partager(d),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _ChipFiltre extends StatelessWidget {
  const _ChipFiltre({required this.label, required this.selectionne, required this.onTap});

  final String label;
  final bool selectionne;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selectionne ? AppColors.primary : AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadius.xl),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.xl),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.xl),
            border: Border.all(color: selectionne ? Colors.transparent : AppColors.border),
          ),
          child: Text(
            label,
            style: AppTypography.bodySm.copyWith(
              color: selectionne ? Colors.white : AppColors.textSecondary,
              fontWeight: selectionne ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

class _EtatVide extends StatelessWidget {
  const _EtatVide({required this.recherche});

  final bool recherche;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.workspace_premium_outlined, size: 40, color: AppColors.textMuted),
            const SizedBox(height: AppSpacing.sm),
            Text(
              recherche
                  ? 'Aucun document ne correspond à votre recherche.'
                  : "Aucun diplôme n'a encore été émis à votre nom.",
              style: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
