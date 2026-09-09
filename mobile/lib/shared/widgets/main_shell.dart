import 'package:flutter/material.dart';
import '../../features/diplomas/diplomas_screen.dart';
import '../../features/home/accueil_screen.dart';
import '../../features/notifications/notification.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/shares/shares_screen.dart';
import '../../features/verifications/verifications_screen.dart';
import '../../theme/app_theme.dart';
import 'app_drawer.dart';
import 'splendid_bottom_nav.dart';

/// Coquille principale post-connexion — barre de navigation basse (pattern
/// mobile), pas la sidebar fixe du web qui ne s'adapte pas aux petits ecrans
/// (voir l'audit qui a motive ce projet). Parametres est accessible via
/// l'icone profil de l'AppBar plutot qu'un 5e onglet, pour garder la barre
/// basse a 4 elements — les plus consultes au quotidien.
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  static const _titres = ['Accueil', 'Mes diplômes', 'Mes partages', 'Vérifications'];

  static const _ecrans = [
    AccueilScreen(),
    DiplomasScreen(),
    SharesScreen(),
    VerificationsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      // Donnees factices — etape 1, meme utilisateur simule que sur AccueilScreen.
      // Le hamburger qui ouvre ce tiroir est ajoute automatiquement par Flutter
      // en tete d'AppBar des que Scaffold.drawer est renseigne (pas besoin de
      // le cabler a la main).
      drawer: AppDrawer(
        prenom: 'Bertrand',
        nom: 'KAMGA',
        matricule: 'INUB-ETU-00214',
        indexActuel: _index,
        onChangerIndex: (i) => setState(() => _index = i),
      ),
      appBar: AppBar(
        title: Text(_titres[_index]),
        actions: [
          _BoutonNotifications(
            nonLues: notificationsFactices.where((n) => n.statut == StatutNotif.nonLue).length,
          ),
          const SizedBox(width: AppSpacing.xs),
        ],
      ),
      body: IndexedStack(index: _index, children: _ecrans),
      bottomNavigationBar: SplendidBottomNav(
        index: _index,
        onChanged: (i) => setState(() => _index = i),
        items: const [
          NavItem(icon: Icons.dashboard_outlined, selectedIcon: Icons.dashboard, label: 'Accueil'),
          NavItem(icon: Icons.workspace_premium_outlined, selectedIcon: Icons.workspace_premium, label: 'Diplômes'),
          NavItem(icon: Icons.ios_share_outlined, selectedIcon: Icons.ios_share, label: 'Partages'),
          NavItem(icon: Icons.fact_check_outlined, selectedIcon: Icons.fact_check, label: 'Vérifs'),
        ],
      ),
    );
  }
}

class _BoutonNotifications extends StatelessWidget {
  const _BoutonNotifications({required this.nonLues});
  final int nonLues;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.xs),
      child: IconButton(
        tooltip: 'Notifications',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const NotificationsScreen()),
        ),
        icon: Badge(
          isLabelVisible: nonLues > 0,
          label: Text('$nonLues'),
          backgroundColor: AppColors.error,
          child: const Icon(Icons.notifications_outlined),
        ),
      ),
    );
  }
}
