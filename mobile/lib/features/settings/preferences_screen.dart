import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/etat_async.dart';
import '../../theme/app_theme.dart';
import '../notifications/notification.dart';

/// Ecran Preferences de notification. Perimetre volontairement etroit et
/// honnete : PATCH /auth/me/preferences (UpdatePreferencesDto, backend) n'expose
/// que 3 cles JSON — documents_valides et documents_rejetes concernent le role
/// agent_saisie ("un document que j'ai saisi"), donc hors sujet pour un etudiant.
/// Seule connexion_inhabituelle s'applique reellement a ce compte : c'est le
/// seul interrupteur fonctionnel ici. Le reste (types de notifications recues
/// dans l'app) n'a aucun endpoint de configuration cote backend — on l'affiche
/// donc comme toujours actif, jamais comme un faux interrupteur.
class PreferencesScreen extends StatefulWidget {
  const PreferencesScreen({super.key});

  @override
  State<PreferencesScreen> createState() => _PreferencesScreenState();
}

class _PreferencesScreenState extends State<PreferencesScreen> {
  bool _enCours = false;
  late Future<bool> _chargement;

  @override
  void initState() {
    super.initState();
    _chargement = _charger();
  }

  Future<bool> _charger() async {
    final profil = await ApiClient.get('/auth/me') as Map<String, dynamic>;
    final preferences = profil['preferences'] as Map<String, dynamic>? ?? const {};
    // Cles absentes = activees par defaut (voir ProfileResponseDto).
    return preferences['connexion_inhabituelle'] as bool? ?? true;
  }

  Future<void> _basculer(bool valeurActuelle, bool nouvelleValeur) async {
    setState(() {
      _chargement = Future.value(nouvelleValeur);
      _enCours = true;
    });
    try {
      await ApiClient.patch('/auth/me/preferences', corps: {'connexion_inhabituelle': nouvelleValeur});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Préférence enregistrée.'), behavior: SnackBarBehavior.floating),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _chargement = Future.value(valeurActuelle));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(messageErreurApi(e)), behavior: SnackBarBehavior.floating),
      );
    } finally {
      if (mounted) setState(() => _enCours = false);
    }
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
      appBar: AppBar(title: const Text('Préférences de notification')),
      body: SafeArea(
        top: false,
        child: FutureBuilder<bool>(
          future: _chargement,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const EtatChargement();
            }
            if (snapshot.hasError) {
              return EtatErreur(message: messageErreurApi(snapshot.error!), onReessayer: _rafraichir);
            }

            final connexionInhabituelle = snapshot.data!;

            return ListView(
              padding: const EdgeInsets.fromLTRB(AppSpacing.screenMargin, AppSpacing.base, AppSpacing.screenMargin, AppSpacing.lg),
              children: [
                _CarteSection(
                  titre: 'Alertes par email',
                  enfant: _LigneBascule(
                    icone: Icons.gpp_maybe_outlined,
                    couleur: AppColors.warning,
                    titre: 'Connexion inhabituelle',
                    description: 'Recevez un email si votre compte est utilisé depuis un nouvel appareil ou un lieu inhabituel.',
                    valeur: connexionInhabituelle,
                    enCours: _enCours,
                    onChange: (v) => _basculer(connexionInhabituelle, v),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                _CarteSection(
                  titre: 'Notifications dans l’app',
                  badge: 'Toujours actif',
                  enfant: Column(
                    children: [
                      for (var i = 0; i < _typesAffiches.length; i++) ...[
                        if (i > 0) const Divider(height: AppSpacing.md),
                        _LigneTypeNotif(type: _typesAffiches[i]),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline_rounded, size: 15, color: AppColors.textMuted),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Le réglage individuel de chaque type de notification arrivera dans une prochaine mise à jour.',
                          style: AppTypography.bodySm,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

const _typesAffiches = [
  TypeNotif.documentEmis,
  TypeNotif.documentVerifie,
  TypeNotif.partageConsulte,
  TypeNotif.documentRevoque,
];

const _libellesType = {
  TypeNotif.documentEmis: ('Diplôme émis', 'Un nouveau document vous est délivré.'),
  TypeNotif.documentVerifie: ('Diplôme vérifié', 'Quelqu’un contrôle l’un de vos documents.'),
  TypeNotif.partageConsulte: ('Lien de partage consulté', 'Un lien que vous avez généré est ouvert.'),
  TypeNotif.documentRevoque: ('Diplôme révoqué', 'Un document est retiré par l’établissement.'),
};

class _CarteSection extends StatelessWidget {
  const _CarteSection({required this.titre, required this.enfant, this.badge});
  final String titre;
  final String? badge;
  final Widget enfant;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(titre, style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w700))),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: AppColors.borderLight, borderRadius: BorderRadius.circular(AppRadius.lg)),
                  child: Text(badge!, style: AppTypography.labelMd.copyWith(letterSpacing: 0)),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          enfant,
        ],
      ),
    );
  }
}

class _LigneBascule extends StatelessWidget {
  const _LigneBascule({
    required this.icone,
    required this.couleur,
    required this.titre,
    required this.description,
    required this.valeur,
    required this.enCours,
    required this.onChange,
  });

  final IconData icone;
  final Color couleur;
  final String titre;
  final String description;
  final bool valeur;
  final bool enCours;
  final ValueChanged<bool> onChange;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(color: couleur.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Icon(icone, size: 18, color: couleur),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(titre, style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(description, style: AppTypography.bodySm),
            ],
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        enCours
            ? const SizedBox(
                width: 24, height: 24,
                child: Padding(
                  padding: EdgeInsets.all(3),
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
              )
            : Switch(value: valeur, onChanged: onChange, activeTrackColor: AppColors.primary),
      ],
    );
  }
}

class _LigneTypeNotif extends StatelessWidget {
  const _LigneTypeNotif({required this.type});
  final TypeNotif type;

  @override
  Widget build(BuildContext context) {
    final visuel = visuelPourNotif(type);
    final (titre, description) = _libellesType[type]!;
    return Row(
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(color: visuel.couleur.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Icon(visuel.icone, size: 16, color: visuel.couleur),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(titre, style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(description, style: AppTypography.bodySm),
            ],
          ),
        ),
        const Icon(Icons.check_circle_rounded, size: 18, color: AppColors.success),
      ],
    );
  }
}
