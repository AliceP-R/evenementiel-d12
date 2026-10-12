// Charte d'Au Dé 12 : modèles d'évènements et textes types
//
// Modifiables dans l'outil (bouton « 🎨 Charte »), par toute personne autorisée.
//   - Modèle d'évènement : formulaire prérempli (calendrier, catégorie, titre, horaires, description,
//     inscription, liens, notes internes). On le choisit en haut du formulaire « Nouvel évènement ».
//   - Texte type : phrase ou paragraphe réutilisable (mentions, présentation d'une soirée…),
//     inséré dans la description en un clic.
//
// Stockage : Google Sheet « Au Dé 12 · Charte », un onglet par liste, créé au premier enregistrement
// (propriété du script CHARTE_ID). Le Sheet sert de sauvegarde : on modifie depuis l'outil.

const LISTES_CHARTE = {
  modeles: {
    onglet: 'Modèles',
    nom: 'modèle',
    colonnes: [
      ['id', 'Identifiant'], ['nom', 'Nom du modèle'], ['calendrier', 'Calendrier'], ['colorId', 'Catégorie (couleur)'],
      ['titre', 'Titre'], ['heureDebut', 'Début'], ['heureFin', 'Fin'], ['visibilite', 'Visibilité'],
      ['descriptionPublique', 'Description publique'], ['inscriptionMode', 'Inscription'], ['inscriptionUrl', "Lien d'inscription"],
      ['vibes', 'Vibes'], ['meetup', 'Meetup'], ['discord', 'Discord'], ['instagram', 'Instagram'], ['notesInternes', 'Notes internes']
    ]
  },
  textes: {
    onglet: 'Textes types',
    nom: 'texte type',
    colonnes: [['id', 'Identifiant'], ['nom', 'Nom'], ['texte', 'Texte']]
  }
};

// ---------- Fonctions pures (testées avec Node) ----------

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
  }

  if (erreurs.length) throw new Error('À vérifier : ' + erreurs.filter((e, i) => erreurs.indexOf(e) === i).join(', ') + '.');
  return propre;
}

// ---------- Lecture et écriture dans le Sheet ----------

// Modèles et textes types, triés par nom
function chargerCharte() {
  verifierAcces_();
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
    feuille.getRange(1, 1, 1, def.colonnes.length).setValues([def.colonnes.map(c => c[1])]).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
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
