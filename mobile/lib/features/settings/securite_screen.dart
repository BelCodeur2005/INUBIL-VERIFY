import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../shared/widgets/etat_async.dart';
import '../../shared/widgets/message_banner.dart';
import '../../theme/app_theme.dart';
import 'session.dart';

class SecuriteScreen extends StatefulWidget {
  const SecuriteScreen({super.key});

  @override
  State<SecuriteScreen> createState() => _SecuriteScreenState();
}

class _SecuriteScreenState extends State<SecuriteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _actuelController = TextEditingController();
  final _nouveauController = TextEditingController();
  final _confirmerController = TextEditingController();

  bool _actuelVisible = false;
  bool _nouveauVisible = false;
  bool _enCours = false;
  bool _succes = false;
  String? _erreur;
  Timer? _timerSucces;

  String? _revocationEnCoursId;
  late Future<List<SessionActive>> _chargementSessions;

  @override
  void initState() {
    super.initState();
    _nouveauController.addListener(() => setState(() {}));
    _chargementSessions = _chargerSessions();
  }

  Future<List<SessionActive>> _chargerSessions() async {
    final reponse = await ApiClient.get('/auth/sessions') as List;
    return reponse.map((s) => SessionActive.depuisJson(s as Map<String, dynamic>)).toList();
  }

  @override
  void dispose() {
    _actuelController.dispose();
    _nouveauController.dispose();
    _confirmerController.dispose();
    _timerSucces?.cancel();
    super.dispose();
  }

  int get _forceScore {
    final mdp = _nouveauController.text;
    if (mdp.isEmpty) return 0;
    var score = 0;
    if (mdp.length >= 8) score++;
    if (RegExp(r'[A-Z]').hasMatch(mdp)) score++;
    if (RegExp(r'[0-9]').hasMatch(mdp)) score++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(mdp)) score++;
    return score;
  }

  Future<void> _changerMotDePasse() async {
    setState(() => _erreur = null);
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_nouveauController.text != _confirmerController.text) {
      setState(() => _erreur = 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setState(() => _enCours = true);
    try {
      await ApiClient.patch('/auth/password', corps: {
        'ancien_mot_de_passe': _actuelController.text,
        'nouveau_mot_de_passe': _nouveauController.text,
        'confirmation_mot_de_passe': _confirmerController.text,
      });
      if (!mounted) return;
      setState(() {
        _succes = true;
        _actuelController.clear();
        _nouveauController.clear();
        _confirmerController.clear();
      });
      _timerSucces?.cancel();
      _timerSucces = Timer(const Duration(seconds: 3), () {
        if (mounted) setState(() => _succes = false);
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _erreur = e.message);
    } catch (_) {
      if (mounted) setState(() => _erreur = 'Impossible de joindre le serveur. Vérifiez votre connexion.');
    } finally {
      if (mounted) setState(() => _enCours = false);
    }
  }

  Future<void> _confirmerRevocation(List<SessionActive> sessionsActuelles, SessionActive session) async {
    final confirme = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Révoquer cette session ?'),
        content: Text(
          'L’accès depuis ${session.appareil} · ${session.navigateur} sera immédiatement coupé. '
          'Si c’est l’appareil que vous utilisez actuellement, vous serez déconnecté.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Révoquer', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    if (confirme != true || !mounted) return;

    setState(() => _revocationEnCoursId = session.id);
    try {
      await ApiClient.delete('/auth/sessions/${session.id}');
      if (!mounted) return;
      final nouvellesSessions = sessionsActuelles.where((s) => s.id != session.id).toList();
      setState(() => _chargementSessions = Future.value(nouvellesSessions));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session révoquée.'), behavior: SnackBarBehavior.floating),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageErreurApi(e)), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) setState(() => _revocationEnCoursId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Sécurité du compte')),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpacing.screenMargin, AppSpacing.base, AppSpacing.screenMargin, AppSpacing.lg),
          children: [
            _CarteSection(
              titre: 'Changer le mot de passe',
              enfant: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_succes) ...[
                      const MessageBanner(texte: 'Mot de passe modifié avec succès.', type: MessageBannerType.succes),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    if (_erreur != null) ...[
                      MessageBanner(texte: _erreur!, type: MessageBannerType.erreur),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    _ChampMotDePasse(
                      label: 'Mot de passe actuel',
                      controller: _actuelController,
                      visible: _actuelVisible,
                      onToggle: () => setState(() => _actuelVisible = !_actuelVisible),
                      validator: (v) => (v == null || v.isEmpty) ? 'Champ requis' : null,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _ChampMotDePasse(
                      label: 'Nouveau mot de passe',
                      controller: _nouveauController,
                      visible: _nouveauVisible,
                      onToggle: () => setState(() => _nouveauVisible = !_nouveauVisible),
                      hint: '8 caractères min.',
                      validator: (v) => (v == null || v.length < 8) ? '8 caractères minimum' : null,
                    ),
                    if (_nouveauController.text.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _JaugeForce(score: _forceScore),
                    ],
                    const SizedBox(height: AppSpacing.sm),
                    _ChampMotDePasse(
                      label: 'Confirmer le nouveau mot de passe',
                      controller: _confirmerController,
                      visible: _nouveauVisible,
                      onToggle: () => setState(() => _nouveauVisible = !_nouveauVisible),
                      validator: (v) => (v == null || v.isEmpty) ? 'Champ requis' : null,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _enCours ? null : _changerMotDePasse,
                        icon: _enCours
                            ? const SizedBox(
                                width: 16, height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.key_rounded, size: 18),
                        label: Text(_enCours ? 'Mise à jour…' : 'Mettre à jour le mot de passe'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _CarteSection(
              titre: 'Sessions actives',
              sousTitre: 'Les appareils actuellement connectés à votre compte.',
              enfant: FutureBuilder<List<SessionActive>>(
                future: _chargementSessions,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                      child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                    );
                  }
                  if (snapshot.hasError) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                      child: Text(messageErreurApi(snapshot.error!), style: AppTypography.bodySm.copyWith(color: AppColors.error)),
                    );
                  }
                  final sessions = snapshot.data!;
                  if (sessions.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                      child: Text('Aucune session active.', style: AppTypography.bodySm),
                    );
                  }
                  return Column(
                    children: [
                      for (var i = 0; i < sessions.length; i++) ...[
                        if (i > 0) const Divider(height: AppSpacing.md),
                        _LigneSession(
                          session: sessions[i],
                          revocationEnCours: _revocationEnCoursId == sessions[i].id,
                          onRevoquer: () => _confirmerRevocation(sessions, sessions[i]),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CarteSection extends StatelessWidget {
  const _CarteSection({required this.titre, required this.enfant, this.sousTitre});
  final String titre;
  final String? sousTitre;
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
          Text(titre, style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w700)),
          if (sousTitre != null) ...[
            const SizedBox(height: 2),
            Text(sousTitre!, style: AppTypography.bodySm),
          ],
          const SizedBox(height: AppSpacing.sm),
          enfant,
        ],
      ),
    );
  }
}

class _ChampMotDePasse extends StatelessWidget {
  const _ChampMotDePasse({
    required this.label,
    required this.controller,
    required this.visible,
    required this.onToggle,
    required this.validator,
    this.hint,
  });

  final String label;
  final TextEditingController controller;
  final bool visible;
  final VoidCallback onToggle;
  final String? Function(String?) validator;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.labelMd),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          obscureText: !visible,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint ?? '••••••••',
            prefixIcon: const Icon(Icons.lock_outline_rounded, size: 19),
            suffixIcon: IconButton(
              icon: Icon(visible ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 19),
              onPressed: onToggle,
            ),
          ),
        ),
      ],
    );
  }
}

class _JaugeForce extends StatelessWidget {
  const _JaugeForce({required this.score});
  final int score;

  static const _paliers = ['Faible', 'Moyen', 'Bon', 'Fort'];

  Color get _couleur {
    switch (score) {
      case 1:
        return AppColors.error;
      case 2:
        return AppColors.warning;
      case 3:
        return AppColors.primary;
      case 4:
        return AppColors.success;
      default:
        return AppColors.border;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Row(
            children: List.generate(4, (i) {
              final rempli = i < score;
              return Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
                  decoration: BoxDecoration(
                    color: rempli ? _couleur : AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        SizedBox(
          width: 42,
          child: Text(
            score == 0 ? '' : _paliers[score - 1],
            style: AppTypography.labelMd.copyWith(color: _couleur, letterSpacing: 0),
          ),
        ),
      ],
    );
  }
}

class _LigneSession extends StatelessWidget {
  const _LigneSession({required this.session, required this.revocationEnCours, required this.onRevoquer});
  final SessionActive session;
  final bool revocationEnCours;
  final VoidCallback onRevoquer;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(color: AppColors.borderLight, borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Icon(session.icone, size: 18, color: AppColors.textSecondary),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${session.appareil} · ${session.navigateur}', style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text('${session.ipAddress ?? 'IP inconnue'} — connecté le ${session.dateFormatee}', style: AppTypography.bodySm),
            ],
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          height: 30,
          child: TextButton.icon(
            onPressed: revocationEnCours ? null : onRevoquer,
            style: TextButton.styleFrom(foregroundColor: AppColors.error, padding: const EdgeInsets.symmetric(horizontal: 8)),
            icon: revocationEnCours
                ? const SizedBox(width: 13, height: 13, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error))
                : const Icon(Icons.logout_rounded, size: 15),
            label: const Text('Révoquer', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ),
      ],
    );
  }
}
