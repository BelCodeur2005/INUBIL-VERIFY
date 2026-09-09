import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/etat_async.dart';
import '../../theme/app_theme.dart';
import 'diploma.dart';
import 'diploma_card.dart';
import 'diploma_detail_screen.dart';

enum _Filtre { tous, certifies, enAttente }

/// Ecran "Mes diplomes" — branche sur GET /etudiants/moi/documents (limit:100,
/// recherche/filtre cote client, meme approche que MesDiplomes.jsx) et
/// GET /etudiants/moi/documents/:id/pdf pour le telechargement.
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
  late Future<List<Diplome>> _chargement;

  @override
  void initState() {
    super.initState();
    _chargement = _charger();
  }

  @override
  void dispose() {
    _rechercheController.dispose();
    super.dispose();
  }

  Future<List<Diplome>> _charger() async {
    final reponse = await ApiClient.get('/etudiants/moi/documents?limit=100') as Map<String, dynamic>;
    final documentsJson = reponse['data'] as List;
    return documentsJson.map((d) => Diplome.depuisJson(d as Map<String, dynamic>)).toList();
  }

  Future<void> _rafraichir() async {
    final chargement = _charger();
    setState(() => _chargement = chargement);
    await chargement;
  }

  Future<void> _telecharger(Diplome d) async {
    setState(() => _telechargementEnCoursId = d.id);
    try {
      final reponse = await ApiClient.get('/etudiants/moi/documents/${d.id}/pdf') as Map<String, dynamic>;
      final url = reponse['url'] as String;
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageErreurApi(e)), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) setState(() => _telechargementEnCoursId = null);
    }
  }

  void _partager(Diplome d) {
    final url = d.urlVerification;
    if (url == null) return;
    SharePlus.instance.share(ShareParams(text: url, subject: d.typeDocument));
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _rafraichir,
      color: AppColors.primary,
      child: FutureBuilder<List<Diplome>>(
        future: _chargement,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const EtatChargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(message: messageErreurApi(snapshot.error!), onReessayer: _rafraichir);
          }

          final diplomes = snapshot.data!;
          final nbCertifies = diplomes.where((d) => d.statut == StatutDiplome.certifie).length;
          final nbEnAttente = diplomes.where((d) => d.statut == StatutDiplome.enCours).length;

          final filtres = diplomes.where((d) {
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
                            label: 'Tous (${diplomes.length})',
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
        },
      ),
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
