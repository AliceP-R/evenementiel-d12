# evenementiel-d12

Outil d'administration des évènements d'**Au Dé 12**. L'équipe crée, modifie, duplique et supprime les évènements
JDS et JDR avec un vrai formulaire, et l'outil les écrit dans Google Agenda en respectant les conventions lues par le
site public [calendrier.au-de12paris.com](https://calendrier.au-de12paris.com) (dépôt `alicep-r/calendrier-d12`).

🔗 **Ouvrir l'outil** (comptes `@au-de12paris.com` autorisés uniquement) :
https://script.google.com/a/macros/au-de12paris.com/s/AKfycbze5U_fOGKcIdlryhaDd8DuwZVP1hbws4DZSkmc9dxZT1Zs5nqLDRWBL1Qkw2yCds_yMA/exec

📄 Spécifications : [docs/specs.md](docs/specs.md)

## Contenu

| Fichier | Rôle |
|---|---|
| `apps-script/Code.gs` | Fonctions serveur : lecture, écriture et suppression dans Google Agenda, contrôle d'accès, journal |
| `apps-script/Conventions.gs` | Traduction formulaire ↔ conventions Google Agenda (description, horaires, répétition) |
| `apps-script/Categories.gs` | Catégories = couleurs Google Agenda (identiques à `COULEURS` du site public) |
| `apps-script/Charte.gs` | Charte : modèles d'évènements et textes types, enregistrés dans un Google Sheet |
| `apps-script/Index.html`, `Style.html`, `Script.html` | Interface (HTML, CSS et JS vanilla, sans build) |
| `apps-script/appsscript.json` | Manifeste : fuseau, service avancé Calendar, accès réservé au domaine |
| `tests/` | Tests des conventions : `node --test tests/*.test.js` (Node 18 ou plus, aucune dépendance) |

## Mise en service (une seule fois)

À faire avec un compte `@au-de12paris.com` qui peut **modifier les deux agendas** JDS et JDR :

1. Sur [script.google.com](https://script.google.com) : **Nouveau projet**, nommé par exemple « Au Dé 12 · Admin évènements ».
   C'est un projet **séparé** de celui du site public.
2. **Paramètres du projet** (⚙️) : cocher « Afficher le fichier manifeste appsscript.json ».
3. Recréer chaque fichier du dossier `apps-script/` avec **le même nom** et y coller son contenu :
   - fichiers script (`+` → Script) : `Code`, `Conventions`, `Categories`, `Charte` ;
   - fichiers HTML (`+` → HTML) : `Index`, `Style`, `Script` ;
   - remplacer le contenu de `appsscript.json`.
4. **Paramètres du projet** → **Propriétés du script** → ajouter `EMAILS_AUTORISES` avec les deux adresses,
   séparées par une virgule (ex. `alice@au-de12paris.com,camille@au-de12paris.com`).
5. **Déployer** → **Nouveau déploiement** → type **Application Web** :
   - Exécuter en tant que : **Moi** ;
   - Qui a accès : **Tous les utilisateurs de au-de12paris.com**.
   
   Autoriser l'accès à Google Agenda et à Google Sheets quand Google le demande.
6. Ouvrir l'URL de l'application web (à garder en favori). Le journal (Google Sheet) se crée au premier enregistrement,
   dans le Drive du compte qui a déployé. Le partager avec l'équipe si besoin.

### Mettre à jour après une modification du code

Recoller les fichiers modifiés, puis **Déployer** → **Gérer les déploiements** → ✏️ → Version : **Nouvelle version** →
Déployer. L'URL ne change pas.

## Charte : modèles et textes types

Bouton **🎨 Charte** en haut de l'outil. Tout le monde peut y modifier, sans toucher au code :

- **Modèles d'évènements** : le formulaire habituel prérempli (calendrier, catégorie, titre, horaires, description,
  inscription, liens, notes internes), sans date. On le choisit en haut de **Nouvel évènement**, puis on met la date.
  Le bouton **📌 Modèle** d'un évènement de la liste en fait un modèle en un clic.
- **Textes types** : phrases réutilisables (présentation d'une soirée, mentions, règles…), à insérer dans la
  description avec la liste « ✍️ Insérer un texte type… » sous le champ.

Modifier ou supprimer un modèle ne change pas les évènements déjà créés. Chaque changement est noté dans le journal.
Les modèles sont enregistrés dans un Google Sheet « Au Dé 12 · Charte », créé au premier enregistrement dans le Drive
du compte qui a déployé (propriété `CHARTE_ID`). Il sert de sauvegarde : on modifie depuis l'outil.

Pour que Clémence puisse s'en servir, ajouter son adresse à `EMAILS_AUTORISES` (Propriétés du script).

## Bon à savoir

- Le site public n'est pas modifié : il continue de lire Google Agenda comme avant.
- On peut toujours modifier un évènement directement dans Google Agenda : l'outil relit les conventions
  (`---interne---`, `Inscription :`, etc.) à l'ouverture du formulaire.
- Les catégories sont listées dans `Categories.gs` **et** dans `COULEURS` de `docs/index.html` du site public :
  en cas de changement, modifier les deux.
- Flux iCal : chaque agenda Google en fournit un (Paramètres de l'agenda → « Adresse publique au format iCal »).
