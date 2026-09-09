import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/etat_async.dart';
import '../../theme/app_theme.dart';
import 'trust_ring.dart';
import 'verification.dart';
import 'verification_tile.dart';

/// Ecran "Verifications" — branche sur GET /etudiants/moi/verifications
/// (limit:100, meme plafond que VerificationsActivite.jsx).
class VerificationsScreen extends StatefulWidget {
  const VerificationsScreen({super.key});

  @override
  State<VerificationsScreen> createState() => _VerificationsScreenState();
}

class _VerificationsScreenState extends State<VerificationsScreen> {
  final _rechercheController = TextEditingController();
  String _recherche = '';
  late Future<List<Verif>> _chargement;

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

  Future<List<Verif>> _charger() async {
    final reponse = await ApiClient.get('/etudiants/moi/verifications?limit=100') as Map<String, dynamic>;
    final data = reponse['data'] as List;
    return data.map((v) => Verif.depuisJson(v as Map<String, dynamic>)).toList()
      ..sort((a, b) => b.dateCreation.compareTo(a.dateCreation));
  }

  Future<void> _rafraichir() async {
    final chargement = _charger();
    setState(() => _chargement = chargement);
    await chargement;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: FutureBuilder<List<Verif>>(
          future: _chargement,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const EtatChargement();
            }
            if (snapshot.hasError) {
              return EtatErreur(message: messageErreurApi(snapshot.error!), onReessayer: _rafraichir);
            }

            final verifications = snapshot.data!;
            final terme = _recherche.trim().toLowerCase();
            final filtrees = terme.isEmpty
                ? verifications
                : verifications
                    .where((v) => v.typeDocument.toLowerCase().contains(terme) || v.numeroUnique.toLowerCase().contains(terme))
                    .toList();

            final total = verifications.length;
            final nbAuthentiques = verifications.where((v) => v.resultat == ResultatVerification.authentique).length;
            final nbDocumentsDistincts = verifications.map((v) => v.numeroUnique).toSet().length;
            final taux = total > 0 ? ((nbAuthentiques / total) * 100).round() : null;

            return RefreshIndicator(
              onRefresh: _rafraichir,
              color: AppColors.primary,
              child: CustomScrollView(
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.screenMargin, AppSpacing.base, AppSpacing.screenMargin, AppSpacing.xs,
                    ),
                    sliver: SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Vérifications', style: AppTypography.headlineMd),
                          const SizedBox(height: 4),
                          Text(
                            'Chaque contrôle public effectué sur vos documents — lien, QR code ou hash.',
                            style: AppTypography.bodySm,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Center(child: TrustRing(taux: taux, total: total)),
                          const SizedBox(height: AppSpacing.md),
                          Row(
                            children: [
                              Expanded(
                                child: _ChipStat(valeur: '$total', label: 'Vérifications', icone: Icons.shield_outlined),
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: _ChipStat(valeur: '$nbDocumentsDistincts', label: 'Documents distincts', icone: Icons.description_outlined),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.md),
                          TextField(
                            controller: _rechercheController,
                            onChanged: (v) => setState(() => _recherche = v),
                            decoration: InputDecoration(
                              hintText: 'Rechercher un diplôme, un numéro…',
                              prefixIcon: const Icon(Icons.search_rounded, size: 20),
                              suffixIcon: _recherche.isEmpty
                                  ? null
                                  : IconButton(
                                      icon: const Icon(Icons.close_rounded, size: 18),
                                      onPressed: () => setState(() {
                                        _rechercheController.clear();
                                        _recherche = '';
                                      }),
                                    ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.base),
                          Text('Historique', style: AppTypography.headlineSm),
                          const SizedBox(height: AppSpacing.sm),
                        ],
                      ),
                    ),
                  ),
                  if (filtrees.isEmpty)
                    SliverFillRemaining(hasScrollBody: false, child: _EtatVide(recherche: _recherche.isNotEmpty))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(AppSpacing.screenMargin, 0, AppSpacing.screenMargin, AppSpacing.lg),
                      sliver: SliverList.builder(
                        itemCount: filtrees.length,
                        itemBuilder: (context, i) => VerificationTile(verif: filtrees[i]),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ChipStat extends StatelessWidget {
  const _ChipStat({required this.valeur, required this.label, required this.icone});
  final String valeur;
  final String label;
  final IconData icone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(icone, size: 17, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(valeur, style: AppTypography.bodyLg.copyWith(fontWeight: FontWeight.w700)),
                Text(label, style: AppTypography.labelMd.copyWith(letterSpacing: 0), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
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
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.08), shape: BoxShape.circle),
              child: Icon(recherche ? Icons.search_off_rounded : Icons.shield_outlined, size: 30, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.base),
            Text(
              recherche ? 'Aucun résultat' : 'Aucune vérification',
              style: AppTypography.headlineSm,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              recherche
                  ? 'Aucune vérification ne correspond à votre recherche.'
                  : 'Dès qu’un recruteur ou une institution contrôlera l’un de vos documents, l’activité apparaîtra ici.',
              style: AppTypography.bodySm,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
