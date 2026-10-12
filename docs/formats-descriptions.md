# Format des titres et descriptions d'évènements

*Proposition à relire · octobre 2026 · rien n'est encore appliqué dans l'outil ni dans Google Agenda*

Cette charte fixe une seule façon d'écrire le titre et la description de chaque type d'évènement. Elle part de l'état
des lieux des évènements d'août à décembre 2026 (cf. § 6).

## 1. Règle d'or : ne jamais répéter ce que le site affiche déjà

La fenêtre de détail du site affiche déjà ces informations. On ne les réécrit donc pas dans la description :

| Déjà affiché par le site | À ne pas écrire dans la description |
|---|---|
| Le titre | Une 1re ligne qui reprend le titre |
| La date et les horaires | « Lundi, 19h30 - 23h30 », « Dimanche : 19h - 22h » |
| Le bouton de la catégorie (Discord, Instagram, mail, Meetup, Vibes) | « Pour vous inscrire : Discord / Instagram / mail », « Inscrivez-vous sur Vibes, Discord… » |
| Le lien Instagram du bar (le bouton ouvre toujours la messagerie) | Une ligne `Instagram :` |
| Le salon Discord habituel du bar | Une ligne `Discord :` qui pointe sur ce salon |
| L'absence de bouton des catégories sans bouton | `Inscription : aucune` sur Réservation Client, Campagne, Ligue, Évènement externe, sans catégorie |

## 2. Format commun de la description

```
<Présentation : 1 à 3 phrases, sans titre ni horaire>

Scénario : …        (Soirée BOTC seulement)
Niveau : …          (si utile)
Animé par : …       (MJ, conteur ou conteuse, auteur·ices…)
Places : 12, inscription obligatoire
Tarif : …

Inscription : …     (lignes écrites par l'outil, cf. § 2.2)
Vibes : …
Meetup : …

---interne---
Contact : …
Places : 6 Discord / 6 Vibes
Publié : Discord ✅ 03/10 <lien> · Vibes ⏳ · Meetup —
Notes : …
```

### 2.1 Lignes publiques

Les lignes sont toujours dans cet ordre, avec ces libellés exacts. Une ligne sans objet est supprimée, jamais laissée vide.

| Libellé | Contenu | Exemples |
|---|---|---|
| `Scénario :` | BOTC seulement | `Scénario : Trouble Brewing` |
| `Niveau :` | Si ce n'est pas évident d'après la catégorie | `Niveau : déconseillé aux débutant·es` · `Niveau : en anglais` |
| `Animé par :` | Personne ou groupe qui anime (toujours en public, plus « MJ : » ni « Conteur : ») | `Animé par : Martin` · `Animé par : les autrices du jeu` |
| `Places :` | **Écrite par l'outil** (cf. § 2.4) : total seulement, ou « complet ». La répartition par canal va en interne. | `Places : 15, inscription recommandée` · `Places : complet` |
| `Tarif :` | En JDS, **écrite par l'outil** (case Tarif, § 3.1). En JDR, tapée dans la présentation (cf. § 3.2). | `Tarif : consommation minimum de 90 € pour le groupe` |

### 2.2 Lignes lues par le site (écrites par l'outil)

- `Inscription : <lien>` : seulement si l'inscription se fait **chez l'organisateur** (bouton « S'inscrire sur le site
  de l'organisateur »).
- `Inscription : aucune` : seulement pour **masquer le bouton** d'une catégorie qui en a un (complet, évènement
  accueilli…).
- `Vibes :`, `Meetup :` : seulement le lien de **la page de l'évènement**. `Discord :` seulement pour un salon autre
  que celui du bar. Plus de ligne `Instagram :`.

### 2.3 Partie interne (après `---interne---`)

Mêmes libellés pour tous les types, une ligne sans objet est supprimée (pas de `Notes :` vide) :

| Libellé | Contenu |
|---|---|
| `Contact :` | Client·e, organisateur·ice ou MJ externe, avec son moyen de contact |
| `Places :` | Répartition par canal, ex. `6 Discord / 6 Vibes` |
| `Publié :` | Suivi des publications : `Discord ✅ 03/10 <lien> · Vibes ⏳ · Meetup —` (✅ publié, ⏳ à faire, ❌ annulé, — non prévu) |
| `Inscrit·es :` | Liste des inscrit·es quand l'inscription se fait par message |
| `Notes :` | Tout le reste |

### 2.4 Places : champs de l'outil

Comme le tarif, la ligne `Places :` n'apparaît plus dans le champ « Description publique » du formulaire. On remplit
trois champs, et l'outil écrit la ligne dans Google Agenda à l'enregistrement. À l'ouverture d'un évènement, il relit
la ligne, la retire du texte affiché et remplit les champs.

| Champ du formulaire | Valeur |
|---|---|
| Nombre de places | Un nombre, à remplir à chaque fois (seules les Tables Ouvertes, 15, et les soirées BOTC, 12, sont préremplies) |
| Inscription | « Obligatoire » ou « Recommandée » |
| Complet | Case à cocher |

| Ce qui est rempli | Ligne écrite | Bouton du site |
|---|---|---|
| 12 + Obligatoire | `Places : 12, inscription obligatoire` | Celui de la catégorie |
| 15 + Recommandée | `Places : 15, inscription recommandée` | Celui de la catégorie |
| Complet coché | `Places : complet` | **Masqué automatiquement** (l'outil ajoute `Inscription : aucune`) |

| Catégorie | Champs Places |
|---|---|
| Soirée BOTC, Tables Ouvertes, Soirée Découverte, Vadrouilles & Magie, OS & Initiation | Obligatoires : nombre et inscription, ou Complet |
| Campagne Semi-Ouverte | Seulement la case Complet (pas de bouton à masquer) |
| Évènement externe | Facultatifs ; la jauge réelle va plutôt en interne |
| Réservation Client, Créneau Libre, Ligue Ludique, sans catégorie | Pas de champs Places |

### 2.5 Typographie

- Prix avec une espace : `18 €`, `90 €`.
- Écriture inclusive au point médian : `chacun·e`, `joueur·ses`, `auteur·ices`, `débutant·es`.
- Tiret simple entouré d'espaces dans les titres : `Blood on the Clocktower - Débutant·es`.
- Pas de MAJUSCULES pour un mot entier, pas de « ! » en fin de titre.
- Jamais de texte d'attente du type « [Texte de présentation] » ou « (X places) » dans la partie publique.

## 3. Modèles par catégorie

### 3.1 JDS

**Tarif : case à cocher.** La ligne `Tarif :` n'apparaît plus dans le champ « Description publique » du formulaire :
on coche un choix, et c'est l'outil qui écrit la ligne dans Google Agenda à l'enregistrement, juste après les autres
lignes pratiques. À l'ouverture d'un évènement, l'outil relit cette ligne, la retire du texte affiché et coche le bon
choix (texte différent des deux tarifs connus = « Autre », avec ce texte), comme il le fait déjà pour `Inscription :`.

| Choix | Ligne écrite |
|---|---|
| Formule | `Tarif : formule avec alcool 18 €, sans alcool 16 €` |
| Tarifs habituels | `Tarif : tarifs et fonctionnement habituels du bar` |
| Autre, avec un champ de texte | `Tarif : <texte saisi>` |

Le choix est **obligatoire** (sans choix par défaut) pour Soirée BOTC, Tables Ouvertes et Soirée Découverte, et
**facultatif** pour Évènement externe et sans catégorie (rien de coché = pas de ligne `Tarif :`).

**Soirée BOTC** (`colorId` 3)

- Titre : `Blood on the Clocktower - Débutant·es` ou `Blood on the Clocktower - Intermédiaire` (le niveau est
  dans le titre, pas dans la description)

```
Un jeu de mystère orchestré par le Conteur, où chacun·e incarne un rôle unique dans le village de Ravenswood, hanté par un démon. Pouvoirs secrets la nuit, votes et bluff le jour. Même éliminé·e, vous influencez encore la partie !

Scénario : Trouble Brewing
Animé par : Martin
Places : 12, inscription obligatoire
Tarif : formule avec alcool 18 €, sans alcool 16 €
```

**Tables Ouvertes** (`colorId` 5)

- Titres : `Tables Ouvertes du Lundi`, `Tables Ouvertes du Jeudi`, `S.A.D : Soirée Anti-Déprime du Dimanche`

```
Les tables ouvertes sont des espaces de jeu inclusifs où chacun·e est bienvenu·e. Découvrez de nouvelles connaissances, de nouveaux univers, de nouvelles mécaniques, de nouveaux jeux et créez de nouveaux liens dans une ambiance bienveillante et sans prise de tête !

Places : 15, inscription recommandée
Tarif : tarifs et fonctionnement habituels du bar
```

Pour la S.A.D, on ajoute en tête : `Passez une soirée jeux & puzzles en bonne compagnie : une table ouverte du dimanche pour fuir la déprime !`

**Soirée Découverte** (`colorId` 7)

- Titre : `Soirée Découverte - <Jeu>`, ex. `Soirée Découverte - Le Conseil d'Anderian`

```
<Présentation du jeu en 2 ou 3 phrases>

Animé par : les auteurs du jeu
Places : <nombre>, inscription obligatoire
Tarif : tarifs et fonctionnement habituels du bar
```

Si la soirée a un tarif particulier, on coche « Autre », ex. pour Mystères à Bréval :
`Tarif : 5 € + 1 consommation à l'arrivée, puis 1 consommation toutes les 2h (nourriture obligatoire avec de l'alcool)`.

### 3.2 JDR

Pas de préfixe `JDR - ` : le site distingue déjà les deux calendriers (filtre, couleurs, compteurs).

**Réservation Client** (`colorId` 2)

- Titre : `Réservation Client`
- Description publique : toujours la même phrase, `📌 Cette session est réservée par un client.`
- Interne : `Contact : Tristan (Discord)`, puis `Notes :` si besoin (ex. `tous les 2e mercredis du mois`).

**Créneau Libre** (`colorId` 3)

- Titre : `Créneau Libre`
- On garde le bouton « Demander à réserver la salle » (il ouvre Discord, Instagram ou le mail) : plus de
  `Inscription : aucune`. La description précise de ne pas passer par le système de réservation classique.

```
Ce créneau est ouvert à la réservation pour votre table de jeu de rôle !

⚠️ Ne passez pas par le système de réservation classique du bar : envoyez-nous un message sur Discord, Instagram ou par mail.

Tarif : consommation minimum de 90 € par table
```

**MJ PRO - Vadrouilles & Magie** (`colorId` 4)

- Titre : `Vadrouilles & Magie`, ou `Vadrouilles & Magie : <thème>` pour une session à thème (ex. `Vadrouilles & Magie : Vilains`)

```
<Thème de la session en 1 phrase, si session à thème>

Vadrouilles & Magie : comédien·nes, auteur·ices et MJ professionnel·les qui créent des parties de JDR sur mesure, avec des scénarios uniques. Spécialistes de Donjons & Dragons et de Cyberpunk RED, avec un focus sur l'immersion, l'interprétation et les backgrounds.

Places : <nombre>, inscription obligatoire
Tarif : 30 € par personne pour le MJ + consommation minimum de 90 € par table
```

**OS & Initiation** (`colorId` 5)

- Titre : `Initiation <Jeu>` ou `One-shot <Jeu>`, ex. `Initiation Daggerheart`, `One-shot Sérum`

```
<Présentation du jeu en 2 ou 3 phrases>

Niveau : en anglais
Animé par : Clémence
Places : <nombre>, inscription obligatoire
Tarif : consommation minimum de 90 € pour le groupe
```

**MJ PRO - Campagne Semi-Ouverte** (`colorId` 8)

- Titre : `Campagne <Nom>`, ex. `Campagne L'Office des Méandres`
- Pas de ligne `Tarif :` (campagne récurrente).

```
Campagne semi-ouverte de D&D 5e, les 2e et 4e vendredis du mois.

Animé par : Balthazar
Places : complet
```

**Créneau prioritaire à la Ligue Ludique** (`colorId` 11)

Ces évènements sont écrits par une **routine Claude**. Le format ci-dessous est une proposition à reporter dans la
consigne de la routine si on la retient, pas dans l'outil :

- Titre : `La Ligue Ludique`
- Créneau pas encore réservé : pas de ligne `Inscription :`, qui affiche aujourd'hui « S'inscrire sur le site de
  l'organisateur » sur un créneau sans partie.

  ```
  ⏳ Pas encore réservé : la Ligue Ludique est prioritaire sur ce créneau jusqu'au dernier moment.

  Pour plus d'informations : https://www.ligue-ludique.fr/lassociation-ligue-ludique-jeux-de-roles-paris/
  ```
- Créneau réservé : le nom de la partie passe en public, et le lien d'inscription pointe sur le sujet du forum.

  ```
  Partie de la Ligue Ludique : NUMENERA Vortex

  Inscription : https://www.ligue-ludique.fr/forum/viewtopic.php?p=34276#p34276
  ```

### 3.3 Nouvelle catégorie « Évènement externe » (à créer)

Pour les évènements **organisés par d'autres** et accueillis au bar : Joueurs Anonymes, ChessBar, soirées
Marie&TheSapphics, tournoi Machicoulis, etc.

- Couleur **Myrtille** (`colorId` 9) dans les deux calendriers, **sans bouton**. Si l'organisateur gère les inscriptions, on choisit « Lien d'inscription
  externe » et le site affiche « S'inscrire sur le site de l'organisateur ». En JDR, elle bloque la salle.
- Titre : le nom de l'évènement tel que l'organisateur l'appelle, sans jauge (`ChessBar`, pas `CHESSBAR x12`).

```
<Présentation de la soirée et de qui l'organise, en 1 à 3 phrases>

Organisé par : Joueurs Anonymes
```

La ligne `Organisé par :` est supprimée si la présentation nomme déjà l'organisateur (ex. « ChessBar est un concept… »).

- Interne : `Contact :` et `Places :` (jauge réelle, ex. `12`).

Myrtille n'est utilisée par aucun évènement d'août à décembre. Créer la catégorie demande une modification **du site public aussi**
(tableau `COULEURS` de `docs/index.html`, en même temps que `Categories.gs`).

### 3.4 Sans catégorie

Réservé aux **privatisations** et aux **fermetures** :

- Titre : `Privatisation - <Nom>` ou `Fermeture estivale`
- Visibilité : publique, pour que le site montre le bar ou la salle occupé·e (un évènement privé ne bloque pas la salle).
- Pas de description publique ; en interne : `Contact :` et `Notes :`.

## 4. Ce que l'outil pourrait reprendre (à décider ensuite)

Rien n'est encore fait. Pistes possibles une fois la charte validée :

1. Préremplir la description avec le modèle de la catégorie choisie, sans écraser un texte déjà saisi.
2. Refuser l'enregistrement tant qu'un repère « [à compléter] » reste dans la description publique.
3. Retirer le champ Instagram, et ne plus proposer « Pas d'inscription » quand la catégorie n'a pas de bouton.
4. Ajouter la catégorie « Évènement externe ».
5. Case Tarif pour les évènements JDS : Formule, Tarifs habituels ou Autre (champ de texte).
6. Champs Places (nombre, inscription obligatoire ou recommandée, Complet), avec le bouton masqué automatiquement quand c'est complet.

## 5. Corriger les évènements existants (à décider ensuite)

Réécrire les évènements à venir au nouveau format dans Google Agenda, catégorie par catégorie, seulement après accord.

## 6. État des lieux (août à décembre 2026)

**Doublons**
- Titre répété en 1re ligne dans la plupart des JDS d'octobre.
- Horaires répétés dans toutes les Tables Ouvertes et S.A.D.
- « Pour vous inscrire : Discord / Instagram / mail » dans tous les OS & Initiation et Vadrouilles & Magie.
- Lignes `Instagram :` et `Discord :` (salon du bar) dans les JDS d'octobre.
- `Inscription : aucune` sur des catégories sans bouton (Réservation Client, Campagne, Ligue, sans catégorie).

**Incohérences**
- Places écrites de 5 façons différentes, et parfois en contradiction avec la partie interne (16 en public, 8 + 8 en interne).
- Tarifs : « 18€ » ou « 18 € », « Prix MJ : … | … », « Prix : … + … ». Minimum de consommation à 80 € (Campagne) ou à
  90 € (ailleurs). Aucun tarif sur les OS & Initiation. Le Conseil d'Anderian a deux tarifs différents (17/09 et 23/10).
- MJ et conteur : en public ou en interne selon les évènements. Un BOTC annonce « Les Maîtres Dé Jeux » en public et
  « conteur Tanguy » en interne.
- « COMPLET » écrit dans le texte alors que le bouton d'inscription reste affiché.
- Écriture inclusive (`accompagné.e.s` / `accompagné·es`) et tirets (`-`, `–`, `—`) mélangés.
- Partie interne : `Places/Publié/Notes`, `Réservation de`, `Client`, `MJ`, `Statut`, `Type`… et beaucoup de
  `---interne---` ou de `Notes :` vides.
- Titres : préfixe « JDR - » redondant, « Tables Ouvertes - Jeudi » ou « du Jeudi ! », « Réservation client » ou « Client », « INITIATION » ou
  « Initiation », faute « Découvertre ».

**À corriger, même sans changer de format**
- Nom des clients dans la partie **publique** de Réservations Client publiques en août et septembre (« Clémence »,
  « Théo Rouy », « Lucas Azer »…).
- Textes d'attente « [Texte de présentation] », « (X places) », « [à compléter] » restés dans des évènements (privés pour l'instant).
- Créneau Libre : le bouton de réservation est masqué par `Inscription : aucune` dans toutes les descriptions.
- Ligue Ludique : 3 variantes de texte. `Inscription : <lien>` sur des créneaux pas encore réservés. Nom de la partie
  seulement en interne.
- Couleurs hors catégorie : JDR 7 (« Meer ! »), JDR 10 (« Fermé »), JDS 4 (Privatisation Marie&TheSapphics).
- Liens « View Apollo event » restés des anciennes publications (septembre).
- Machicoulis (tournoi accueilli) en catégorie Soirée Découverte, et capacité dans le titre (`CHESSBAR x12`, `Joueurs Anonymes x20`).
