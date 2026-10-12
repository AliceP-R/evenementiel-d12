// Au Dé 12 · Outil de gestion des évènements (administration)
//
// Application web Apps Script réservée à l'équipe : elle crée, modifie et supprime
// les évènements directement dans les agendas Google JDS et JDR.
// Le site public (dépôt calendrier-d12) continue de lire ces agendas comme avant.
//
// Prérequis : service avancé « Google Calendar API » activé (cf. appsscript.json).
// Propriétés du script (Paramètres du projet → Propriétés du script) :
//   EMAILS_AUTORISES : adresses autorisées, séparées par des virgules (recommandé)
//   JOURNAL_ID       : identifiant du Google Sheet du journal (créé automatiquement sinon)
//   CHARTE_ID        : identifiant du Google Sheet des modèles et textes types (créé automatiquement sinon)

const CALENDRIERS = {
  jds: { id: 'c_b182530e0a332b3e4f20ff0c2308bb5010f8c91130af1b6e6828aa6a15751a6e@group.calendar.google.com', nom: 'Jeux de société' },
  jdr: { id: 'gestionjdr@au-de12paris.com', nom: 'Jeux de rôle' }
};
const FUSEAU = 'Europe/Paris';

// ---------- Page ----------

function doGet() {
  verifierAcces_();
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Au Dé 12 · Évènements')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://calendrier.au-de12paris.com/favicon.png');
}

// Insère un fichier HTML (Style, Script) dans la page
function inclure(nom) {
  return HtmlService.createHtmlOutputFromFile(nom).getContent();
}

// ---------- Accès ----------

// Renvoie l'adresse de la personne connectée, ou lève une erreur si elle n'est pas autorisée
function verifierAcces_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('Connexion impossible à identifier : connecte-toi avec ton compte @au-de12paris.com.');
  const liste = PropertiesService.getScriptProperties().getProperty('EMAILS_AUTORISES');
  if (liste) {
    const autorises = liste.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (autorises.indexOf(email) === -1) throw new Error(`Accès refusé pour ${email}.`);
  }
  return email;
}

function calendrier_(type) {
  const cal = CALENDRIERS[type];
  if (!cal) throw new Error('Calendrier inconnu : ' + type);
  return cal;
}

// ---------- Lecture ----------

// Données de la page : catégories + évènements des deux calendriers entre deux dates (AAAA-MM-JJ, fin exclue)
function chargerDonnees(debut, fin) {
  const email = verifierAcces_();
  const timeMin = new Date(debut + 'T00:00:00').toISOString();
  const timeMax = new Date(fin + 'T00:00:00').toISOString();
  const evenements = [];
  Object.keys(CALENDRIERS).forEach(type => {
    let pageToken;
    do {
      const reponse = Calendar.Events.list(CALENDRIERS[type].id, {
        timeMin, timeMax, timeZone: FUSEAU,
        singleEvents: true, orderBy: 'startTime', showDeleted: false,
        maxResults: 250, pageToken
      });
      (reponse.items || []).forEach(ev => {
        if (ev.status !== 'cancelled') evenements.push(versVue_(type, ev));
      });
      pageToken = reponse.nextPageToken;
    } while (pageToken);
  });
  return { utilisateur: email, categories: CATEGORIES, evenements };
}

// Un évènement (ou le modèle d'une série) pour le formulaire
function lireEvenement(type, id) {
  verifierAcces_();
  const ev = Calendar.Events.get(calendrier_(type).id, id, { timeZone: FUSEAU });
  return versVue_(type, ev);
}

function versVue_(type, ev) {
  const horaires = lireHoraires(ev.start, ev.end);
  const description = lireDescription(ev.description);
  const visibilite = String(ev.visibility || '').toLowerCase();
  return Object.assign({
    calendrier: type,
    id: ev.id,
    serieId: ev.recurringEventId || '',
    titre: ev.summary || '',
    colorId: ev.colorId ? String(ev.colorId) : '',
    visibilite: visibilite === 'private' || visibilite === 'confidential' ? 'privee' : 'publique',
    recurrence: lireRecurrence(ev.recurrence),
    lienGoogle: ev.htmlLink || ''
  }, horaires, description);
}

// ---------- Écriture ----------

// Crée ou modifie un évènement.
//   f.id vide          → création (avec récurrence éventuelle)
//   f.id d'occurrence  → modification de cette date seulement
//   f.id de série      → modification de toute la série
function enregistrerEvenement(f) {
  const email = verifierAcces_();
  const cal = calendrier_(f.calendrier);
  valider_(f);

  const ressource = f.id ? Calendar.Events.get(cal.id, f.id) : {};
  const occurrence = !!ressource.recurringEventId;

  ressource.summary = f.titre.trim();
  ressource.description = construireDescription(f);
  ressource.visibility = f.visibilite === 'privee' ? 'private' : 'default';
  if (f.colorId) ressource.colorId = String(f.colorId);
  else delete ressource.colorId; // sans catégorie (update remplace l'évènement entier)

  const horaires = construireHoraires(f, FUSEAU);
  ressource.start = horaires.start;
  ressource.end = horaires.end;

  if (!occurrence && f.recurrence && f.recurrence.frequence !== 'autre') {
    const regles = construireRecurrence(f.recurrence, f.journeeEntiere);
    if (regles.length) ressource.recurrence = regles;
    else delete ressource.recurrence;
  }

  const resultat = f.id
    ? Calendar.Events.update(ressource, cal.id, f.id)
    : Calendar.Events.insert(ressource, cal.id);

  const action = !f.id ? 'Création' : occurrence ? 'Modification (cette date)' : 'Modification';
  journaliser_(email, action, f.calendrier, ressource.summary, f.date, resultat.id);
  return resultat.id;
}

// Supprime un évènement. portee = 'serie' pour supprimer toute la série d'une occurrence.
function supprimerEvenement(type, id, portee) {
  const email = verifierAcces_();
  const cal = calendrier_(type);
  const ev = Calendar.Events.get(cal.id, id, { timeZone: FUSEAU });
  const cible = portee === 'serie' && ev.recurringEventId ? ev.recurringEventId : id;
  Calendar.Events.remove(cal.id, cible);
  const date = lireHoraires(ev.start, ev.end).date;
  journaliser_(email, cible === id ? 'Suppression' : 'Suppression (toute la série)', type, ev.summary || '', date, cible);
}

function valider_(f) {
  const erreurs = [];
  if (!f.titre || !f.titre.trim()) erreurs.push('le titre');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) erreurs.push('la date');
  if (!f.journeeEntiere && (!/^\d{2}:\d{2}$/.test(f.heureDebut || '') || !/^\d{2}:\d{2}$/.test(f.heureFin || ''))) {
    erreurs.push('les heures de début et de fin');
  }
  if (f.inscription && f.inscription.mode === 'externe' && !/^https?:\/\/\S+$/.test((f.inscription.url || '').trim())) {
    erreurs.push("le lien d'inscription (il doit commencer par https://)");
  }
  CANAUX.forEach(c => {
    const url = ((f.canaux || {})[c] || '').trim();
    if (url && !/^https?:\/\/\S+$/.test(url)) erreurs.push(`le lien ${NOMS_CANAUX[c]} (il doit commencer par https://)`);
  });
  const categorie = CATEGORIES[f.calendrier].find(c => c.colorId === String(f.colorId || ''));
  if (f.colorId && !categorie) erreurs.push('la catégorie');
  const places = f.places || {};
  if (places.gerer && !places.complet && !/^[1-9]\d{0,2}$/.test(String(places.nombre || '').trim())) {
    erreurs.push('le nombre de places (ou cocher « Complet »)');
  }
  const tarif = f.tarif || {};
  if (!tarif.choix && categorie && categorie.tarifObligatoire) erreurs.push(`le tarif (obligatoire pour ${categorie.nom})`);
  if (tarif.choix === 'minimum' && !/^\d+(?:[.,]\d+)?$/.test(String(tarif.montant || '').trim())) erreurs.push('le montant de la consommation minimum');
  if (tarif.choix === 'autre' && !String(tarif.texte || '').trim()) erreurs.push('le texte du tarif');
  champsACompleter(f).forEach(champ => erreurs.push(`${champ} (il reste « ${A_COMPLETER} »)`));
  if (erreurs.length) throw new Error('À vérifier : ' + erreurs.join(', ') + '.');
}

// ---------- Journal ----------

function journaliser_(email, action, type, titre, date, id) {
  try {
    const quoi = CALENDRIERS[type] ? CALENDRIERS[type].nom : 'Charte';
    feuilleJournal_().appendRow([new Date(), email, action, quoi, titre, date, id]);
  } catch (e) {
    console.error('Journal impossible : ' + e); // le journal ne doit pas bloquer l'enregistrement
  }
}

function feuilleJournal_() {
  const proprietes = PropertiesService.getScriptProperties();
  const id = proprietes.getProperty('JOURNAL_ID');
  if (id) return SpreadsheetApp.openById(id).getSheets()[0];

  const classeur = SpreadsheetApp.create('Au Dé 12 · Journal des évènements');
  const feuille = classeur.getSheets()[0];
  feuille.appendRow(['Quand', 'Qui', 'Action', 'Calendrier', 'Titre', "Date de l'évènement", 'Identifiant Google']);
  feuille.setFrozenRows(1);
  proprietes.setProperty('JOURNAL_ID', classeur.getId());
  return feuille;
}

// Lien vers le journal (bouton « Journal » de la page)
function lienJournal() {
  verifierAcces_();
  return feuilleJournal_().getParent().getUrl();
}
