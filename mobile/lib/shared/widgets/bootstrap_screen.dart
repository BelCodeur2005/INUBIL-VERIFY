import 'package:flutter/material.dart';
import '../../core/auth/auth_service.dart';
import '../../features/auth/login/login_screen.dart';
import '../../theme/app_theme.dart';
import 'main_shell.dart';

/// Determine, au demarrage, si une session valide existe deja (jeton stocke
/// + verifie aupres de GET /auth/me) avant de choisir l'ecran de depart —
/// evite de flasher l'ecran de connexion a chaque ouverture de l'app alors
/// qu'une session est deja active.
class BootstrapScreen extends StatefulWidget {
  const BootstrapScreen({super.key});

  @override
  State<BootstrapScreen> createState() => _BootstrapScreenState();
}

class _BootstrapScreenState extends State<BootstrapScreen> {
  @override
  void initState() {
    super.initState();
    authService.initialiser();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: authService,
      builder: (context, _) {
        switch (authService.statut) {
          case StatutAuth.indetermine:
            return const _EcranChargement();
          case StatutAuth.connecte:
            return const MainShell();
          case StatutAuth.deconnecte:
            return const LoginScreen();
        }
      },
    );
  }
}

class _EcranChargement extends StatelessWidget {
  const _EcranChargement();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.primaryDark,
      body: Center(child: CircularProgressIndicator(color: Colors.white)),
    );
  }
}
