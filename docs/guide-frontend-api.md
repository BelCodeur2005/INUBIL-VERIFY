# Guide Frontend - Connecter Angular à l'API INUBIL Verify

> Ce guide t'accompagne pas à pas. Il ne te donne pas du code à copier-coller —
> il t'explique **quoi faire**, **pourquoi**, et **comment vérifier** que tu es sur la bonne voie.
> Lis chaque section dans l'ordre avant de passer à la suivante.

---

## Sommaire

1. [Comprendre comment Angular parle à l'API](#1-comprendre-comment-angular-parle-à-lapi)
2. [Ton premier outil : Swagger](#2-ton-premier-outil--swagger)
3. [Préparer ton projet Angular](#3-préparer-ton-projet-angular)
4. [Comprendre l'authentification JWT](#4-comprendre-lauthentification-jwt)
5. [Organiser ton code : les services](#5-organiser-ton-code--les-services)
6. [Automatiser le token : l'intercepteur](#6-automatiser-le-token--lintercepteur)
7. [Protéger les pages : les guards](#7-protéger-les-pages--les-guards)
8. [Afficher les erreurs à l'utilisateur](#8-afficher-les-erreurs-à-lutilisateur)
9. [Par où commencer concrètement](#9-par-où-commencer-concrètement)

---

## 1. Comprendre comment Angular parle à l'API

### L'analogie du restaurant

Imagine un restaurant. Toi tu es la cliente (l'interface Angular que tu construis). La cuisine c'est le serveur NestJS qui contient toute la logique métier. **Tu ne rentres jamais directement en cuisine** - tu passes ta commande à un serveur, qui te ramène le résultat. Ce serveur, c'est l'API.

Dans ce projet concrètement :
- Ton composant Angular dit "je veux la liste des diplômes"
- Il envoie une **requête HTTP** vers `http://localhost:3000/documents`
- Le backend vérifie qui tu es, va chercher les données en base, et te les retourne
- Angular reçoit la réponse et tu l'affiches dans ton template

### Les types de requêtes

Il y a 4 types d'actions possibles avec une API REST :

- **GET** : lire des données (afficher une liste, afficher un détail)
- **POST** : créer quelque chose ou déclencher une action (créer un diplôme, valider, se connecter)
- **PATCH** : modifier partiellement une donnée existante
- **DELETE** : supprimer

### Les codes de réponse - comment l'API te parle

Chaque réponse de l'API vient avec un **code numérique** qui t'indique si ça s'est bien passé ou non :

- `200` ou `201` → tout s'est bien passé
- `400` → tu as envoyé des données incorrectes ou manquantes
- `401` → tu n'es pas connectée (token manquant ou expiré)
- `403` → tu es connectée mais tu n'as pas le droit de faire ça
- `404` → ce que tu cherches n'existe pas
- `500` → erreur côté serveur (ce n'est pas de ton côté)

> Retiens bien ces codes - tu vas les voir souvent dans l'onglet "Réseau" des outils développeur de ton navigateur.

---

## 2. Ton premier outil : Swagger

**Avant d'écrire une seule ligne de code Angular, tu dois maîtriser Swagger.**
C'est la documentation interactive de l'API. Elle te permet de tester chaque endpoint directement dans ton navigateur.

### Comment y accéder

Lance le backend avec Docker, puis ouvre dans ton navigateur :
```
http://localhost:3000/api/docs
```

Tu vois une liste de tous les "groupes" d'endpoints : Auth, Documents, Universités, Vérification publique, etc.

### Apprendre à lire un endpoint

Clique sur n'importe quel endpoint pour le déplier. Tu vois :
- La **méthode** (GET, POST, PATCH, DELETE) et la **route** (`/documents`, `/auth/login`, etc.)
- Les **paramètres** attendus (dans l'URL ou dans le corps de la requête)
- Les **réponses possibles** avec leur structure exacte

Cette structure de réponse, c'est exactement ce que tu vas recevoir dans Angular. C'est là que tu sauras quels champs existent et comment ils s'appellent.

### Se connecter dans Swagger pour tester

La plupart des endpoints nécessitent d'être authentifiée. Voici comment faire :

1. Trouve `POST /auth/login` et clique dessus
2. Clique sur "Try it out"
3. Remplace le contenu du champ par les identifiants de test (admin@inubil.com / Admin123!)
4. Clique "Execute"
5. Dans la réponse en bas, copie la valeur du champ `access_token`
6. Tout en haut de la page Swagger, clique sur le bouton **"Authorize"** (icône cadenas vert)
7. Colle le token dans le champ qui apparaît et valide

Maintenant tous tes tests dans Swagger seront authentifiés automatiquement.

### La règle d'or

> **Teste toujours un endpoint dans Swagger avant de l'utiliser dans Angular.**
> Si ça ne fonctionne pas dans Swagger, ça ne fonctionnera pas dans ton code.
> Si ça fonctionne dans Swagger mais pas dans Angular, le problème vient de ton code Angular.

Passe une bonne heure à explorer Swagger. Teste les endpoints qui correspondent aux pages que tu vas créer. Observe les réponses. Tu seras beaucoup plus à l'aise quand viendra le moment de coder.

---

## 3. Préparer ton projet Angular

### Créer le projet

Dans le dossier `frontend/` du projet, génère une nouvelle application Angular. Utilise le générateur officiel Angular CLI avec les options `--routing` (pour la navigation entre pages) et `--style=scss` (pour les styles).

Cherche dans la documentation Angular comment créer un nouveau projet - la commande commence par `ng new`.

### Les deux environnements

Angular permet d'avoir des configurations différentes selon si tu es en développement ou en production. Dans ton cas, l'URL de l'API sera différente :
- En développement : `http://localhost:3000`
- En production (futur) : l'URL du vrai serveur

Angular génère automatiquement un dossier `src/environments/` avec deux fichiers. Configure l'URL de l'API dans ces fichiers. Tu y reviendras souvent - chaque service devra utiliser cette URL plutôt qu'une URL codée en dur.

### Activer le module HTTP

Angular ne sait pas faire de requêtes HTTP par défaut - il faut activer le module `HttpClientModule`. Cherche dans la documentation Angular comment ajouter `HttpClientModule` dans `AppModule`. Sans ça, rien ne fonctionnera.

### Vérifier que tout marche

Lance ton application Angular avec `ng serve`. Elle doit s'ouvrir sur `http://localhost:4200` sans erreur. Si tu vois des erreurs dans la console, règle-les avant de continuer.

---

## 4. Comprendre l'authentification JWT

### Ce qu'est un token JWT

Quand une utilisatrice se connecte avec son email et son mot de passe, le backend lui retourne un **token** - une longue chaîne de caractères chiffrée. Ce token est comme un badge d'accès. Chaque fois qu'elle fait une requête à l'API, elle présente ce badge pour prouver son identité.

Le token ressemble à ça (c'est un exemple, pas un vrai token) :
```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.signature
```

Il contient des informations encodées : l'identifiant de l'utilisatrice, son rôle, la date d'expiration...

### Où garder ce token

Tu dois sauvegarder ce token quelque part pour le réutiliser sur chaque requête. La solution la plus simple est le `localStorage` du navigateur - c'est un espace de stockage propre à chaque onglet/navigateur, qui persiste même si on recharge la page.

Cherche dans la documentation JavaScript comment utiliser `localStorage.setItem()`, `localStorage.getItem()` et `localStorage.removeItem()`.

### Le token expire

L'`access_token` de cette API expire au bout de **15 minutes**. Passé ce délai, toutes tes requêtes retourneront une erreur 401. Le backend retourne aussi un `refresh_token` (valable 7 jours) qui permet d'obtenir un nouvel `access_token` sans se reconnecter. Tu géreras ça dans l'intercepteur (section 6).

### Ce que tu dois faire à la connexion

Quand l'utilisatrice clique sur "Se connecter" :
1. Tu envoies un `POST /auth/login` avec l'email et le mot de passe
2. Si la réponse est 200, tu sauvegardes le `access_token` et le `refresh_token` dans le localStorage
3. Tu appelles `GET /auth/me` pour récupérer les infos de l'utilisatrice (nom, rôle, permissions)
4. Tu la redirige vers le bon dashboard selon son rôle (voir le fichier `docs/PAGES_APPLICATION.md` pour les redirections)

### Ce que tu dois faire à la déconnexion

1. Appeler `POST /auth/logout` pour invalider la session côté serveur
2. Supprimer les tokens du localStorage
3. Rediriger vers la page de connexion

---

## 5. Organiser ton code : les services

### Pourquoi des services ?

Imagine que tu as 5 pages différentes qui affichent des diplômes. Si tu mets le code d'appel à l'API directement dans chaque composant, tu te répètes 5 fois. Si l'URL change, tu dois modifier 5 fichiers. Les **services** résolvent ce problème : tu écris la logique une seule fois, et tous tes composants l'utilisent.

### La structure recommandée

Crée un dossier `src/app/core/` qui contiendra tout ce qui n'est pas lié à une page spécifique :

```
src/app/core/
├── services/       ← les appels à l'API
├── interceptors/   ← le token automatique (section 6)
├── guards/         ← protection des routes (section 7)
└── models/         ← les interfaces TypeScript
```

### Les interfaces TypeScript (models)

Avant de créer les services, définis la **forme** des données que l'API retourne. Par exemple, si Swagger te montre qu'un document a un champ `numero_unique`, un champ `statut`, un champ `etudiant_nom`, etc. - crée une interface TypeScript qui décrit ça.

Ces interfaces te donnent l'autocomplétion dans ton éditeur et préviennent les erreurs de frappe. Cherche dans la documentation TypeScript comment déclarer une `interface`.

Pour chaque endpoint que tu vas utiliser, regarde la réponse dans Swagger et traduis-la en interface TypeScript.

### Créer un service

Génère un service avec Angular CLI (`ng generate service core/services/auth`). Dans ce service :
- Injecte `HttpClient` dans le constructeur - c'est lui qui fait les requêtes
- Crée une méthode par endpoint que tu utilises
- Chaque méthode retourne un `Observable` - c'est la façon dont Angular gère les données asynchrones

Pour commencer, crée au minimum :
- **AuthService** : login, logout, chargerProfil, refreshToken, estConnecte, getToken
- **DocumentsService** : lister, trouver, creer, uploadPdf, valider, revoquer

Pour les autres modules (utilisateurs, invitations, étudiants...), crée les services au fur et à mesure des pages que tu implémentes.

### Utiliser un service dans un composant

Dans ton composant, injecte le service dans le constructeur. Ensuite, appelle les méthodes du service et abonne-toi avec `.subscribe()` pour recevoir les données quand elles arrivent. Cherche dans la documentation Angular comment utiliser `subscribe()` avec les callbacks `next` (succès) et `error` (échec).

---

## 6. Automatiser le token : l'intercepteur

### Le problème sans intercepteur

Sans intercepteur, pour chaque requête à l'API tu devrais manuellement aller chercher le token dans le localStorage et l'ajouter dans les headers. Ça représente des dizaines de lignes répétées dans tous tes services. Et quand le token expire, il faudrait gérer le renouvellement partout.

### Ce que fait un intercepteur

Un intercepteur Angular intercepte **chaque requête HTTP sortante** avant qu'elle parte. Tu y mets la logique une seule fois :
1. Lire le token dans le localStorage
2. L'ajouter dans le header `Authorization: Bearer <token>`
3. Laisser la requête partir

Et il intercepte aussi **chaque réponse** qui revient :
1. Si la réponse est une erreur 401 (token expiré), appeler `/auth/refresh` pour en obtenir un nouveau
2. Relancer la requête originale avec le nouveau token
3. Si le refresh échoue aussi, déconnecter l'utilisatrice et la rediriger vers la connexion

### Comment créer un intercepteur

Génère un intercepteur avec Angular CLI (`ng generate interceptor core/interceptors/auth`). Il implémente l'interface `HttpInterceptor` avec une méthode `intercept()`. Cherche dans la documentation Angular "HTTP interceptors" pour comprendre comment ça fonctionne.

N'oublie pas d'enregistrer l'intercepteur dans `AppModule` en l'ajoutant au tableau `providers` avec le token `HTTP_INTERCEPTORS`. Sans ça, Angular ne l'utilisera pas.

### Comment tester que l'intercepteur fonctionne

1. Ouvre les outils développeur de Chrome (F12)
2. Va dans l'onglet "Réseau" (Network)
3. Effectue une requête depuis ton application
4. Clique sur la requête dans la liste
5. Regarde l'onglet "Headers" → tu dois voir `Authorization: Bearer eyJ...` dans les "Request Headers"

---

## 7. Protéger les pages : les guards

### Pourquoi des guards ?

Sans guards, n'importe qui peut taper `/admin` dans la barre d'adresse et accéder à la page (même si l'API refusera les données). Les guards vérifient des conditions **avant** qu'Angular affiche une page.

Tu auras besoin de deux guards :

**AuthGuard** - vérifie simplement si l'utilisatrice est connectée. Si non, elle est redirigée vers `/auth/connexion`.

**RoleGuard** - vérifie si le rôle de l'utilisatrice lui permet d'accéder à cette page. Par exemple, seul un `super_admin` peut accéder à `/admin`. Si le rôle ne correspond pas, elle est redirigée vers `/403`.

### Comment configurer les guards sur les routes

Dans ton fichier de routing (`app-routing.module.ts`), chaque route peut avoir une propriété `canActivate` qui liste les guards à exécuter. Pour le RoleGuard, tu passes aussi les rôles autorisés via la propriété `data`.

Cherche dans la documentation Angular "route guards CanActivate" pour voir comment les implémenter et les attacher aux routes.

### Les rôles dans ce projet

Consulte `docs/PAGES_APPLICATION.md` pour voir quelle page est accessible à quel rôle. Les rôles existants sont :
- `super_admin` - tout
- `responsable_universite`, `directeur_pedagogique`, `agent_saisie` - espace université
- `etudiant` - espace étudiant

---

## 8. Afficher les erreurs à l'utilisateur

### Ne laisse jamais une erreur silencieuse

Quand une requête échoue, l'utilisatrice doit comprendre ce qui s'est passé. Une page blanche ou qui ne réagit pas, c'est frustrant. Affiche toujours un message.

### Comment lire le message d'erreur de l'API

Quand l'API retourne une erreur, le corps de la réponse contient un champ `message` qui explique ce qui s'est passé. Dans le callback `error` de ton `subscribe()`, tu peux accéder à `err.error.message` pour récupérer ce texte et l'afficher à l'utilisatrice.

### Les états d'un composant qui appelle l'API

Chaque composant qui fait un appel API devrait gérer trois états :
- **Chargement** : la requête est partie, on attend la réponse → afficher un spinner ou désactiver le bouton
- **Succès** : les données sont arrivées → afficher les données
- **Erreur** : quelque chose a échoué → afficher le message d'erreur

Dans ton composant, crée des variables booléennes comme `chargement` et `erreur` pour gérer ces états, et utilise `*ngIf` dans ton template pour afficher le bon état.

---

## 9. Par où commencer concrètement

Voici un ordre logique pour attaquer le travail. Valide chaque étape avant de passer à la suivante.

### Étape 1 - Maîtriser Swagger (1 à 2 heures)

Avant tout, passe du temps sur `http://localhost:3000/api/docs`. Connecte-toi, teste les endpoints des pages que tu vas coder en premier. Comprends les réponses. Ne saute pas cette étape.

### Étape 2 - Setup de base (demi-journée)

Crée le projet Angular, configure les environments, active HttpClient, crée la structure de dossiers `core/`. Vérifie que `ng serve` lance sans erreur sur `localhost:4200`.

### Étape 3 - Page de connexion (première page concrète)

C'est la page la plus importante - tout passe par elle. Implémente :
1. Le formulaire (email + mot de passe)
2. L'AuthService avec la méthode `login()`
3. La sauvegarde du token dans localStorage
4. La redirection selon le rôle après connexion

Teste : connecte-toi avec `admin@inubil.com / Admin123!` → tu dois être redirigée vers `/admin`.

### Étape 4 - L'intercepteur

Une fois la connexion qui marche, ajoute l'intercepteur. Vérifie dans l'onglet Réseau de Chrome que le header `Authorization` est bien présent sur les requêtes suivantes.

### Étape 5 - Les guards

Ajoute AuthGuard et RoleGuard. Teste en tapant `/admin` dans la barre d'adresse sans être connectée - tu dois être redirigée vers `/auth/connexion`.

### Étape 6 - Le reste des pages

Maintenant que la fondation est solide, implémente les pages dans cet ordre recommandé :
1. Dashboard université (`/universite`) - c'est une page simple de lecture
2. Liste des diplômes (`/universite/diplomes`) - apprendre la pagination
3. Saisie d'un diplôme - formulaire multi-étapes + upload PDF
4. File de validation (`/universite/validation`) - pour le directeur pédagogique
5. Vérification publique (`/verifier` et `/d/:identifiant`) - sans authentification
6. Espace étudiant (`/espace`)
7. Pages admin (`/admin`)

---

## Questions que tu te poseras sûrement

**Comment je sais quels champs envoyer dans un POST ?**

Dans Swagger, déroule l'endpoint POST. Tu vois un "Request body" avec le schéma attendu. Les champs marqués d'un `*` ou marqués comme `required` sont obligatoires.

**Mon appel marche dans Swagger mais pas dans Angular, pourquoi ?**

Les causes les plus fréquentes :
- Tu n'as pas activé HttpClientModule dans AppModule
- L'intercepteur n'est pas enregistré
- Tu as mal orthographié le nom du champ dans ton objet JavaScript
- Tu appelles la mauvaise URL (vérifie l'onglet Réseau de Chrome)

**Comment voir exactement ce qui part et ce qui revient ?**

Ouvre Chrome DevTools (F12) → onglet "Réseau" (Network) → filtre sur "XHR" ou "Fetch". Tu vois toutes les requêtes HTTP, leurs headers, leur corps, et la réponse complète.

**J'ai une erreur CORS dans la console.**

Le backend n'accepte les requêtes que depuis `http://localhost:4200`. Vérifie que ton Angular tourne bien sur ce port (c'est le port par défaut de `ng serve`).

**Je vois du texte "Observable" partout, c'est quoi ?**

Un `Observable` est une façon de représenter des données qui arrivent de manière asynchrone - c'est-à-dire pas immédiatement. Quand tu fais une requête HTTP, la réponse n'arrive pas instantanément. L'Observable te permet de dire "quand les données arriveront, fais ça avec". C'est la raison du `.subscribe()`. Pour les débuts, retiens juste : tu appelles une méthode de service, tu `.subscribe()`, et dans le callback `next` tu reçois les données.

---

*Ce guide fait partie du projet INUBIL Verify - ISTAMA INUBIL, Douala, Cameroun.*
*Pour toute question sur l'API, la documentation complète est sur `http://localhost:3000/api/docs`.*
