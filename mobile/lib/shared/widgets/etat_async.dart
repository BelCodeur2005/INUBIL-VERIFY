import 'package:flutter/material.dart';
import '../../core/api/api_exception.dart';
import '../../theme/app_theme.dart';
import 'message_banner.dart';

/// Etat de chargement centre, reutilise par tout ecran qui attend une reponse
/// API avant de pouvoir afficher son contenu.
class EtatChargement extends StatelessWidget {
  const EtatChargement({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator(color: AppColors.primary));
  }
}

/// Etat d'erreur avec message + bouton Reessayer, dans un ConstrainedBox
/// scrollable pour rester compatible avec RefreshIndicator (tirer-pour-
/// rafraichir doit fonctionner meme quand l'ecran est en erreur).
class EtatErreur extends StatelessWidget {
  const EtatErreur({super.key, required this.message, required this.onReessayer});

  final String message;
  final Future<void> Function() onReessayer;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.screenMargin),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  MessageBanner(texte: message, type: MessageBannerType.erreur),
                  const SizedBox(height: AppSpacing.sm),
                  OutlinedButton.icon(
                    onPressed: onReessayer,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Réessayer'),
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

/// Message d'erreur lisible depuis n'importe quelle exception attrapee sur un
/// appel API (ApiException -> son message reel, sinon message reseau
/// generique — ex. pas de connexion, backend injoignable).
String messageErreurApi(Object erreur) {
  if (erreur is ApiException) return erreur.message;
  return 'Impossible de charger les données. Vérifiez votre connexion.';
}
