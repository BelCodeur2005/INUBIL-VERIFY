import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../diplomas/diploma.dart';
import 'partage.dart';
import 'partage_card.dart';

class SharesScreen extends StatefulWidget {
  const SharesScreen({super.key});

  @override
  State<SharesScreen> createState() => _SharesScreenState();
}

class _SharesScreenState extends State<SharesScreen> {
  final List<Partage> _partages = List.of(partagesFactices);

  int get _liensActifs => _partages.where((p) => p.statut == StatutPartage.actif).length;
  int get _totalConsultations => _partages.fold(0, (somme, p) => somme + p.nbConsultations);

  Future<void> _revoquer(Partage cible) async {
    // TODO(etape 3) : POST /etudiants/moi/partages/:id -> DELETE reel.
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    setState(() {
      final i = _partages.indexWhere((p) => p.id == cible.id);
      if (i != -1) {
        _partages[i] = Partage(
          id: cible.id,
          documentTitre: cible.documentTitre,
          tokenAcces: cible.tokenAcces,
          statut: StatutPartage.revoque,
          dateCreation: cible.dateCreation,
          nbConsultations: cible.nbConsultations,
          dateExpiration: cible.dateExpiration,
          permanent: cible.permanent,
          emailDestinataire: cible.emailDestinataire,
          universiteDestinataire: cible.universiteDestinataire,
        );
      }
    });
  }

  void _creerPartage(Partage nouveau) {
    setState(() => _partages.insert(0, nouveau));
  }

  Future<void> _ouvrirCreation() async {
    final documentsPartageables = diplomesFactices.where((d) => d.statut == StatutDiplome.certifie).toList();
    final resultat = await showModalBottomSheet<Partage>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FeuilleCreationPartage(documents: documentsPartageables),
    );
    if (resultat != null) _creerPartage(resultat);
  }

  @override
  Widget build(BuildContext context) {
    final documentsPartageables = diplomesFactices.where((d) => d.statut == StatutDiplome.certifie).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: documentsPartageables.isEmpty ? null : _ouvrirCreation,
        icon: const Icon(Icons.add_link_rounded),
        label: const Text('Nouveau lien'),
      ),
      body: SafeArea(
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
                    _RangeeStatistiques(liensActifs: _liensActifs, consultations: _totalConsultations, total: _partages.length),
                    const SizedBox(height: AppSpacing.md),
                  ],
                ),
              ),
            ),
            if (_partages.isEmpty)
              SliverFillRemaining(hasScrollBody: false, child: _EtatVide(onCreer: documentsPartageables.isEmpty ? null : _ouvrirCreation))
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.screenMargin, 0, AppSpacing.screenMargin, 96),
                sliver: SliverList.separated(
                  itemCount: _partages.length,
                  separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (_, i) => PartageCard(partage: _partages[i], onRevoquer: () => _revoquer(_partages[i])),
                ),
              ),
          ],
        ),
      ),
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

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _generer() async {
    if (_documentChoisi == null) return;
    setState(() => _enCours = true);
    // TODO(etape 3) : POST /etudiants/moi/partages avec {document_id, email_destinataire?, duree}.
    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    final email = _emailController.text.trim();
    final nouveau = Partage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      documentTitre: '${_documentChoisi!.typeDocument} — ${_documentChoisi!.numeroUnique}',
      tokenAcces: _genererToken(),
      statut: StatutPartage.actif,
      dateCreation: DateTime.now(),
      nbConsultations: 0,
      permanent: _duree == 'permanent',
      dateExpiration: _duree == 'permanent' ? null : DateTime.now().add(Duration(days: int.parse(_duree))),
      emailDestinataire: email.isEmpty ? null : email,
    );
    Navigator.of(context).pop(nouveau);
  }

  String _genererToken() {
    const car = 'abcdef0123456789';
    final rnd = DateTime.now().microsecondsSinceEpoch;
    return List.generate(12, (i) => car[(rnd ~/ (i + 1)) % car.length]).join();
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
