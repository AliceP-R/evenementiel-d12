// Charte d'Au Dé 12 : modèles d'évènements et textes types
//
// Modifiables dans l'outil (bouton « 🎨 Charte »), par toute personne autorisée.
//   - Modèle d'évènement : formulaire prérempli (calendrier, catégorie, titre, horaires, description,
//     inscription, liens, notes internes). On le choisit en haut du formulaire « Nouvel évènement ».
//   - Texte type : phrase ou paragraphe réutilisable (mentions, présentation d'une soirée…),
//     inséré dans la description en un clic.
//
// Stockage : Google Sheet « Au Dé 12 · Charte », un onglet par liste, créé à la première ouverture de l'outil
// avec les modèles de la charte (propriétés CHARTE_ID et CHARTE_INITIALISEE). Le Sheet sert de sauvegarde :
// on modifie depuis l'outil.

const LISTES_CHARTE = {
  modeles: {
    onglet: 'Modèles',
    nom: 'modèle',
    colonnes: [
      ['id', 'Identifiant'], ['nom', 'Nom du modèle'], ['calendrier', 'Calendrier'], ['colorId', 'Catégorie (couleur)'],
      ['titre', 'Titre'], ['heureDebut', 'Début'], ['heureFin', 'Fin'], ['visibilite', 'Visibilité'],
      ['descriptionPublique', 'Description publique'], ['inscriptionMode', 'Inscription'], ['inscriptionUrl', "Lien d'inscription"],
      ['vibes', 'Vibes'], ['meetup', 'Meetup'], ['discord', 'Discord'], ['instagram', 'Instagram'], ['notesInternes', 'Notes internes'],
      // Ajoutées après les autres : un Sheet déjà créé garde ses colonnes, les nouvelles s'ajoutent à droite
      ['placesGerer', 'Gérer les inscriptions (oui)'], ['placesNombre', 'Places'], ['placesInscription', 'Inscription obligatoire / recommandee'],
      ['placesComplet', 'Complet (oui)'], ['tarifChoix', 'Tarif (formule, habituel, minimum, autre)'], ['tarifMontant', 'Montant minimum'],
      ['tarifTexte', 'Tarif (texte si autre)']
    ]
  },
  textes: {
    onglet: 'Textes types',
    nom: 'texte type',
    colonnes: [['id', 'Identifiant'], ['nom', 'Nom'], ['texte', 'Texte']]
  }
};

// Repère à laisser dans un modèle là où il faut écrire quelque chose :
// l'outil refuse d'enregistrer un évènement tant qu'il en reste un (cf. docs/formats-descriptions.md § 4).
const A_COMPLETER = '[à compléter]';
const REPERE_A_COMPLETER = /\[\s*à compléter[^\]]*\]/i;

// Modèles et textes types de départ, tirés de docs/formats-descriptions.md (§ 3).
// Bouton « 📥 Ajouter les modèles de la charte » : ajoute ceux qui manquent (même nom), sans toucher aux autres.
// Une fois ajoutés, ils se modifient dans l'outil comme les autres.
const TEXTES_DE_LA_CHARTE = {
  botc: "Un jeu de mystère orchestré par le Conteur, où chacun·e incarne un rôle unique dans le village de Ravenswood, hanté par un démon. Pouvoirs secrets la nuit, votes et bluff le jour. Même éliminé·e, vous influencez encore la partie !",
  tablesOuvertes: "Les tables ouvertes sont des espaces de jeu inclusifs où chacun·e est bienvenu·e. Découvrez de nouvelles connaissances, de nouveaux univers, de nouvelles mécaniques, de nouveaux jeux et créez de nouveaux liens dans une ambiance bienveillante et sans prise de tête ! Pensez à vous inscrire, pour que personne ne se retrouve isolé·e !",
  sad: "Passez une soirée jeux & puzzles en bonne compagnie : une table ouverte du dimanche pour fuir la déprime !",
  reservationClient: "📌 Cette session est réservée par un client.",
  creneauLibre: "Ce créneau est ouvert à la réservation pour votre table de jeu de rôle !\n\n⚠️ Ne passez pas par le système de réservation classique du bar : envoyez-nous un message sur Discord, Instagram ou par mail.",
  vadrouilles: "Vadrouilles & Magie : comédien·nes, auteur·ices et MJ professionnel·les qui créent des parties de JDR sur mesure, avec des scénarios uniques. Spécialistes de Donjons & Dragons et de Cyberpunk RED, avec un focus sur l'immersion, l'interprétation et les backgrounds."
};

const presentationACompleter = quoi => A_COMPLETER.replace(']', ' : ' + quoi + ']');

// Places et Tarif : champs du formulaire (l'outil écrit les lignes), cf. charte § 2.4 et 2.6
const MODELES_DE_LA_CHARTE = (() => {
  const T = TEXTES_DE_LA_CHARTE;
  const m = (nom, calendrier, colorId, titre, descriptionPublique, options) => Object.assign({
    nom, calendrier, colorId, titre, descriptionPublique, notesInternes: '', visibilite: 'publique',
    placesGerer: '', placesNombre: '', placesInscription: 'obligatoire', tarifChoix: '', tarifMontant: '', tarifTexte: ''
  }, options);
  const inscrits = (nombre, mode) => ({ placesGerer: 'oui', placesNombre: nombre || '', placesInscription: mode || 'obligatoire' });
  const tablesOuvertes = Object.assign(inscrits('15', 'recommandee'), { tarifChoix: 'habituel' });
  return [
    m('Soirée BOTC', 'jds', '3', 'Blood on the Clocktower - Débutant·es',
      T.botc + '\n\nScénario : Trouble Brewing\nAnimé par : ' + A_COMPLETER, Object.assign(inscrits('12'), { tarifChoix: 'formule' })),
    m('Tables Ouvertes du Lundi', 'jds', '5', 'Tables Ouvertes du Lundi', T.tablesOuvertes, tablesOuvertes),
    m('Tables Ouvertes du Jeudi', 'jds', '5', 'Tables Ouvertes du Jeudi', T.tablesOuvertes, tablesOuvertes),
    m('S.A.D du Dimanche', 'jds', '5', 'S.A.D : Soirée Anti-Déprime du Dimanche', T.sad + '\n\n' + T.tablesOuvertes, tablesOuvertes),
    m('Soirée Découverte', 'jds', '7', 'Soirée Découverte - ' + A_COMPLETER,
      presentationACompleter('présentation du jeu en 2 ou 3 phrases'), Object.assign(inscrits(), { tarifChoix: 'habituel' })),
    m('Réservation Client', 'jdr', '2', 'Réservation Client', T.reservationClient, { notesInternes: 'Contact : ' + A_COMPLETER }),
    m('Créneau Libre', 'jdr', '3', 'Créneau Libre', T.creneauLibre, { tarifChoix: 'minimum', tarifMontant: '90' }),
    m('Vadrouilles & Magie', 'jdr', '4', 'Vadrouilles & Magie', T.vadrouilles, Object.assign(inscrits(), {
      tarifChoix: 'autre', tarifTexte: '30 € par personne pour le MJ + consommation minimum de 90 € par table'
    })),
    m('Initiation / One-shot', 'jdr', '5', 'Initiation ' + A_COMPLETER,
      presentationACompleter('présentation du jeu en 2 ou 3 phrases') + '\n\nAnimé par : ' + A_COMPLETER,
      Object.assign(inscrits(), { tarifChoix: 'minimum', tarifMontant: '90' })),
    m('Campagne', 'jdr', '8', 'Campagne ' + A_COMPLETER,
      presentationACompleter('la campagne en 1 phrase (jeu, fréquence)') + '\n\nAnimé par : ' + A_COMPLETER, inscrits()),
    m('Évènement externe', 'jds', '9', A_COMPLETER,
      presentationACompleter('la soirée et qui l\'organise, en 1 à 3 phrases') + '\n\nOrganisé par : ' + A_COMPLETER,
      { notesInternes: 'Contact : ' + A_COMPLETER }),
    m('Privatisation', 'jds', '', 'Privatisation - ' + A_COMPLETER, '', { notesInternes: 'Contact : ' + A_COMPLETER, visibilite: 'privee' })
  ];
})();

const TEXTES_TYPES_DE_LA_CHARTE = [
  ['Présentation BOTC', TEXTES_DE_LA_CHARTE.botc],
  ['Présentation Tables Ouvertes', TEXTES_DE_LA_CHARTE.tablesOuvertes],
  ['Accroche S.A.D', TEXTES_DE_LA_CHARTE.sad],
  ['Présentation Vadrouilles & Magie', TEXTES_DE_LA_CHARTE.vadrouilles],
  ['Réservation Client', TEXTES_DE_LA_CHARTE.reservationClient],
  ['Créneau Libre : avertissement', TEXTES_DE_LA_CHARTE.creneauLibre]
].map(([nom, texte]) => ({ nom, texte }));

// ---------- Fonctions pures (testées avec Node) ----------

// Champs d'un évènement où il reste un repère « [à compléter] » (noms lisibles, liste vide si tout est rempli)
function champsACompleter(champs) {
  const noms = { titre: 'le titre', descriptionPublique: 'la description publique', notesInternes: 'les notes internes' };
  return Object.keys(noms).filter(cle => REPERE_A_COMPLETER.test(champs[cle] || '')).map(cle => noms[cle]);
}

// Éléments de départ à ajouter : ceux dont le nom n'existe pas encore dans la liste
function elementsManquants(depart, existants) {
  const noms = existants.map(e => e.nom.toLowerCase());
  return depart.filter(e => noms.indexOf(e.nom.toLowerCase()) === -1);
}

function listeCharte(liste) {
  const def = LISTES_CHARTE[liste];
  if (!def) throw new Error('Liste inconnue : ' + liste);
  return def;
}

// Objet → ligne du Sheet, dans l'ordre des colonnes
function versLigneCharte(liste, element) {
  return listeCharte(liste).colonnes.map(([cle]) => String(element[cle] == null ? '' : element[cle]));
}

// Ligne du Sheet → objet
function depuisLigneCharte(liste, ligne) {
  const element = {};
  listeCharte(liste).colonnes.forEach(([cle], i) => { element[cle] = String(ligne[i] == null ? '' : ligne[i]).trim(); });
  return element;
}

// Vérifie et nettoie un élément avant enregistrement. autres = éléments déjà enregistrés (noms uniques).
function validerElementCharte(liste, element, autres) {
  const def = listeCharte(liste);
  const propre = depuisLigneCharte(liste, versLigneCharte(liste, element || {}));
  const erreurs = [];

  const homonyme = (autres || []).find(a => a.id !== propre.id && a.nom.toLowerCase() === propre.nom.toLowerCase());
  if (!propre.nom) erreurs.push('le nom');
  else if (homonyme) erreurs.push(`le nom (le ${def.nom} « ${homonyme.nom} » existe déjà)`);

  if (liste === 'textes') {
    if (!propre.texte) erreurs.push('le texte');
  } else {
    if (!CATEGORIES[propre.calendrier]) erreurs.push('le calendrier');
    else if (propre.colorId && !CATEGORIES[propre.calendrier].some(c => c.colorId === propre.colorId)) erreurs.push('la catégorie');
    ['heureDebut', 'heureFin'].forEach(h => {
      if (propre[h] && !/^\d{2}:\d{2}$/.test(propre[h])) erreurs.push('les horaires');
    });
    if (propre.visibilite !== 'privee') propre.visibilite = 'publique';
    if (['normal', 'externe', 'aucune'].indexOf(propre.inscriptionMode) === -1) propre.inscriptionMode = 'normal';
    if (propre.inscriptionMode !== 'externe') propre.inscriptionUrl = '';
    else if (propre.inscriptionUrl && !/^https?:\/\/\S+$/.test(propre.inscriptionUrl)) {
      erreurs.push("le lien d'inscription (il doit commencer par https://)");
    }
    CANAUX.forEach(c => {
      if (propre[c] && !/^https?:\/\/\S+$/.test(propre[c])) erreurs.push(`le lien ${NOMS_CANAUX[c]} (il doit commencer par https://)`);
    });
    // Places et tarif : un modèle peut laisser le nombre ou le montant vides (à remplir sur chaque évènement)
    propre.placesGerer = propre.placesGerer === 'oui' ? 'oui' : '';
    propre.placesComplet = propre.placesGerer && propre.placesComplet === 'oui' ? 'oui' : '';
    if (propre.placesInscription !== 'recommandee') propre.placesInscription = 'obligatoire';
    if (propre.placesNombre && !/^[1-9]\d{0,2}$/.test(propre.placesNombre)) erreurs.push('le nombre de places');
    if (['formule', 'habituel', 'minimum', 'autre'].indexOf(propre.tarifChoix) === -1) propre.tarifChoix = '';
    if (propre.tarifChoix !== 'minimum') propre.tarifMontant = '';
    else if (propre.tarifMontant && !/^\d+(?:[.,]\d+)?$/.test(propre.tarifMontant)) erreurs.push('le montant de la consommation minimum');
    if (propre.tarifChoix !== 'autre') propre.tarifTexte = '';
  }

  if (erreurs.length) throw new Error('À vérifier : ' + erreurs.filter((e, i) => erreurs.indexOf(e) === i).join(', ') + '.');
  return propre;
}

// ---------- Lecture et écriture dans le Sheet ----------

// Modèles et textes types, triés par nom.
// À la toute première ouverture, les modèles de la charte sont ajoutés automatiquement (une seule fois :
// si on les supprime ensuite, ils ne reviennent pas, sauf avec le bouton « 📥 Ajouter les modèles de la charte »).
function chargerCharte() {
  verifierAcces_();
  const proprietes = PropertiesService.getScriptProperties();
  if (!proprietes.getProperty('CHARTE_INITIALISEE') && !proprietes.getProperty('CHARTE_ID')) {
    const r = ajouterModelesDeLaCharte();
    return { modeles: r.modeles, textes: r.textes };
  }
  const classeur = classeurCharte_(false);
  return {
    modeles: lireListeCharte_(classeur, 'modeles'),
    textes: lireListeCharte_(classeur, 'textes')
  };
}

// Crée (id vide) ou modifie un élément. Renvoie la liste à jour.
function enregistrerElementCharte(liste, element) {
  const email = verifierAcces_();
  return avecVerrou_(() => {
    const classeur = classeurCharte_(true);
    const elements = lireListeCharte_(classeur, liste);
    const propre = validerElementCharte(liste, element, elements);
    const index = propre.id ? elements.findIndex(e => e.id === propre.id) : -1;
    if (index === -1) {
      propre.id = Utilities.getUuid().slice(0, 8);
      elements.push(propre);
    } else {
      elements[index] = propre;
    }
    ecrireListeCharte_(classeur, liste, elements);
    journaliser_(email, `Charte : ${index === -1 ? 'création' : 'modification'} ${listeCharte(liste).nom}`, 'charte', propre.nom, '', propre.id);
    return lireListeCharte_(classeur, liste);
  });
}

// Supprime un élément. Renvoie la liste à jour.
function supprimerElementCharte(liste, id) {
  const email = verifierAcces_();
  return avecVerrou_(() => {
    const classeur = classeurCharte_(true);
    const elements = lireListeCharte_(classeur, liste);
    const element = elements.find(e => e.id === id);
    if (!element) throw new Error('Élément introuvable : la page n\'est peut-être pas à jour.');
    ecrireListeCharte_(classeur, liste, elements.filter(e => e.id !== id));
    journaliser_(email, `Charte : suppression ${listeCharte(liste).nom}`, 'charte', element.nom, '', id);
    return lireListeCharte_(classeur, liste);
  });
}

// Ajoute les modèles et textes types de la charte qui manquent. Renvoie les deux listes et le nombre ajouté.
function ajouterModelesDeLaCharte() {
  const email = verifierAcces_();
  return avecVerrou_(() => {
    const classeur = classeurCharte_(true);
    const resultat = { ajoutes: 0 };
    [['modeles', MODELES_DE_LA_CHARTE], ['textes', TEXTES_TYPES_DE_LA_CHARTE]].forEach(([liste, depart]) => {
      const elements = lireListeCharte_(classeur, liste);
      const nouveaux = elementsManquants(depart, elements).map(e => {
        const propre = validerElementCharte(liste, e, elements);
        propre.id = Utilities.getUuid().slice(0, 8);
        return propre;
      });
      if (nouveaux.length) ecrireListeCharte_(classeur, liste, elements.concat(nouveaux));
      resultat.ajoutes += nouveaux.length;
      resultat[liste] = lireListeCharte_(classeur, liste);
    });
    PropertiesService.getScriptProperties().setProperty('CHARTE_INITIALISEE', 'oui');
    if (resultat.ajoutes) journaliser_(email, 'Charte : ajout des modèles de départ', 'charte', `${resultat.ajoutes} élément(s)`, '', '');
    return resultat;
  });
}

// Deux personnes qui enregistrent en même temps ne s'écrasent pas
function avecVerrou_(fn) {
  const verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    return fn();
  } finally {
    verrou.releaseLock();
  }
}

// creer = false : renvoie null si le Sheet n'existe pas encore
function classeurCharte_(creer) {
  const proprietes = PropertiesService.getScriptProperties();
  const id = proprietes.getProperty('CHARTE_ID');
  if (id) return SpreadsheetApp.openById(id);
  if (!creer) return null;
  const classeur = SpreadsheetApp.create('Au Dé 12 · Charte (modèles et textes types)');
  proprietes.setProperty('CHARTE_ID', classeur.getId());
  return classeur;
}

function ongletCharte_(classeur, liste) {
  const def = listeCharte(liste);
  let feuille = classeur.getSheetByName(def.onglet);
  if (!feuille) {
    // Le classeur neuf contient une « Feuille 1 » vide : on la réutilise
    const vide = classeur.getSheets().find(f => f.getLastRow() === 0 && !Object.values(LISTES_CHARTE).some(d => d.onglet === f.getName()));
    feuille = vide ? vide.setName(def.onglet) : classeur.insertSheet(def.onglet);
    feuille.setFrozenRows(1);
  }
  // En-têtes réécrits à chaque fois : un Sheet créé avant l'ajout d'une colonne la reçoit aussi
  feuille.getRange(1, 1, 1, def.colonnes.length).setValues([def.colonnes.map(c => c[1])]).setFontWeight('bold');
  return feuille;
}

function lireListeCharte_(classeur, liste) {
  if (!classeur) return [];
  const feuille = classeur.getSheetByName(listeCharte(liste).onglet);
  if (!feuille || feuille.getLastRow() < 2) return [];
  const nbColonnes = listeCharte(liste).colonnes.length;
  return feuille.getRange(2, 1, feuille.getLastRow() - 1, nbColonnes).getDisplayValues()
    .map(ligne => depuisLigneCharte(liste, ligne))
    .filter(e => e.id && e.nom)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

function ecrireListeCharte_(classeur, liste, elements) {
  const feuille = ongletCharte_(classeur, liste);
  const nbColonnes = listeCharte(liste).colonnes.length;
  if (feuille.getLastRow() > 1) feuille.getRange(2, 1, feuille.getLastRow() - 1, nbColonnes).clearContent();
  if (!elements.length) return;
  // Texte brut : « 19:00 » reste une heure écrite, « =… » ne devient pas une formule
  const lignes = elements.map(e => versLigneCharte(liste, e).map(v => v.charAt(0) === '=' ? "'" + v : v));
  feuille.getRange(2, 1, lignes.length, nbColonnes).setNumberFormat('@').setValues(lignes);
}
