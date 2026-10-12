// Tests de la charte : modèles d'évènements et textes types (apps-script/Charte.gs)
// Lancer : node --test tests/*.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Charge les fichiers .gs comme le ferait Apps Script (fonctions et constantes globales partagées)
const ctx = {};
vm.createContext(ctx);
const source = ['Categories.gs', 'Conventions.gs', 'Charte.gs']
  .map(f => fs.readFileSync(path.join(__dirname, '..', 'apps-script', f), 'utf8'))
  .join('\n');
vm.runInContext(source + '\n;this.LISTES_CHARTE = LISTES_CHARTE;', ctx);
const C = ctx;

const plain = obj => JSON.parse(JSON.stringify(obj)); // objets créés dans un autre contexte vm

const botc = {
  id: 'a1b2c3d4', nom: 'Soirée BOTC', calendrier: 'jds', colorId: '3', titre: 'Blood on the Clocktower',
  heureDebut: '19:30', heureFin: '00:30', visibilite: 'publique', descriptionPublique: 'Débutants bienvenus !\nOn explique tout.',
  inscriptionMode: 'normal', inscriptionUrl: '', vibes: '', meetup: 'https://meetup.com/x', discord: '', instagram: '',
  notesInternes: 'Sortir la malle BOTC',
  placesGerer: 'oui', placesNombre: '12', placesInscription: 'obligatoire', placesComplet: '',
  tarifChoix: 'formule', tarifMontant: '', tarifTexte: ''
};

test('un modèle fait l\'aller-retour objet → ligne du Sheet → objet', () => {
  const ligne = C.versLigneCharte('modeles', botc);
  assert.equal(ligne.length, C.LISTES_CHARTE.modeles.colonnes.length);
  assert.deepEqual(plain(C.depuisLigneCharte('modeles', ligne)), botc);
});

test('le Sheet relu (nombres, cases vides) redonne des textes', () => {
  const ligne = C.versLigneCharte('modeles', botc);
  ligne[3] = 3; // colorId relu comme nombre
  ligne[15] = undefined;
  const m = C.depuisLigneCharte('modeles', ligne);
  assert.equal(m.colorId, '3');
  assert.equal(m.notesInternes, '');
});

test('validerElementCharte accepte un modèle correct et nettoie les valeurs', () => {
  const m = C.validerElementCharte('modeles', Object.assign({}, botc, {
    nom: '  Soirée BOTC  ', visibilite: 'n\'importe quoi', inscriptionMode: 'normal', inscriptionUrl: 'https://oublie.fr'
  }), []);
  assert.equal(m.nom, 'Soirée BOTC');
  assert.equal(m.visibilite, 'publique');
  assert.equal(m.inscriptionUrl, ''); // lien externe ignoré avec le bouton habituel
});

test('validerElementCharte refuse les erreurs de saisie', () => {
  assert.throws(() => C.validerElementCharte('modeles', Object.assign({}, botc, { nom: ' ' }), []), /le nom/);
  assert.throws(() => C.validerElementCharte('modeles', Object.assign({}, botc, { calendrier: 'jdr', colorId: '7' }), []), /la catégorie/);
  assert.throws(() => C.validerElementCharte('modeles', Object.assign({}, botc, { heureDebut: '19h' }), []), /les horaires/);
  assert.throws(() => C.validerElementCharte('modeles', Object.assign({}, botc, { discord: 'discord.gg/x' }), []), /Discord/);
  assert.throws(() => C.validerElementCharte('modeles',
    Object.assign({}, botc, { inscriptionMode: 'externe', inscriptionUrl: 'www.exemple.fr' }), []), /lien d'inscription/);
  assert.throws(() => C.validerElementCharte('textes', { nom: 'Vide', texte: '  ' }, []), /le texte/);
  assert.throws(() => C.validerElementCharte('inconnue', {}, []), /Liste inconnue/);
});

test('deux éléments d\'une même liste ne peuvent pas porter le même nom', () => {
  const existants = [{ id: 'x1', nom: 'Présentation BOTC', texte: '…' }];
  assert.throws(() => C.validerElementCharte('textes', { id: '', nom: 'présentation botc', texte: 'Autre' }, existants), /existe déjà/);
  // Modifier l'élément lui-même garde son nom
  const t = C.validerElementCharte('textes', { id: 'x1', nom: 'Présentation BOTC', texte: 'Nouveau texte' }, existants);
  assert.equal(t.texte, 'Nouveau texte');
});

test('validerElementCharte : places et tarif d\'un modèle', () => {
  const m = C.validerElementCharte('modeles', Object.assign({}, botc, {
    placesGerer: 'non', placesComplet: 'oui', tarifChoix: 'formule', tarifMontant: '90', tarifTexte: 'x'
  }), []);
  assert.equal(m.placesGerer, '');
  assert.equal(m.placesComplet, '');
  assert.equal(m.tarifMontant, '');
  assert.equal(m.tarifTexte, '');
  assert.throws(() => C.validerElementCharte('modeles', Object.assign({}, botc, { placesNombre: 'douze' }), []), /nombre de places/);
  assert.throws(() => C.validerElementCharte('modeles', Object.assign({}, botc, { tarifChoix: 'minimum', tarifMontant: '90 €' }), []), /montant/);
});

test('un modèle sans catégorie ni horaires est accepté', () => {
  const m = C.validerElementCharte('modeles', { nom: 'Évènement privé', calendrier: 'jdr', visibilite: 'privee' }, []);
  assert.equal(m.colorId, '');
  assert.equal(m.heureDebut, '');
  assert.equal(m.visibilite, 'privee');
  assert.equal(m.inscriptionMode, 'normal');
});

test('les modèles et textes de départ respectent la validation de la charte', () => {
  const modeles = plain(vm.runInContext('MODELES_DE_LA_CHARTE', ctx));
  const textes = plain(vm.runInContext('TEXTES_TYPES_DE_LA_CHARTE', ctx));
  assert.ok(modeles.length >= 10);
  const deja = [];
  modeles.forEach(m => deja.push(C.validerElementCharte('modeles', m, deja)));
  const dejaT = [];
  textes.forEach(t => dejaT.push(C.validerElementCharte('textes', t, dejaT)));
  // Charte § 2.2, 2.4, 2.6 : ni Instagram, ni Inscription, ni Places, ni Tarif écrits à la main dans les modèles
  modeles.forEach(m => assert.doesNotMatch(m.descriptionPublique, /^(Instagram|Inscription|Places|Tarif)\s*:/m, m.nom));
  // Tarif obligatoire pour BOTC, Tables Ouvertes, Découverte (§ 2.6)
  modeles.filter(m => m.calendrier === 'jds' && ['3', '5', '7'].includes(m.colorId)).forEach(m => assert.ok(m.tarifChoix, m.nom));
});

test('champsACompleter repère les « [à compléter] » restés dans un évènement', () => {
  assert.deepEqual(plain(C.champsACompleter({ titre: 'Initiation Daggerheart', descriptionPublique: 'Texte', notesInternes: '' })), []);
  assert.deepEqual(plain(C.champsACompleter({
    titre: 'Soirée Découverte - [à compléter]',
    descriptionPublique: '[À compléter : présentation du jeu en 2 ou 3 phrases]',
    notesInternes: 'Contact : [ à compléter ]'
  })), ['le titre', 'la description publique', 'les notes internes']);
});

test('elementsManquants n\'ajoute que les noms absents', () => {
  const depart = [{ nom: 'Soirée BOTC' }, { nom: 'Créneau Libre' }];
  assert.deepEqual(plain(C.elementsManquants(depart, [{ nom: 'soirée botc' }])), [{ nom: 'Créneau Libre' }]);
});
