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
  notesInternes: 'Sortir la malle BOTC'
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

test('un modèle sans catégorie ni horaires est accepté', () => {
  const m = C.validerElementCharte('modeles', { nom: 'Évènement privé', calendrier: 'jdr', visibilite: 'privee' }, []);
  assert.equal(m.colorId, '');
  assert.equal(m.heureDebut, '');
  assert.equal(m.visibilite, 'privee');
  assert.equal(m.inscriptionMode, 'normal');
});
