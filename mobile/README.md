# INUBIL Verify — Mobile (espace étudiant)

Application Flutter de l'espace étudiant d'INUBIL Verify : consulter ses diplômes ancrés sur la blockchain, générer des liens de partage, suivre les vérifications reçues et les notifications. Remplace le dashboard web côté étudiant, dont la sidebar fixe ne s'adapte pas aux petits écrans.

Fait partie du monorepo [`INUBIL-VERIFY`](../) — voir le `CLAUDE.md` à la racine pour le backend (`../backend/`) et le frontend web (`../inubil-verify-front/`).

## Prérequis

- Flutter SDK (voir `environment.sdk` dans `pubspec.yaml` pour la version exacte)
- Le backend NestJS lancé (`docker-compose up` depuis `../`, ou `npm run start:dev` depuis `../backend/`) — voir le `CLAUDE.md` racine

## Lancer l'app

```bash
flutter pub get
flutter run -d chrome     # ou : -d windows, -d <id d'un appareil/émulateur Android>
```

Pour voir le design tel qu'il est pensé sur Chrome : `F12` → icône "device toolbar" (`Ctrl+Shift+M`) → choisir un profil mobile. L'app n'a aucun breakpoint desktop, elle est pensée uniquement pour un écran de téléphone.

## Pointer vers un backend

L'URL de base de l'API est définie dans `lib/core/api/api_config.dart` (`http://localhost:3000` par défaut). Pour la changer sans toucher au code :

```bash
flutter run -d chrome --dart-define=API_BASE_URL=https://mon-backend.example.com
```

**`localhost` ne veut pas dire la même chose partout** — c'est la source la plus fréquente de "l'app n'arrive pas à se connecter" :

| Cible | Valeur à utiliser |
|---|---|
| Chrome, Windows/macOS/Linux desktop | `http://localhost:3000` (par défaut, rien à faire) |
| Simulateur iOS | `http://localhost:3000` (par défaut) |
| Émulateur Android | `http://10.0.2.2:3000` — `localhost` sur l'émulateur pointe vers l'émulateur lui-même, pas la machine hôte |
| Appareil Android/iOS réel | IP LAN de la machine qui fait tourner le backend (ex. `http://192.168.1.x:3000`), sur le même réseau Wi-Fi |

Sur Android, seuls les builds **debug** autorisent le HTTP en clair (`android/app/src/debug/AndroidManifest.xml`) — un build release/profile doit pointer vers un backend HTTPS.

## Comptes de test

Aucun compte n'est créé par cette app (pas d'écran d'inscription) — se connecter avec un compte étudiant existant côté backend.

## Vérifier son travail

```bash
flutter analyze
flutter test
flutter build web   # sanity check de compilation avant de committer
```

## Structure

```
lib/
  core/
    api/       client HTTP (ApiClient, gestion des erreurs, config d'URL)
    auth/       etat d'authentification (AuthService), stockage des jetons
  features/
    auth/       connexion, mot de passe oublie
    home/       Accueil (statistiques, diplomes recents)
    diplomas/   Mes diplomes (liste, detail, PDF, partage)
    shares/     Mes partages (creation, revocation)
    notifications/
    verifications/
    settings/   Parametres, Securite du compte, Preferences de notification
  shared/widgets/  drawer, barre de navigation basse, etats de chargement/erreur...
  theme/           couleurs, typographie, espacements — alignes sur l'implementation
                   web reelle (inubil-verify-front), pas sur la maquette DESIGN.md
```

## Limites connues

- **Aide & support** (dans Paramètres) est un stub — aucun contenu ni endpoint backend n'existe encore pour ça.
- Le badge visuel téléchargeable (image pour LinkedIn/CV, équivalent de `DiplomaBadge` côté web) n'est pas implémenté — à faire en Flutter natif.
- iOS bloque le HTTP en clair par défaut (App Transport Security) — pas encore de configuration d'exception pour tester contre un backend de dev non-HTTPS.
- Jamais testé sur un appareil physique ni buildé pour Android/iOS — seulement `flutter analyze` / `flutter test` / `flutter build web`.
