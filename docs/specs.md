# Spécifications : outil de gestion des évènements d'Au Dé 12

*Version 1 · octobre 2026*

## 1. Contexte

Au Dé 12 est un bar à jeux de société et de jeux de rôle à Paris, fermé le mardi. Ses évènements sont publiés sur
**calendrier.au-de12paris.com** (dépôt `alicep-r/calendrier-d12`), qui lit deux agendas Google :

| Calendrier | Agenda Google |
|---|---|
| JDS : jeux de société | agenda de groupe `c_b182…@group.calendar.google.com` |
| JDR : jeux de rôle | `gestionjdr@au-de12paris.com` |

Le site s'appuie sur des **conventions écrites à la main** dans Google Agenda :

- la **couleur** donne la catégorie ;
- la **visibilité privée** masque l'évènement ;
- dans la description :
  - le marqueur `---interne---` sépare la partie réservée à l'équipe ;
  - les lignes `Inscription : <lien>` ou `Inscription : aucune` règlent le bouton d'inscription ;
  - les lignes `Vibes :`, `Meetup :`, `Discord :` et `Instagram :` donnent des liens propres à l'évènement.

Ces conventions sont devenues trop compliquées à saisir à la main. Une erreur de frappe peut casser le bouton d'inscription, ou pire, publier une note interne.

## 2. Objectif

Une **interface d'administration** réservée à l'équipe, qui crée, modifie, duplique et supprime les évènements avec
de **vrais champs**. L'outil écrit lui-même les conventions dans Google Agenda.

**Google Agenda reste la source des données** : le site public, son Apps Script et le flux iCal de Google ne changent pas.

## 3. Utilisateurs et accès

- **2 personnes** pour l'instant, toutes avec une adresse `@au-de12paris.com`.
- Pas de rôles : chacune peut tout modifier, en JDS comme en JDR.
- Connexion par **compte Google** :
  - l'application n'est accessible qu'aux comptes du domaine `au-de12paris.com` (réglage du déploiement) ;
  - une liste blanche d'adresses peut s'ajouter dans la propriété `EMAILS_AUTORISES`.
- L'interface d'admin est **séparée du site public** : elle a sa propre adresse, et `index.html` n'est pas touché.

## 4. Fonctionnalités

### 4.1 MVP (étape 1) ✅

| Fonction | Détail |
|---|---|
| Liste | Évènements du mois, regroupés par jour. Filtre Tous / JDS / JDR, navigation mois par mois. Badges : catégorie, 🔒 privé, 🔁 série, 🔗 inscription externe, 🚫 pas d'inscription, 🔐 notes internes. |
| Créer | Formulaire complet (cf. 4.2). |
| Modifier | Même formulaire, prérempli à partir de Google Agenda (les conventions sont relues). |
| Dupliquer | Formulaire prérempli sans répétition ; on change la date puis on enregistre. |
| Supprimer | Avec confirmation. |
| Évènements répétés | Création chaque semaine ou toutes les 2 semaines, avec date de fin facultative. Pour modifier ou supprimer : choix « cette date seulement » ou « toute la série ». |
| Journal | Chaque création, modification ou suppression ajoute une ligne (quand, qui, action, calendrier, titre, date, identifiant) dans un Google Sheet créé automatiquement. Bouton « 📜 Journal ». |
| Garde-fous | Champs obligatoires, liens en `https://`, catégorie cohérente avec le calendrier, avertissement si la date tombe un mardi. |

### 4.1 bis Charte : modèles et textes types ✅

Bouton « 🎨 Charte ». Pas de rôles : toute personne autorisée peut modifier (en particulier Clémence, qui gère la charte).

| Fonction | Détail |
|---|---|
| Modèles d'évènements | Mêmes champs que le formulaire (cf. 4.2), **sans date ni répétition**, plus un nom unique. Créer, modifier, supprimer depuis la Charte, ou « 📌 Modèle » sur un évènement de la liste. |
| Partir d'un modèle | En haut de « Nouvel évènement » : le choix d'un modèle remplit tout le formulaire sauf la date. |
| Textes types | Nom unique + texte. Liste « ✍️ Insérer un texte type… » sous la description publique : insère le texte à l'endroit du curseur. |
| Stockage | Google Sheet « Au Dé 12 · Charte » (onglets « Modèles » et « Textes types », colonnes lisibles), créé au premier enregistrement, propriété `CHARTE_ID`. Écritures sous verrou (deux personnes en même temps ne s'écrasent pas). |
| Journal | Chaque création, modification ou suppression dans la charte ajoute une ligne (calendrier : « Charte »). |

Modifier un modèle ne change pas les évènements déjà créés avec lui.

**Modèles de départ** : ajoutés automatiquement à la première ouverture de l'outil (une seule fois, propriété
`CHARTE_INITIALISEE`). Ensuite, le bouton « 📥 Ajouter les modèles de la charte » ajoute un modèle par catégorie et des textes
types, tirés de [formats-descriptions.md](formats-descriptions.md) § 3, seulement s'ils manquent (même nom). Ils sont
définis dans `MODELES_DE_LA_CHARTE` et `TEXTES_TYPES_DE_LA_CHARTE` (`Charte.gs`).

**Repère « [à compléter] »** : les modèles le mettent là où il faut écrire (titre, présentation, nombre de places…).
L'enregistrement d'un évènement est refusé tant qu'il en reste un dans le titre, la description publique ou les notes
internes.

### 4.1 ter Places, tarif, correction en lot ✅

Cf. [formats-descriptions.md](formats-descriptions.md) § 2.4, 2.6 et 5.

| Fonction | Détail |
|---|---|
| Places | Case « Gérer les inscriptions », nombre (1 à 999), inscription obligatoire ou recommandée, Complet. Ligne `Places : 12, inscription obligatoire` ou `Places : complet` (+ `Inscription : aucune`, et pas de liens par canal). Relue à l'ouverture ; un autre format reste dans la description. Cochée à la création pour les catégories qui ont `inscriptions: true` (`Categories.gs`), 12 places préremplies en BOTC, 15 recommandées en Tables Ouvertes. |
| Tarif | Formule / Tarifs habituels / Consommation minimum (montant) / Autre (texte) / rien. Ligne `Tarif : …`, relue à l'ouverture (texte inconnu = Autre). Obligatoire pour les catégories `tarifObligatoire`. |
| Ordre | Places et Tarif sont ajoutées à la fin de la description publique, sur la ligne suivante si la description finit par `Scénario :`, `Niveau :`, `Animé par :` ou `Organisé par :`, sinon après une ligne vide. |
| Correction en lot | Bouton « 🧹 Corriger en lot » : analyse une période (séries = un évènement), propose par catégorie les corrections de `Corrections.gs` avec aperçu, et ne réécrit (`patch` du titre et de la description) que les évènements cochés. Pour une série, les dates modifiées à part (ex. une Réservation Client sur un Créneau Libre) gardent leur titre, description et couleur : Google Agenda les écrase quand on modifie la série, l'outil les remet (idem pour « modifier toute la série »). La Ligue Ludique (routine Claude) n'est pas touchée. |

### 4.2 Champs du formulaire et correspondance Google Agenda

| Champ | Écrit dans Google Agenda |
|---|---|
| Calendrier (JDS / JDR) | Choix de l'agenda. Pas modifiable après création : dupliquer puis supprimer. |
| Catégorie | `colorId` (cf. 4.3). « Sans catégorie » = pas de couleur. |
| Titre | `summary` |
| Date, début, fin | `start` / `end` en heure de Paris. **Une fin plus tôt que le début signifie le lendemain** (fin de service après minuit). |
| Journée entière + dernier jour | `start.date` / `end.date` (le jour de fin est exclu côté Google, l'outil gère le décalage) |
| Visibilité | Public = `default`, Privé = `private` (masqué par le site public) |
| Description publique | Début de la description |
| Inscription | « Bouton habituel » : aucune ligne. « Lien externe » : ligne `Inscription : <lien>`. « Pas d'inscription » : ligne `Inscription : aucune`. |
| Liens par canal | Lignes `Vibes :`, `Meetup :`, `Discord :`, `Instagram :`. Écrites **seulement avec le bouton habituel** (et pas quand c'est complet), le seul cas où le site les utilise. |
| Places, Tarif | Lignes `Places :` et `Tarif :` (cf. 4.1 ter) |
| Notes internes | Après `---interne---`, **jamais envoyées au public** (coupées par l'Apps Script du site) |
| Répétition | `recurrence` : `RRULE:FREQ=WEEKLY[;INTERVAL=2][;UNTIL=…]` |

Description générée :

```
<description publique>

Inscription : <lien>
Vibes : <lien>

---interne---
<notes internes>
```

Le texte saisi est échappé (`&`, `<`, `>`), car le site public l'insère en HTML. À la relecture, une description saisie
directement dans Google Agenda (HTML, `&nbsp;`, liens `<a>`, tirets longs autour de « interne ») est convertie en texte
simple. La mise en forme (gras, etc.) est donc perdue au premier enregistrement depuis l'outil.

Une répétition créée dans Google Agenda que l'outil ne sait pas représenter s'affiche « Règle définie dans Google Agenda
(conservée) » et n'est pas modifiée. C'est le cas de « 1er samedi du mois », de plusieurs jours par semaine, d'un nombre
d'occurrences fixe, etc.

### 4.3 Catégories (aujourd'hui = couleurs Google Agenda)

Une même couleur n'a pas le même sens en JDS et en JDR. Elles sont définies dans `apps-script/Categories.gs` et
**doivent rester identiques** au tableau `COULEURS` de `docs/index.html` du site public.

| Calendrier | colorId | Catégorie | Bouton | Salle |
|---|---|---|---|---|
| JDS | 3 | Soirée BOTC | inscription | |
| JDS | 5 | Tables Ouvertes | inscription | |
| JDS | 7 | Soirée Découverte | inscription | |
| JDS | 9 | Évènement externe | aucun | |
| JDR | 2 | Réservation Client | aucun | bloque |
| JDR | 3 | Créneau Libre | réservation | libre |
| JDR | 4 | MJ PRO - Vadrouilles & Magie | inscription | bloque |
| JDR | 5 | OS & Initiation | inscription | bloque |
| JDR | 8 | MJ PRO - Campagne Semi-Ouverte | aucun | bloque |
| JDR | 9 | Évènement externe | aucun | bloque |
| JDR | 11 | Créneau prioritaire à la Ligue Ludique | aucun | ligue |

Sans catégorie : pas de bouton, bloque la salle.

### 4.4 Règles conservées (gérées par le site public, rien à changer)

- Pas de bouton pour un évènement terminé.
- Les évènements privés n'apparaissent pas et **ne bloquent pas** la salle dans « La salle est-elle libre ? » (choix confirmé).
- Salle JDR : réservable seulement sur un « Créneau Libre », jamais le mardi, jeudi et samedi prioritaires pour la Ligue Ludique, minimum de commande, etc.

## 5. Architecture

```
 Équipe (compte @au-de12paris.com)
        │  navigateur
        ▼
 Apps Script « admin » (ce dépôt, apps-script/)      ← nouvelle application web, accès : domaine
        │  API Google Calendar (service avancé)
        ▼
 Google Agenda JDS + JDR  ──────────────►  Apps Script public (calendrier-d12, inchangé)
        │                                          │ JSON / JSONP
        │ journal                                  ▼
        ▼                                   calendrier.au-de12paris.com (inchangé)
 Google Sheet « Journal »
```

- **Coût : 0 €.** Pas de serveur, pas de compte supplémentaire, pas de domaine à configurer (le DNS reste chez Wix).
- **Exécution** : l'application tourne avec le compte qui la déploie (`USER_DEPLOYING`). Seul ce compte a besoin des
  droits d'écriture sur les deux agendas. L'adresse de la personne connectée sert au contrôle d'accès et au journal.
- **Code** :
  - `Conventions.gs` : traduction champs ↔ Google Agenda, fonctions pures testées avec Node (`node --test tests/*.test.js`) ;
  - `Code.gs` : appels Google ;
  - `Charte.gs` : modèles et textes types (validation testée avec Node, lecture et écriture du Google Sheet) ;
  - `Index.html`, `Style.html`, `Script.html` : interface en HTML, CSS et JS vanilla, sans build.
- **iCal** : chaque agenda Google fournit déjà une adresse iCal publique (Paramètres de l'agenda → « Adresse publique au format iCal »).

## 6. Étapes suivantes (proposées)

1. **Mise en service du MVP** : déploiement (cf. README), essai sur quelques évènements, puis usage courant.
2. **Confort** :
   - vue calendrier en plus de la liste ;
   - ✅ aperçu de la fenêtre telle qu'elle apparaîtra sur le site : bouton « 👁️ Voir » de la liste et « 👁️ Aperçu sur
     le site » du formulaire (avant d'enregistrer). Reprend `openEventModal()` du site public (description, liens,
     bouton d'inscription) : à garder aligné si le site change ;
   - contrôle des incohérences (conventions mal saisies directement dans Google Agenda) ;
   - recherche.
3. **Catégories éditables** : catégories stockées dans un Google Sheet, modifiables dans l'admin. Le `Code.gs` public les
   renverrait dans le JSON, et `index.html` les lirait au lieu de `COULEURS` écrit en dur. Le site public est modifié
   seulement à cette étape.
4. **Inscriptions (étape 2 du projet)** : formulaire d'inscription côté public, liste des inscrits côté admin, avec un
   minimum de données personnelles (prénom, nombre de personnes, moyen de contact) et une durée de conservation limitée
   (RGPD). Ce sera à spécifier le moment venu.

## 7. Hors périmètre

- Remplacer Google Agenda par une autre base de données (option écartée : trop lourde pour le besoin actuel).
- Paiement, billetterie.
- Modification du site public pendant le MVP.
