// Correction en lot : remettre les évènements existants au format de la charte
// (docs/formats-descriptions.md § 5 et état des lieux § 6).
//
// L'outil propose, catégorie par catégorie, les corrections qu'il sait faire sans risque ; on coche celles
// qu'on valide après avoir vu l'aperçu avant / après, puis l'outil réécrit seulement le titre et la
// description dans Google Agenda (le reste de l'évènement ne change pas).
// Ce qu'il ne sait pas corriger seul est signalé « à corriger à la main ».

// Tarif proposé quand il manque (charte § 3), par calendrier puis colorId
const TARIFS_PAR_DEFAUT = {
  jds: { '3': { choix: 'formule' }, '5': { choix: 'habituel' }, '7': { choix: 'habituel' } },
  jdr: {
    '3': { choix: 'minimum', montant: '90' },
    '4': { choix: 'autre', texte: '30 € par personne pour le MJ + consommation minimum de 90 € par table' },
    '5': { choix: 'minimum', montant: '90' }
  }
};

// ---------- Fonctions pures (testées avec Node) ----------

// Titre seul, sans emojis ni ponctuation, pour comparer à une 1re ligne de description
function texteComparable(texte) {
  return String(texte).toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// vue = champs du formulaire (cf. versVue_ dans Code.gs). Renvoie
//   { vue: champs corrigés, changements: [ce qui a été corrigé], aVerifier: [à corriger à la main] }
function corrigerEvenement(vue) {
  const v = JSON.parse(JSON.stringify(vue));
  const changements = [];
  const aVerifier = [];
  const categorie = (CATEGORIES[v.calendrier] || []).find(c => c.colorId === v.colorId);
  const noter = (avant, apres, message) => { if (avant !== apres) changements.push(message); return apres; };

  if (v.colorId && !categorie) aVerifier.push(`Couleur ${v.colorId} hors catégorie : choisir une catégorie`);
  if (v.colorId === '11' && v.calendrier === 'jdr') {
    aVerifier.push('Ligue Ludique : écrit par la routine Claude, non corrigé ici');
    return { vue: v, changements, aVerifier };
  }

  // ---- Titre (charte § 2.5 et état des lieux) ----
  let titre = v.titre;
  if (v.calendrier === 'jdr') titre = noter(titre, titre.replace(/^\s*JDR\s*[-–—:]\s*/i, ''), 'Titre : préfixe « JDR - » retiré');
  titre = noter(titre, titre.replace(/\s*!+\s*$/, ''), 'Titre : « ! » final retiré');
  titre = noter(titre, titre.replace(/D[ée]couvertre/g, 'Découverte'), 'Titre : faute « Découvertre » corrigée');
  titre = noter(titre, titre.replace(/\s+[–—]\s+/g, ' - '), 'Titre : tiret simple « - »');
  titre = noter(titre, titre.replace(/^Tables Ouvertes\s*-\s*(\p{L}+)\s*$/u, 'Tables Ouvertes du $1'), 'Titre : « Tables Ouvertes du … »');
  titre = noter(titre, titre.replace(/\s*\bx\s?\d+\s*$/i, ''), 'Titre : jauge retirée (elle va dans Places)');
  titre = noter(titre, titre.replace(/\b(\p{Lu})(\p{Lu}{4,})\b/gu, (m, a, b) => a + b.toLowerCase()), 'Titre : mot en MAJUSCULES');
  if (categorie && categorie.colorId === '2' && v.calendrier === 'jdr') {
    titre = noter(titre, /^\s*(réservation client|client)\s*$/i.test(titre) ? 'Réservation Client' : titre, 'Titre : « Réservation Client »');
  }
  v.titre = titre.trim();

  // ---- Description publique ----
  let lignes = v.descriptionPublique ? v.descriptionPublique.split('\n') : [];
  const retirer = (test, message) => {
    const avant = lignes.length;
    lignes = lignes.filter(l => !test(l));
    if (lignes.length !== avant) changements.push(message);
  };

  // 1re ligne qui reprend le titre
  const premiere = lignes.findIndex(l => l.trim());
  if (premiere !== -1 && texteComparable(lignes[premiere]) && texteComparable(lignes[premiere]) === texteComparable(v.titre)) {
    lignes.splice(premiere, 1);
    changements.push('Description : 1re ligne qui répète le titre retirée');
  }
  const horaire = new RegExp(`^[^\\d\\n]{0,15}\\d{1,2}\\s*h\\s*\\d{0,2}\\s*(?:-|–|—|à)\\s*\\d{1,2}\\s*h\\s*\\d{0,2}\\s*\\.?\\s*$`, 'i');
  retirer(l => horaire.test(l), 'Description : horaires retirés (le site les affiche)');
  retirer(l => /^\s*(pour vous inscrire|inscrivez-vous|inscriptions?\s+(?:sur|via|par))\b/i.test(l), 'Description : « Pour vous inscrire… » retiré (le bouton le fait)');
  retirer(l => /view apollo event/i.test(l), 'Description : lien « View Apollo event » retiré');

  // Places écrites à la main dans un autre format
  if (!v.places.gerer) {
    lignes = lignes.filter(l => {
      const complet = /^\s*\(?\s*complet\s*!*\s*\)?\s*$/i.test(l);
      const nombre = l.match(/^\s*(?:places?\s*:\s*(\d+)|\(?\s*(\d+)\s*places?\s*\)?)\s*\.?\s*$/i);
      if (!complet && !nombre) return true;
      v.places = complet
        ? { gerer: true, nombre: '', inscription: 'obligatoire', complet: true }
        : { gerer: true, nombre: nombre[1] || nombre[2], inscription: (categorie && categorie.modePlaces) || 'obligatoire', complet: false };
      changements.push(complet ? 'Places : « complet » (le bouton est masqué)' : `Places : ${v.places.nombre} (champ Places)`);
      return false;
    });
  }

  // Prix / Tarif écrits à la main
  if (!v.tarif.choix) {
    lignes = lignes.filter(l => {
      const m = l.match(/^\s*(?:prix|tarifs?)\s*(?:mj\s*)?:\s*(.+?)\s*$/i);
      if (!m) return true;
      v.tarif = lireTarif(m[1].replace(/\s*\|\s*/g, ' + '));
      changements.push('Tarif : ligne de prix reprise dans le champ Tarif');
      return false;
    });
  }
  if (v.tarif.choix === 'autre') {
    const relu = lireTarif(v.tarif.texte.replace(/(\d)\s*€/g, '$1 €'));
    if (JSON.stringify(relu) !== JSON.stringify(v.tarif)) {
      v.tarif = relu;
      changements.push('Tarif : écriture des prix (« 18 € ») ou tarif connu reconnu');
    }
  }
  const defaut = (TARIFS_PAR_DEFAUT[v.calendrier] || {})[v.colorId];
  if (!v.tarif.choix && defaut && v.visibilite !== 'privee') {
    v.tarif = Object.assign({ choix: '', montant: '', texte: '' }, defaut);
    changements.push('Tarif : ajouté d\'après la charte (« ' + texteTarif(v.tarif) + ' »)');
  }

  let publique = lignes.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  publique = noter(publique, publique.replace(/(\d)€/g, '$1 €'), 'Description : « 18 € » avec une espace');
  publique = noter(publique, publique.split('\n').map(l => /https?:/.test(l) ? l
    : l.replace(/(\p{Ll}{2,})\.(e|ice|euse|rice)\.s\b/gu, '$1·$2s')).join('\n'), 'Description : écriture inclusive au point médian');

  // Réservation Client : toujours la même phrase en public, l'ancien texte passe en interne (§ 3.2)
  const phraseClient = '📌 Cette session est réservée par un client.';
  if (v.calendrier === 'jdr' && v.colorId === '2' && publique !== phraseClient) {
    if (publique) v.notesInternes = (v.notesInternes ? v.notesInternes + '\n' : '') + 'Notes : ancienne description publique : ' + publique.replace(/\n+/g, ' / ');
    publique = phraseClient;
    changements.push('Description : phrase fixe des Réservations Client (l\'ancien texte passe en interne)');
  }
  v.descriptionPublique = publique;

  if (/\[[^\]]*(texte|présentation|à compléter|a completer)[^\]]*\]|\(\s*x\s+places?\s*\)/i.test(v.descriptionPublique + '\n' + v.titre)) {
    aVerifier.push('Texte d\'attente (« [Texte de présentation] », « (X places) »…) à remplacer');
  }
  if (/^\s*places\s*:/im.test(v.descriptionPublique)) aVerifier.push('Ligne « Places : » dans un format inconnu : utiliser le champ Places');

  // ---- Inscription : « aucune » inutile (catégorie sans bouton) ou qui masque le bouton du Créneau Libre ----
  if (v.inscription.mode === 'aucune' && !v.places.complet && (!categorie || !categorie.bouton || categorie.bouton === 'reservation')) {
    v.inscription.mode = 'normal';
    changements.push(categorie && categorie.bouton === 'reservation'
      ? 'Inscription : « aucune » retiré, le bouton « Demander à réserver la salle » revient'
      : 'Inscription : « aucune » retiré (cette catégorie n\'a pas de bouton)');
  }

  // ---- Interne : libellés connus laissés vides (« Notes : » suivi d'une ligne vide ou d'un autre libellé) ----
  const libelleVide = /^\s*(notes?|contact|places|publié|inscrit·es|inscrits|client|mj|statut|type|réservation de)\s*:\s*$/i;
  const lignesInternes = (v.notesInternes || '').split('\n');
  const interne = lignesInternes.filter((l, i) => {
    const suivante = (lignesInternes[i + 1] || '').trim();
    return !libelleVide.test(l) || (suivante && !/^[^:]{1,30}:/.test(suivante));
  }).join('\n').trim();
  v.notesInternes = noter(v.notesInternes || '', interne, 'Interne : lignes vides (« Notes : ») retirées');

  return { vue: v, changements, aVerifier };
}

// ---------- Google Agenda ----------

// Évènements entre deux dates (AAAA-MM-JJ) avec les corrections proposées.
// Les séries sont analysées une fois (évènement principal), les dates modifiées une par une à part.
function analyserCorrections(debut, fin) {
  verifierAcces_();
  const resultats = [];
  evenementsACorriger_(debut, fin, (type, ev) => {
    const vue = versVue_(type, ev);
    const c = corrigerEvenement(vue);
    if (!c.changements.length && !c.aVerifier.length) return;
    const cal = calendrier_(type);
    resultats.push({
      calendrier: type, id: ev.id, serie: !!(ev.recurrence && ev.recurrence.length), date: vue.date,
      colorId: vue.colorId, titre: vue.titre, titreCorrige: c.vue.titre,
      avant: htmlEnTexte(ev.description || ''), apres: decoderEntites(construireDescription(c.vue)),
      changements: c.changements, aVerifier: c.aVerifier, lienGoogle: vue.lienGoogle, calendrierNom: cal.nom
    });
  });
  return resultats.sort((a, b) => a.date.localeCompare(b.date));
}

// Applique les corrections aux évènements cochés : [{ calendrier, id }]. Recalculées ici, à partir de Google Agenda.
function appliquerCorrections(selection) {
  const email = verifierAcces_();
  let corriges = 0;
  const erreurs = [];
  (selection || []).forEach(({ calendrier, id }) => {
    try {
      const cal = calendrier_(calendrier);
      const ev = Calendar.Events.get(cal.id, id, { timeZone: FUSEAU });
      const c = corrigerEvenement(versVue_(calendrier, ev));
      if (!c.changements.length) return;
      Calendar.Events.patch({ summary: c.vue.titre, description: construireDescription(c.vue) }, cal.id, id);
      journaliser_(email, 'Correction charte', calendrier, c.vue.titre, lireHoraires(ev.start, ev.end).date, id);
      corriges++;
    } catch (e) {
      erreurs.push(`${id} : ${e.message}`);
    }
  });
  return { corriges, erreurs };
}

function evenementsACorriger_(debut, fin, traiter) {
  const timeMin = new Date(debut + 'T00:00:00').toISOString();
  const timeMax = new Date(fin + 'T00:00:00').toISOString();
  Object.keys(CALENDRIERS).forEach(type => {
    let pageToken;
    do {
      // singleEvents: false → une série = un seul évènement (plus les dates modifiées à part)
      const reponse = Calendar.Events.list(CALENDRIERS[type].id, {
        timeMin, timeMax, timeZone: FUSEAU, singleEvents: false, showDeleted: false, maxResults: 250, pageToken
      });
      (reponse.items || []).forEach(ev => { if (ev.status !== 'cancelled') traiter(type, ev); });
      pageToken = reponse.nextPageToken;
    } while (pageToken);
  });
}
