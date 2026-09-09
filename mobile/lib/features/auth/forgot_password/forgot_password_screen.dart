import 'package:flutter/material.dart';
import '../../../shared/widgets/bandeau_marque.dart';
import '../../../shared/widgets/feuille_contenu.dart';
import '../../../shared/widgets/message_banner.dart';
import '../../../theme/app_theme.dart';

/// Ecran "mot de passe oublie" — reprend l'habillage de LoginScreen
/// (BandeauMarque/FeuilleContenu partages) pour rester coherent visuellement.
/// Etape 1 de la methode : design + donnees statiques, POST /auth/forgot-password
/// pas encore branche (a faire a l'etape 3, en meme temps que la connexion).
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  bool _enCours = false;
  bool _succes = false;
  String? _erreur;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    setState(() => _erreur = null);
    if (!_formKey.currentState!.validate()) return;

    setState(() => _enCours = true);
    // TODO(etape 3) : remplacer par un vrai appel POST /auth/forgot-password.
    // Reponse volontairement identique que l'email existe ou non cote backend
    // (anti-enumeration) — le succes s'affiche donc toujours ici.
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() {
      _enCours = false;
      _succes = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final hauteurEcran = MediaQuery.of(context).size.height;
    final hauteurHero = hauteurEcran * 0.28;

    return Scaffold(
      backgroundColor: AppColors.primaryDark,
      body: SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        child: Column(
          children: [
            BandeauMarque(
              hauteur: hauteurHero,
              legende: 'Récupération sécurisée de votre accès.',
            ),
            FeuilleContenu(
              hauteurMinimale: hauteurEcran - hauteurHero,
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back),
                      color: AppColors.textSecondary,
                      padding: EdgeInsets.zero,
                      alignment: Alignment.centerLeft,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text('Mot de passe oublié ?', style: AppTypography.headlineMd),
                    const SizedBox(height: AppSpacing.xs),
                    Text.rich(
                      TextSpan(
                        style: AppTypography.bodySm,
                        children: const [
                          TextSpan(
                            text: "Entrez l'adresse e-mail associée à votre compte ",
                          ),
                          TextSpan(
                            text: 'INUBIL Verify',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          TextSpan(
                            text: '. Vous recevrez un lien sécurisé pour réinitialiser votre accès.',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (_succes) ...[
                      const MessageBanner(
                        texte: 'Si cette adresse est associée à un compte, un '
                            'e-mail de récupération vient d\'être envoyé.',
                        type: MessageBannerType.succes,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    if (_erreur != null) ...[
                      MessageBanner(texte: _erreur!, type: MessageBannerType.erreur),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    Text('Adresse e-mail professionnelle', style: AppTypography.labelMd),
                    const SizedBox(height: AppSpacing.xs),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        hintText: 'ex : m.ngo@universite-douala.cm',
                        prefixIcon: Icon(Icons.mail_outline, size: 20),
                      ),
                      validator: (valeur) {
                        if (valeur == null || valeur.trim().isEmpty) {
                          return 'Adresse e-mail requise.';
                        }
                        if (!valeur.contains('@')) {
                          return 'Adresse e-mail invalide.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),
                    ElevatedButton(
                      onPressed: _enCours ? null : _handleSubmit,
                      child: _enCours
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Envoyer le lien de récupération'),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Center(
                      child: TextButton.icon(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back, size: 16),
                        label: const Text('Retour à la connexion'),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Center(
                      child: Text(
                        'Le lien de réinitialisation est valable 1 heure.',
                        style: AppTypography.bodySm.copyWith(color: AppColors.textMuted),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
