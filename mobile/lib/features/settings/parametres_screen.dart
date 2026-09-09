import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../shared/widgets/etat_async.dart';
import '../../theme/app_theme.dart';
import 'compte.dart';
import 'preferences_screen.dart';
import 'securite_screen.dart';

/// Ecran Paramètres — branche sur GET/PATCH /auth/me (identite, modifiable)
/// + GET /etudiants/moi (dossier academique, lecture seule).
class ParametresScreen extends StatefulWidget {
  const ParametresScreen({super.key});

  @override
  State<ParametresScreen> createState() => _ParametresScreenState();
}

class _ParametresScreenState extends State<ParametresScreen> {
  final _formKey = GlobalKey<FormState>();
  final _prenomController = TextEditingController();
  final _nomController = TextEditingController();
  bool _enregistrementEnCours = false;
  CompteEtudiant? _compteOriginal;
  late Future<CompteEtudiant> _chargement;

  @override
  void initState() {
    super.initState();
    _prenomController.addListener(_onChamp);
    _nomController.addListener(_onChamp);
    _chargement = _charger();
  }

  Future<CompteEtudiant> _charger() async {
    final resultats = await Future.wait([
      ApiClient.get('/auth/me'),
      ApiClient.get('/etudiants/moi'),
    ]);
    final compte = CompteEtudiant.depuisJson(
      profilAuth: resultats[0] as Map<String, dynamic>,
      profilEtudiant: resultats[1] as Map<String, dynamic>,
    );
    _compteOriginal = compte;
    _prenomController.text = compte.prenom;
    _nomController.text = compte.nom;
    return compte;
  }

  @override
  void dispose() {
    _prenomController.dispose();
    _nomController.dispose();
    super.dispose();
  }

  void _onChamp() => setState(() {});

  bool get _modifie {
    final original = _compteOriginal;
    if (original == null) return false;
    return _prenomController.text.trim() != original.prenom || _nomController.text.trim() != original.nom;
  }

  void _annuler() {
    final original = _compteOriginal;
    if (original == null) return;
    setState(() {
      _prenomController.text = original.prenom;
      _nomController.text = original.nom;
    });
  }

  Future<void> _enregistrer() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _enregistrementEnCours = true);
    try {
      final prenom = _prenomController.text.trim();
      final nom = _nomController.text.trim();
      await ApiClient.patch('/auth/me', corps: {'prenom': prenom, 'nom': nom});
      if (!mounted) return;
      setState(() => _compteOriginal = _compteOriginal!.copierAvec(prenom: prenom, nom: nom));
      final utilisateur = authService.utilisateur;
      if (utilisateur != null) {
        authService.mettreAJourUtilisateur(utilisateur.copierAvec(prenom: prenom, nom: nom));
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profil mis à jour.'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.successDark,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageErreurApi(e)), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) setState(() => _enregistrementEnCours = false);
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
      appBar: AppBar(title: const Text('Paramètres')),
      body: SafeArea(
        top: false,
        child: FutureBuilder<CompteEtudiant>(
          future: _chargement,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const EtatChargement();
            }
            if (snapshot.hasError) {
              return EtatErreur(message: messageErreurApi(snapshot.error!), onReessayer: _rafraichir);
            }

            final compte = snapshot.data!;
            final initiales = '${compte.prenom.isNotEmpty ? compte.prenom[0] : ''}${compte.nom.isNotEmpty ? compte.nom[0] : ''}';

            return Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.screenMargin, AppSpacing.base, AppSpacing.screenMargin, 120,
                ),
                children: [
                  _EnTeteProfil(initiales: initiales, nom: '${compte.prenom} ${compte.nom}', email: compte.email),
                  const SizedBox(height: AppSpacing.md),
                  _CarteSection(
                    titre: 'Informations du compte',
                    enfant: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _ChampTexte(label: 'Prénom', controller: _prenomController, icone: Icons.badge_outlined),
                        const SizedBox(height: AppSpacing.sm),
                        _ChampTexte(label: 'Nom', controller: _nomController, icone: Icons.badge_outlined),
                        const SizedBox(height: AppSpacing.sm),
                        _LigneInfoVerrouillee(
                          icone: Icons.mail_outline_rounded,
                          label: 'Adresse email',
                          valeur: compte.email,
                          note: 'Utilisée pour se connecter — non modifiable ici.',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _CarteSection(
                    titre: 'Dossier académique',
                    badge: 'Géré par l’établissement',
                    enfant: Column(
                      children: [
                        _LigneInfo(icone: Icons.school_outlined, label: 'Nom sur le diplôme', valeur: compte.nomSurDiplome),
                        const Divider(height: AppSpacing.md),
                        _LigneInfo(icone: Icons.badge_outlined, label: 'Matricule étudiant', valeur: compte.matricule),
                        const Divider(height: AppSpacing.md),
                        _LigneInfo(icone: Icons.account_balance_outlined, label: 'Établissement', valeur: compte.universite),
                        const Divider(height: AppSpacing.md),
                        _LigneInfo(
                          icone: Icons.call_outlined,
                          label: 'Téléphone',
                          valeur: compte.telephone ?? 'Non renseigné',
                          attenue: compte.telephone == null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _CarteSection(
                    titre: 'Autres réglages',
                    enfant: Column(
                      children: [
                        _LigneNavigation(
                          icone: Icons.shield_outlined,
                          couleur: AppColors.success,
                          label: 'Sécurité du compte',
                          sousTitre: 'Mot de passe et sessions actives',
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const SecuriteScreen()),
                          ),
                        ),
                        const Divider(height: AppSpacing.md),
                        _LigneNavigation(
                          icone: Icons.notifications_outlined,
                          couleur: AppColors.warning,
                          label: 'Préférences de notification',
                          sousTitre: 'Alertes email et types de notification',
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const PreferencesScreen()),
                          ),
                        ),
                        const Divider(height: AppSpacing.md),
                        _LigneNavigation(
                          icone: Icons.help_outline_rounded,
                          couleur: AppColors.textSecondary,
                          label: 'Aide & support',
                          sousTitre: 'Questions fréquentes et contact',
                          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Bientôt disponible.'), behavior: SnackBarBehavior.floating),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: _BarreEnregistrement(
        visible: _modifie,
        enCours: _enregistrementEnCours,
        onAnnuler: _annuler,
        onEnregistrer: _enregistrer,
      ),
    );
  }
}

class _EnTeteProfil extends StatelessWidget {
  const _EnTeteProfil({required this.initiales, required this.nom, required this.email});
  final String initiales;
  final String nom;
  final String email;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
          alignment: Alignment.center,
          child: Text(
            initiales.toUpperCase(),
            style: AppTypography.headlineSm.copyWith(color: AppColors.primary),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(nom, style: AppTypography.headlineSm, maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              Text(email, style: AppTypography.bodySm, maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ],
    );
  }
}

class _CarteSection extends StatelessWidget {
  const _CarteSection({required this.titre, required this.enfant, this.badge});
  final String titre;
  final Widget enfant;
  final String? badge;

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
                  decoration: BoxDecoration(
                    color: AppColors.borderLight,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.lock_outline_rounded, size: 11, color: AppColors.textMuted),
                      const SizedBox(width: 4),
                      Text(badge!, style: AppTypography.labelMd.copyWith(letterSpacing: 0)),
                    ],
                  ),
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

class _ChampTexte extends StatelessWidget {
  const _ChampTexte({required this.label, required this.controller, required this.icone});
  final String label;
  final TextEditingController controller;
  final IconData icone;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.labelMd),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          validator: (v) => (v == null || v.trim().isEmpty) ? 'Champ requis' : null,
          decoration: InputDecoration(prefixIcon: Icon(icone, size: 19)),
        ),
      ],
    );
  }
}

class _LigneInfoVerrouillee extends StatelessWidget {
  const _LigneInfoVerrouillee({required this.icone, required this.label, required this.valeur, required this.note});
  final IconData icone;
  final String label;
  final String valeur;
  final String note;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.labelMd),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 13),
          decoration: BoxDecoration(
            color: AppColors.borderLight,
            borderRadius: BorderRadius.circular(AppRadius.standard),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Icon(icone, size: 18, color: AppColors.textMuted),
              const SizedBox(width: AppSpacing.sm),
              Expanded(child: Text(valeur, style: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary))),
              const Icon(Icons.lock_outline_rounded, size: 15, color: AppColors.textMuted),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(note, style: AppTypography.bodySm),
      ],
    );
  }
}

class _LigneInfo extends StatelessWidget {
  const _LigneInfo({required this.icone, required this.label, required this.valeur, this.attenue = false});
  final IconData icone;
  final String label;
  final String valeur;
  final bool attenue;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(color: AppColors.borderLight, borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Icon(icone, size: 16, color: AppColors.textSecondary),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppTypography.labelMd),
              const SizedBox(height: 2),
              Text(
                valeur,
                style: AppTypography.bodyMd.copyWith(
                  fontWeight: FontWeight.w600,
                  color: attenue ? AppColors.textMuted : AppColors.textPrimary,
                  fontStyle: attenue ? FontStyle.italic : FontStyle.normal,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LigneNavigation extends StatelessWidget {
  const _LigneNavigation({
    required this.icone,
    required this.couleur,
    required this.label,
    required this.sousTitre,
    required this.onTap,
  });

  final IconData icone;
  final Color couleur;
  final String label;
  final String sousTitre;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(color: couleur.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppRadius.md)),
                child: Icon(icone, size: 16, color: couleur),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(sousTitre, style: AppTypography.bodySm),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

/// Barre d'enregistrement flottante : n'apparait que si le formulaire a ete
/// modifie, plutot qu'un bouton "Enregistrer" statique toujours a l'ecran.
class _BarreEnregistrement extends StatelessWidget {
  const _BarreEnregistrement({
    required this.visible,
    required this.enCours,
    required this.onAnnuler,
    required this.onEnregistrer,
  });

  final bool visible;
  final bool enCours;
  final VoidCallback onAnnuler;
  final Future<void> Function() onEnregistrer;

  @override
  Widget build(BuildContext context) {
    return AnimatedSlide(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      offset: visible ? Offset.zero : const Offset(0, 1.2),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: visible ? 1 : 0,
        child: Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.border)),
            boxShadow: [BoxShadow(color: Color(0x14000000), blurRadius: 16, offset: Offset(0, -4))],
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.screenMargin, 12, AppSpacing.screenMargin, 12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: enCours ? null : onAnnuler,
                      child: const Text('Annuler'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: enCours ? null : onEnregistrer,
                      child: enCours
                          ? const SizedBox(
                              width: 18, height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Enregistrer'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
