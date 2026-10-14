// Tests de la correction en lot (apps-script/Corrections.gs), sur des cas tirés de l'état des lieux de la charte
// Lancer : node --test tests/*.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
const source = ['Categories.gs', 'Conventions.gs', 'Corrections.gs']
  .map(f => fs.readFileSync(path.join(__dirname, '..', 'apps-script', f), 'utf8'))
  .join('\n');
vm.runInContext(source, ctx);
const C = ctx;
const plain = obj => JSON.parse(JSON.stringify(obj));

// Évènement tel que relu depuis Google Agenda (cf. versVue_ dans Code.gs)
function evenement(calendrier, colorId, titre, description, autres) {
  return Object.assign({ calendrier, colorId, titre, visibilite: 'publique' }, plain(C.lireDescription(description)), autres);
}
const corriger = ev => plain(C.corrigerEvenement(ev));

test('JDS d\'octobre : titre répété, horaires, Instagram gardé, places et prix repris dans les champs', () => {
  const r = corriger(evenement('jds', '5', 'Tables Ouvertes - Jeudi !',
    'Tables Ouvertes du Jeudi\nJeudi : 19h - 23h\nVenez jouer avec nous.\n(16 places)\nPrix : 18€ la formule\n\nInstagram : https://instagram.com/x'));
  assert.equal(r.vue.titre, 'Tables Ouvertes du Jeudi');
  assert.equal(r.vue.descriptionPublique, 'Venez jouer avec nous.');
  assert.deepEqual(r.vue.places, { gerer: true, nombre: '16', inscription: 'recommandee', complet: false });
  assert.deepEqual(r.vue.tarif, { choix: 'autre', montant: '', texte: '18 € la formule' });
  assert.equal(r.vue.canaux.instagram, 'https://instagram.com/x');
  assert.ok(r.changements.length >= 5);
});

test('JDR : préfixe, « Pour vous inscrire », MAJUSCULES, tarif ajouté d\'après la charte', () => {
  const r = corriger(evenement('jdr', '5', 'JDR - INITIATION Daggerheart',
    'Découvrez Daggerheart.\nPour vous inscrire : Discord / Instagram / mail'));
  assert.equal(r.vue.titre, 'Initiation Daggerheart');
  assert.equal(r.vue.descriptionPublique, 'Découvrez Daggerheart.');
  assert.deepEqual(r.vue.tarif, { choix: 'minimum', montant: '90', texte: '' });
});

test('Réservation Client : nom du client retiré du public, gardé en interne, « Inscription : aucune » retiré', () => {
  const r = corriger(evenement('jdr', '2', 'Réservation client', 'Clémence\n\nInscription : aucune\n\n---interne---\nNotes :'));
  assert.equal(r.vue.titre, 'Réservation Client');
  assert.equal(r.vue.descriptionPublique, '📌 Cette session est réservée par un client.');
  assert.equal(r.vue.notesInternes, 'Notes : ancienne description publique : Clémence');
  assert.equal(r.vue.inscription.mode, 'normal');
  assert.ok(!C.construireDescription(r.vue).split('---interne---')[0].includes('Clémence'));
});

test('Créneau Libre : le bouton de réservation revient', () => {
  const r = corriger(evenement('jdr', '3', 'Créneau Libre', 'Réservez !\n\nInscription : aucune'));
  assert.equal(r.vue.inscription.mode, 'normal');
  assert.ok(r.changements.some(c => /réserver la salle/.test(c)));
});

test('« COMPLET » dans le texte : Places complet, bouton masqué', () => {
  const r = corriger(evenement('jds', '3', 'Blood on the Clocktower - Débutant·es',
    'Un jeu de mystère.\nCOMPLET\n\nTarif : formule avec alcool 18 €, sans alcool 16 €'));
  assert.equal(r.vue.places.complet, true);
  assert.equal(r.vue.descriptionPublique, 'Un jeu de mystère.');
  assert.match(C.construireDescription(r.vue), /Places : complet[\s\S]*Inscription : aucune/);
});

test('Ligue Ludique ni corrigée ni signalée, textes d\'attente et couleurs hors catégorie signalés', () => {
  const ligue = corriger(evenement('jdr', '11', 'JDR - Ligue', 'Inscription : https://ligue.fr/x'));
  assert.equal(ligue.changements.length, 0);
  assert.equal(ligue.aVerifier.length, 0);
  assert.equal(ligue.vue.titre, 'JDR - Ligue');
  assert.ok(corriger(evenement('jds', '7', 'Soirée Découverte - X', '[Texte de présentation]', { tarif: { choix: 'habituel' } }))
    .aVerifier.some(a => /attente/.test(a)));
  assert.ok(corriger(evenement('jdr', '10', 'Fermé', '')).aVerifier.some(a => /hors catégorie/.test(a)));
});

test('un évènement déjà au format ne reçoit aucune correction', () => {
  const r = corriger(evenement('jds', '3', 'Blood on the Clocktower - Débutant·es',
    'Un jeu de mystère.\n\nScénario : Trouble Brewing\nAnimé par : Martin\nPlaces : 12, inscription obligatoire\n' +
    'Tarif : formule avec alcool 18 €, sans alcool 16 €\n\n---interne---\nContact : Martin\nNotes :\nSortir la malle'));
  assert.deepEqual(r.changements, []);
  assert.deepEqual(r.aVerifier, []);
  // ni contrôle titre / couleur ni « Privé en JDR » sur un évènement annulé
  assert.deepEqual(corriger(evenement('jdr', '3', 'ANNULÉ - Initiation Cosmere', 'Annulé : MJ malade', { visibilite: 'privee' })).aVerifier, []);
});

test('écriture inclusive et prix, sans toucher aux liens', () => {
  const r = corriger(evenement('jds', '', 'Privatisation - Anniv',
    'Les invité.e.s sont accompagné.e.s. 5€.\nhttps://site.fr/les.e.s'));
  assert.equal(r.vue.descriptionPublique, 'Les invité·es sont accompagné·es. 5 €.\nhttps://site.fr/les.e.s');
});

test('Titre d\'une autre catégorie que sa couleur : signalé pour chaque catégorie, jamais corrigé seul', () => {
  const signale = (cal, colorId, titre) => corriger(evenement(cal, colorId, titre, 'Texte.')).aVerifier.filter(a => /mais titre de/.test(a));
  // Réservation Client ↔ Créneau Libre (le 19 octobre)
  const client = corriger(evenement('jdr', '2', 'Créneau Libre', '📌 Cette session est réservée par un client.'));
  assert.equal(client.vue.titre, 'Créneau Libre');
  assert.equal(client.vue.colorId, '2');
  assert.ok(client.aVerifier.some(a => /^Couleur « Réservation Client » mais titre de « Créneau Libre »/.test(a)));
  const libre = signale('jdr', '3', 'Réservation client');
  assert.equal(libre.length, 1);
  assert.match(libre[0], /salle s'affiche réservable/);
  // Les autres catégories JDR et JDS
  assert.match(signale('jdr', '3', 'Vadrouilles & Magie')[0], /« MJ PRO - Vadrouilles & Magie »/);
  assert.match(signale('jdr', '4', 'Initiation Cosmere')[0], /« OS & Initiation »/);
  assert.match(signale('jdr', '5', 'Campagne')[0], /« MJ PRO - Campagne Semi-Ouverte »/);
  assert.match(signale('jds', '5', 'Blood On The Clock Tower')[0], /« Soirée BOTC »/);
  assert.match(signale('jds', '7', 'Tables Ouvertes du Jeudi')[0], /« Tables Ouvertes »/);
  assert.match(signale('jds', '9', 'Soirée Découverte')[0], /^Couleur « Évènement externe » mais titre de « Soirée Découverte »/);
  assert.match(signale('jdr', '', 'Créneau Libre')[0], /^Sans catégorie/);
  assert.match(signale('jds', '', 'Soirée BOTCT - Débutant')[0], /« Soirée BOTC »/);
  assert.match(signale('jds', '', 'Chessbar')[0], /« Évènement externe »/);
  assert.match(signale('jdr', '', 'Privatisation')[0], /« Évènement externe »/);
  assert.match(signale('jdr', '2', 'Privatisation - Anniversaire')[0], /« Évènement externe »/);
  assert.match(signale('jds', '7', 'Tournoi Machicoulis')[0], /« Évènement externe »/);
  assert.match(signale('jds', '', 'Privatisation Marie&TheSapphics')[0], /« Évènement externe »/);
  assert.match(signale('jdr', '', 'Option Client')[0], /« Réservation Client »/);
  assert.match(signale('jdr', '3', 'INTIATION - Berlin XVIII')[0], /« OS & Initiation »/);
  // Titre qui va avec sa couleur, ou qui n'évoque aucune catégorie : rien
  [['jdr', '2', 'Réservation Client'], ['jdr', '3', 'Créneau Libre'], ['jdr', '4', 'V&M'], ['jdr', '5', 'Initiation D&D'],
    ['jdr', '8', 'Campagne'], ['jds', '3', 'BOTC Privé'], ['jds', '7', 'Découverte : Le Conseil d\'Anderian'],
    ['jds', '9', 'Tournoi Machicoulis'], ['jds', '', 'BOTC Privé'], ['jds', '', 'Privatisation LQS'], ['jdr', '9', 'Privatisation'], ['jdr', '2', 'Option Client'], ['jds', '9', 'Joueurs Anonymes'], ['jdr', '9', 'Serum']]
    .forEach(([cal, c, t]) => assert.deepEqual(signale(cal, c, t), [], t));
});

test('JDR privé : signalé, la salle paraîtrait libre sur le site', () => {
  const prive = v => corriger(evenement('jdr', '2', 'Option Client', '', { visibilite: v })).aVerifier.filter(a => /Privé en JDR/.test(a));
  assert.equal(prive('privee').length, 1);
  assert.equal(prive('publique').length, 0);
  assert.equal(corriger(evenement('jds', '9', 'Chessbar', '', { visibilite: 'privee' })).aVerifier.filter(a => /Privé en JDR/.test(a)).length, 0);
});

test('évènement annulé : pas de correction (titre en majuscules et « Inscription : aucune » voulus)', () => {
  const r = corriger(evenement('jds', '9', 'ANNULÉ - Soirée jeux !', 'Annulé : salle indisponible\n\nInscription : aucune'));
  assert.deepEqual(r.changements, []);
  assert.deepEqual(r.aVerifier, []);
});
