import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/etat_async.dart';
import '../../shared/widgets/message_banner.dart';
import '../../theme/app_theme.dart';
import '../diplomas/diploma.dart';
import 'partage.dart';
import 'partage_card.dart';

/// Ecran "Mes partages" — branche sur GET/POST/DELETE
/// /etudiants/moi/partages. Important : l'API ne retourne que les liens au
/// statut actif (filtre cote backend) — un lien revoque disparait donc
/// reellement de la liste au prochain chargement, il n'est jamais renvoye
/// avec un badge "Revoque". La revocation retire donc l'entree de la liste
/// localement plutot que de changer son statut sur place.
class SharesScreen extends StatefulWidget {
  const SharesScreen({super.key});

  @override
  State<SharesScreen> createState() => _SharesScreenState();
}

class _SharesScreenState extends State<SharesScreen> {
  late Future<(List<Partage>, List<Diplome>)> _chargement;

  @override
  void initState() {
    super.initState();
    _chargement = _charger();
  }

  Future<(List<Partage>, List<Diplome>)> _charger() async {
    final resultats = await Future.wait([
      ApiClient.get('/etudiants/moi/partages'),
      ApiClient.get('/etudiants/moi/documents?statut=actif&limit=100'),
    ]);
    final partages = (resultats[0] as List).map((p) => Partage.depuisJson(p as Map<String, dynamic>)).toList();
    final documentsJson = (resultats[1] as Map<String, dynamic>)['data'] as List;
    final documents = documentsJson.map((d) => Diplome.depuisJson(d as Map<String, dynamic>)).toList();
    return (partages, documents);
  }

  Future<void> _rafraichir() async {
    final chargement = _charger();
    setState(() => _chargement = chargement);
    await chargement;
  }

  Future<void> _revoquer(List<Partage> partagesActuels, List<Diplome> documents, Partage cible) async {
    await ApiClient.delete('/etudiants/moi/partages/${cible.id}');
    if (!mounted) return;
    final nouveauxPartages = partagesActuels.where((p) => p.id != cible.id).toList();
    setState(() => _chargement = Future.value((nouveauxPartages, documents)));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Lien révoqué.'), behavior: SnackBarBehavior.floating),
    );
  }

  void _ajouterPartageCree(List<Partage> partagesActuels, List<Diplome> documents, Partage nouveau) {
    final nouveauxPartages = <Partage>[nouveau, ...partagesActuels];
    setState(() => _chargement = Future.value((nouveauxPartages, documents)));
  }

  Future<void> _ouvrirCreation(List<Partage> partagesActuels, List<Diplome> documents) async {
    final resultat = await showModalBottomSheet<Partage>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FeuilleCreationPartage(documents: documents),
    );
    if (resultat != null) _ajouterPartageCree(partagesActuels, documents, resultat);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<(List<Partage>, List<Diplome>)>(
      future: _chargement,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const EtatChargement();
        }
        if (snapshot.hasError) {
          return EtatErreur(message: messageErreurApi(snapshot.error!), onReessayer: _rafraichir);
        }

        final (partages, documentsPartageables) = snapshot.data!;
        final liensActifs = partages.where((p) => p.statut == StatutPartage.actif).length;
        final totalConsultations = partages.fold(0, (somme, p) => somme + p.nbConsultations);

        return Scaffold(
          backgroundColor: AppColors.background,
          floatingActionButton: FloatingActionButton.extended(
            onPressed: documentsPartageables.isEmpty ? null : () => _ouvrirCreation(partages, documentsPartageables),
            icon: const Icon(Icons.add_link_rounded),
            label: const Text('Nouveau lien'),
          ),
          body: SafeArea(
            child: RefreshIndicator(
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
                          Text('Mes partages', style: AppTypography.headlineMd),
                          const SizedBox(height: 4),
                          Text(
                            'Les accès sécurisés que vous avez générés pour des recruteurs ou institutions.',
                            style: AppTypography.bodySm,
                          ),
                          const SizedBox(height: AppSpacing.base),
                          _RangeeStatistiques(liensActifs: liensActifs, consultations: totalConsultations, total: partages.length),
                          const SizedBox(height: AppSpacing.md),
                        ],
                      ),
                    ),
                  ),
                  if (partages.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: _EtatVide(
                        onCreer: documentsPartageables.isEmpty ? null : () => _ouvrirCreation(partages, documentsPartageables),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(AppSpacing.screenMargin, 0, AppSpacing.screenMargin, 96),
                      sliver: SliverList.separated(
                        itemCount: partages.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (_, i) => PartageCard(
                          partage: partages[i],
                          onRevoquer: () => _revoquer(partages, documentsPartageables, partages[i]),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _RangeeStatistiques extends StatelessWidget {
  const _RangeeStatistiques({required this.liensActifs, required this.consultations, required this.total});
  final int liensActifs;
  final int consultations;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _CarteStatistique(valeur: '$liensActifs', label: 'Liens actifs', icone: Icons.link_rounded, couleur: AppColors.primary)),
        const SizedBox(width: AppSpacing.sm),
        Expanded(child: _CarteStatistique(valeur: '$consultations', label: 'Consultations', icone: Icons.visibility_rounded, couleur: AppColors.success)),
        const SizedBox(width: AppSpacing.sm),
        Expanded(child: _CarteStatistique(valeur: '$total', label: 'Liens créés', icone: Icons.ios_share_rounded, couleur: AppColors.warning)),
      ],
    );
  }
}

class _CarteStatistique extends StatelessWidget {
  const _CarteStatistique({required this.valeur, required this.label, required this.icone, required this.couleur});
  final String valeur;
  final String label;
  final IconData icone;
  final Color couleur;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: couleur.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppRadius.standard)),
            child: Icon(icone, size: 15, color: couleur),
          ),
          const SizedBox(height: 10),
          Text(valeur, style: AppTypography.headlineSm),
          Text(label, style: AppTypography.bodySm, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _EtatVide extends StatelessWidget {
  const _EtatVide({required this.onCreer});
  final VoidCallback? onCreer;

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
              child: const Icon(Icons.ios_share_rounded, size: 30, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.base),
            Text('Aucun lien de partage', style: AppTypography.headlineSm, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(
              'Générez un lien sécurisé pour donner accès à l’un de vos diplômes certifiés.',
              style: AppTypography.bodySm,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.base),
            if (onCreer != null)
              ElevatedButton.icon(onPressed: onCreer, icon: const Icon(Icons.add_link_rounded, size: 18), label: const Text('Créer un lien')),
          ],
        ),
      ),
    );
  }
}

const _durees = [
  ('7', '7 jours'),
  ('30', '30 jours (par défaut)'),
  ('90', '90 jours'),
  ('365', '1 an'),
  ('permanent', 'Permanent (sans expiration)'),
];

class _FeuilleCreationPartage extends StatefulWidget {
  const _FeuilleCreationPartage({required this.documents});
  final List<Diplome> documents;

  @override
  State<_FeuilleCreationPartage> createState() => _FeuilleCreationPartageState();
}

class _FeuilleCreationPartageState extends State<_FeuilleCreationPartage> {
  late Diplome? _documentChoisi = widget.documents.isEmpty ? null : widget.documents.first;
  final _emailController = TextEditingController();
  String _duree = '30';
  bool _enCours = false;
  String? _erreur;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _generer() async {
    if (_documentChoisi == null) return;
    setState(() {
      _enCours = true;
      _erreur = null;
    });
    try {
      final email = _emailController.text.trim();
      final corps = <String, dynamic>{
        'document_id': _documentChoisi!.id,
        if (email.isNotEmpty) 'email_destinataire': email,
        if (_duree == 'permanent')
          'permanent': true
        else
          'date_expiration': DateTime.now().toUtc().add(Duration(days: int.parse(_duree))).toIso8601String(),
      };
      final reponse = await ApiClient.post('/etudiants/moi/partages', corps: corps) as Map<String, dynamic>;
      if (!mounted) return;
      Navigator.of(context).pop(Partage.depuisJson(reponse));
    } catch (e) {
      if (mounted) setState(() => _erreur = messageErreurApi(e));
    } finally {
      if (mounted) setState(() => _enCours = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hauteurClavier = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: hauteurClavier),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.screenMargin, 12, AppSpacing.screenMargin, AppSpacing.base),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: AppSpacing.base),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppRadius.md)),
                      child: const Icon(Icons.add_link_rounded, color: AppColors.primary, size: 20),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(child: Text('Générer un lien de vérification', style: AppTypography.headlineSm)),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                if (_erreur != null) ...[
                  MessageBanner(texte: _erreur!, type: MessageBannerType.erreur),
                  const SizedBox(height: AppSpacing.sm),
                ],
                Text('Diplôme concerné', style: AppTypography.labelMd),
                const SizedBox(height: 6),
                DropdownButtonFormField<Diplome>(
                  initialValue: _documentChoisi,
                  isExpanded: true,
                  items: widget.documents
                      .map((d) => DropdownMenuItem(value: d, child: Text('${d.typeDocument} — ${d.numeroUnique}', overflow: TextOverflow.ellipsis)))
                      .toList(),
                  onChanged: (v) => setState(() => _documentChoisi = v),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text('Email du destinataire (optionnel)', style: AppTypography.labelMd),
                const SizedBox(height: 6),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(hintText: 'recruteur@entreprise.com', prefixIcon: Icon(Icons.mail_outline_rounded, size: 19)),
                ),
                const SizedBox(height: 4),
                Text('Si renseigné, un email avec le lien lui est envoyé automatiquement.', style: AppTypography.bodySm),
                const SizedBox(height: AppSpacing.sm),
                Text('Durée de validité', style: AppTypography.labelMd),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _duree,
                  isExpanded: true,
                  items: _durees.map((d) => DropdownMenuItem(value: d.$1, child: Text(d.$2))).toList(),
                  onChanged: (v) => setState(() => _duree = v ?? '30'),
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _enCours ? null : () => Navigator.of(context).pop(),
                        child: const Text('Annuler'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: (_documentChoisi == null || _enCours) ? null : _generer,
                        child: _enCours
                            ? const SizedBox(
                                width: 18, height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Générer le lien'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
