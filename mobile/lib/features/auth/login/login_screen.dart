import 'package:flutter/material.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/auth/auth_service.dart';
import '../../../shared/widgets/bandeau_marque.dart';
import '../../../shared/widgets/feuille_contenu.dart';
import '../../../shared/widgets/main_shell.dart';
import '../../../shared/widgets/message_banner.dart';
import '../../../theme/app_theme.dart';
import '../forgot_password/forgot_password_screen.dart';

/// Ecran de connexion — branche sur POST /auth/login (core/auth/auth_service.dart).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _motDePasseVisible = false;
  bool _enCours = false;
  String? _erreur;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    setState(() => _erreur = null);
    if (!_formKey.currentState!.validate()) return;

    setState(() => _enCours = true);
    try {
      await authService.connecter(
        email: _emailController.text.trim(),
        motDePasse: _passwordController.text,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainShell()),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _erreur = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _erreur = 'Impossible de joindre le serveur. Vérifiez votre connexion.');
    } finally {
      if (mounted) setState(() => _enCours = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hauteurEcran = MediaQuery.of(context).size.height;
    final hauteurHero = hauteurEcran * 0.34;

    return Scaffold(
      backgroundColor: AppColors.primaryDark,
      body: SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        child: Column(
          children: [
            BandeauMarque(
              hauteur: hauteurHero,
              legende: "Vos diplômes, ancrés et vérifiables — n'importe où, en un instant.",
            ),
            FeuilleContenu(
              hauteurMinimale: hauteurEcran - hauteurHero,
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Connexion', style: AppTypography.headlineMd),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Entrez vos identifiants pour accéder à votre espace',
                      style: AppTypography.bodySm,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (_erreur != null) ...[
                      MessageBanner(texte: _erreur!, type: MessageBannerType.erreur),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    Text('Adresse e-mail', style: AppTypography.labelMd),
                    const SizedBox(height: AppSpacing.xs),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        hintText: 'exemple@domaine.com',
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
                    const SizedBox(height: AppSpacing.sm),
                    Text('Mot de passe', style: AppTypography.labelMd),
                    const SizedBox(height: AppSpacing.xs),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: !_motDePasseVisible,
                      autofillHints: const [AutofillHints.password],
                      decoration: InputDecoration(
                        hintText: '••••••••',
                        suffixIcon: IconButton(
                          icon: Icon(
                            _motDePasseVisible
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: AppColors.textSecondary,
                            size: 20,
                          ),
                          tooltip: _motDePasseVisible ? 'Masquer' : 'Afficher',
                          onPressed: () => setState(
                            () => _motDePasseVisible = !_motDePasseVisible,
                          ),
                        ),
                      ),
                      validator: (valeur) {
                        if (valeur == null || valeur.isEmpty) {
                          return 'Mot de passe requis.';
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
                          : const Text('Se connecter'),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Center(
                      child: TextButton(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const ForgotPasswordScreen(),
                            ),
                          );
                        },
                        child: const Text('Mot de passe oublié ?'),
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
