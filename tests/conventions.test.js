// Tests des conventions Google Agenda (apps-script/Conventions.gs)
// Lancer : node --test tests/

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Charge le fichier .gs comme le ferait Apps Script (fonctions globales)
const ctx = {};
vm.createContext(ctx);
const source = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Conventions.gs'), 'utf8');
vm.runInContext(source + '\n;this.CANAUX = CANAUX;', ctx);
const C = ctx;

// Réplique de stripInternal() du site public (calendrier-d12/apps-script/Code.gs)
function stripInternal(description) {
  if (!description) return '';
  const text = String(description);
  const match = text.search(/(?:-{2,}|[–—]+)\s*(?:<[^>]*>\s*)*interne\s*(?:<[^>]*>\s*)*(?:-{2,}|[–—]+)/i);
  return match === -1 ? text.trim() : text.substring(0, match).trim();
}

const plain = obj => JSON.parse(JSON.stringify(obj)); // objets créés dans un autre contexte vm
const SANS_PLACES = { gerer: false, nombre: '', inscription: 'obligatoire', complet: false };
const SANS_TARIF = { choix: '', montant: '', texte: '' };

test('construireDescription : ordre et format attendus par le site', () => {
  const d = C.construireDescription({
    descriptionPublique: 'Soirée Blood on the Clocktower.\nDébutants bienvenus !',
    notesInternes: 'Clé de la salle chez Léa',
    inscription: { mode: 'externe', url: 'https://exemple.fr/inscription?a=1&b=2' },
    canaux: { vibes: '', meetup: 'https://meetup.com/x', discord: '', instagram: '' }
  });
  assert.equal(d,
    'Soirée Blood on the Clocktower.\nDébutants bienvenus !\n\n' +
    'Inscription : https://exemple.fr/inscription?a=1&amp;b=2\n\n' +
    '---interne---\nClé de la salle chez Léa');
});

test('les notes internes ne passent jamais le filtre du site public', () => {
  const d = C.construireDescription({
    descriptionPublique: 'Public',
    notesInternes: 'SECRET',
    inscription: { mode: 'aucune' },
    canaux: {}
  });
  const publie = stripInternal(d);
  assert.ok(!publie.includes('SECRET'));
  assert.equal(publie, 'Public\n\nInscription : aucune');
});

test('liens par canal ignorés sans le bouton habituel', () => {
  const canaux = { vibes: 'https://vibes.lgbt/a' };
  assert.equal(C.construireDescription({ inscription: { mode: 'aucune' }, canaux }), 'Inscription : aucune');
  assert.equal(C.construireDescription({ inscription: { mode: 'normal' }, canaux }), 'Vibes : https://vibes.lgbt/a');
});

test('construireDescription échappe le HTML saisi', () => {
  const d = C.construireDescription({ descriptionPublique: '<script>x</script> & co', inscription: { mode: 'normal' }, canaux: {} });
  assert.equal(d, '&lt;script&gt;x&lt;/script&gt; &amp; co');
});

test('construireDescription : rien de superflu quand tout est vide', () => {
  assert.equal(C.construireDescription({ inscription: { mode: 'normal' }, canaux: {} }), '');
  assert.equal(C.construireDescription({ inscription: { mode: 'externe', url: '  ' }, canaux: {} }), '');
});

test('aller-retour construire → lire', () => {
  const champs = {
    descriptionPublique: 'Ligne 1\n\nLigne 3 avec https://lien.fr & <b>',
    notesInternes: 'Note 1\nNote 2',
    inscription: { mode: 'normal', url: '' },
    canaux: { vibes: 'https://vibes.lgbt/a', meetup: '', discord: 'https://discord.com/c', instagram: '' },
    places: SANS_PLACES,
    tarif: SANS_TARIF,
    annulation: ''
  };
  assert.deepEqual(plain(C.lireDescription(C.construireDescription(champs))), champs);

  const externe = Object.assign({}, champs, {
    inscription: { mode: 'externe', url: 'https://helloasso.com/e?x=1&y=2' },
    canaux: { vibes: '', meetup: '', discord: '', instagram: '' }
  });
  assert.deepEqual(plain(C.lireDescription(C.construireDescription(externe))), externe);
});

test('lireDescription : description HTML saisie dans Google Agenda', () => {
  const html = 'Venez jouer !<br><br><b>Inscription</b> : <a href="https://exemple.fr/i?a=1&amp;b=2">https://exemple.fr/i?a=1&amp;b=2</a>' +
    '<br>Vibes&nbsp;: https://vibes.lgbt/g<br>— Interne —<br>Payé : non';
  const r = plain(C.lireDescription(html));
  assert.equal(r.descriptionPublique, 'Venez jouer !');
  assert.deepEqual(r.inscription, { mode: 'externe', url: 'https://exemple.fr/i?a=1&b=2' });
  assert.equal(r.canaux.vibes, 'https://vibes.lgbt/g');
  assert.equal(r.notesInternes, 'Payé : non');
});

test('lireDescription : « Inscription : aucune » et lien avec texte différent', () => {
  const r = plain(C.lireDescription('<p>Voir <a href="https://x.fr">le site</a></p><p>Inscription : Aucune</p>'));
  assert.equal(r.descriptionPublique, 'Voir le site (https://x.fr)');
  assert.equal(r.inscription.mode, 'aucune');
});

test('lireDescription : une ligne canal sans lien reste dans le texte', () => {
  const r = plain(C.lireDescription('Discord : demandez à Alex'));
  assert.equal(r.descriptionPublique, 'Discord : demandez à Alex');
  assert.equal(r.canaux.discord, '');
});

test('lireDescription : vide', () => {
  assert.deepEqual(plain(C.lireDescription(undefined)), {
    descriptionPublique: '', notesInternes: '',
    inscription: { mode: 'normal', url: '' },
    canaux: { vibes: '', meetup: '', discord: '', instagram: '' },
    places: SANS_PLACES,
    tarif: SANS_TARIF,
    annulation: ''
  });
});

test('Places et Tarif : lignes écrites à la suite des lignes pratiques', () => {
  const d = C.construireDescription({
    descriptionPublique: 'Un jeu de mystère.\n\nScénario : Trouble Brewing\nAnimé par : Martin',
    places: { gerer: true, nombre: '12', inscription: 'obligatoire', complet: false },
    tarif: { choix: 'formule' },
    inscription: { mode: 'normal' }, canaux: {}
  });
  assert.equal(d, 'Un jeu de mystère.\n\nScénario : Trouble Brewing\nAnimé par : Martin\n' +
    'Places : 12, inscription obligatoire\nTarif : formule avec alcool 18 €, sans alcool 16 €');
  // Sans ligne pratique avant : paragraphe à part
  assert.equal(C.construireDescription({
    descriptionPublique: 'Venez jouer.', places: { gerer: true, nombre: '15', inscription: 'recommandee' },
    tarif: { choix: 'minimum', montant: '90' }, inscription: { mode: 'normal' }, canaux: {}
  }), 'Venez jouer.\n\nPlaces : 15, inscription recommandée\nTarif : consommation minimum de 90 €');
  // Case décochée ou tarif vide : pas de ligne
  assert.equal(C.construireDescription({
    descriptionPublique: 'X', places: { gerer: false, nombre: '12' }, tarif: { choix: '' }, inscription: { mode: 'normal' }, canaux: {}
  }), 'X');
});

test('Places : complet masque le bouton, et se relit comme « bouton habituel + complet »', () => {
  const champs = {
    descriptionPublique: 'Campagne de D&D.\n\nAnimé par : Balthazar',
    notesInternes: 'Places : 3 Discord / 3 Vibes',
    inscription: { mode: 'normal', url: '' },
    canaux: { vibes: '', meetup: '', discord: '', instagram: '' },
    places: { gerer: true, nombre: '', inscription: 'obligatoire', complet: true },
    tarif: SANS_TARIF,
    annulation: ''
  };
  const d = C.construireDescription(champs);
  assert.equal(d, 'Campagne de D&amp;D.\n\nAnimé par : Balthazar\nPlaces : complet\n\nInscription : aucune\n\n' +
    '---interne---\nPlaces : 3 Discord / 3 Vibes');
  assert.deepEqual(plain(C.lireDescription(d)), champs); // la ligne Places interne reste dans les notes
});

test('Tarif : relecture des choix, « Autre » pour un texte inconnu', () => {
  const tarif = d => plain(C.lireDescription(d)).tarif;
  assert.equal(tarif('Tarif : formule avec alcool 18€, sans alcool 16€').choix, 'formule');
  assert.equal(tarif('Tarif : tarifs et fonctionnement habituels du bar').choix, 'habituel');
  assert.deepEqual(tarif('Tarif : consommation minimum de 80 €'), { choix: 'minimum', montant: '80', texte: '' });
  assert.deepEqual(tarif('Tarif : 30 € par personne pour le MJ'), { choix: 'autre', montant: '', texte: '30 € par personne pour le MJ' });
  const r = plain(C.lireDescription('Texte\n\nTarif : formule avec alcool 18 €, sans alcool 16 €'));
  assert.equal(r.descriptionPublique, 'Texte');
});

test('Places : un format inconnu reste dans la description', () => {
  const r = plain(C.lireDescription('Venez !\nPlaces : 8 Discord / 8 Vibes'));
  assert.equal(r.descriptionPublique, 'Venez !\nPlaces : 8 Discord / 8 Vibes');
  assert.equal(r.places.gerer, false);
  assert.deepEqual(plain(C.lireDescription('Places : 15, inscription recommandée')).places,
    { gerer: true, nombre: '15', inscription: 'recommandee', complet: false });
});

test('horaires : soirée classique', () => {
  const h = plain(C.construireHoraires({ date: '2026-10-17', heureDebut: '19:30', heureFin: '23:00' }, 'Europe/Paris'));
  assert.deepEqual(h, {
    start: { dateTime: '2026-10-17T19:30:00', timeZone: 'Europe/Paris' },
    end: { dateTime: '2026-10-17T23:00:00', timeZone: 'Europe/Paris' }
  });
});

test('horaires : fin après minuit = lendemain (y compris fin de mois)', () => {
  const h = plain(C.construireHoraires({ date: '2026-10-31', heureDebut: '20:00', heureFin: '01:30' }, 'Europe/Paris'));
  assert.equal(h.end.dateTime, '2026-11-01T01:30:00');
});

test('horaires : journée entière (fin exclusive côté Google)', () => {
  assert.deepEqual(plain(C.construireHoraires({ journeeEntiere: true, date: '2026-12-31' })), {
    start: { date: '2026-12-31' }, end: { date: '2027-01-01' }
  });
  assert.deepEqual(plain(C.construireHoraires({ journeeEntiere: true, date: '2026-10-10', dateFin: '2026-10-11' })), {
    start: { date: '2026-10-10' }, end: { date: '2026-10-12' }
  });
});

test('lireHoraires : inverse de construireHoraires', () => {
  assert.deepEqual(plain(C.lireHoraires({ dateTime: '2026-10-17T19:30:00+02:00' }, { dateTime: '2026-10-18T01:00:00+02:00' })), {
    journeeEntiere: false, date: '2026-10-17', dateFin: '2026-10-18', heureDebut: '19:30', heureFin: '01:00'
  });
  assert.deepEqual(plain(C.lireHoraires({ date: '2026-10-10' }, { date: '2026-10-12' })), {
    journeeEntiere: true, date: '2026-10-10', dateFin: '2026-10-11', heureDebut: '', heureFin: ''
  });
});

test('récurrence : construire', () => {
  assert.deepEqual(plain(C.construireRecurrence({ frequence: 'aucune' })), []);
  assert.deepEqual(plain(C.construireRecurrence({ frequence: 'hebdo', fin: '' })), ['RRULE:FREQ=WEEKLY']);
  assert.deepEqual(plain(C.construireRecurrence({ frequence: 'bihebdo', fin: '2026-12-20' }, false)),
    ['RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261220T235959Z']);
  assert.deepEqual(plain(C.construireRecurrence({ frequence: 'hebdo', fin: '2026-12-20' }, true)),
    ['RRULE:FREQ=WEEKLY;UNTIL=20261220']);
});

test('récurrence : lire', () => {
  assert.deepEqual(plain(C.lireRecurrence(undefined)), { frequence: 'aucune', fin: '' });
  assert.deepEqual(plain(C.lireRecurrence(['RRULE:FREQ=WEEKLY;BYDAY=SA'])), { frequence: 'hebdo', fin: '' });
  assert.deepEqual(plain(C.lireRecurrence(['RRULE:FREQ=WEEKLY;WKST=MO;INTERVAL=2;BYDAY=TH;UNTIL=20261220T225959Z'])),
    { frequence: 'bihebdo', fin: '2026-12-20' });
  // Règles que l'outil ne sait pas modifier : conservées telles quelles
  assert.equal(C.lireRecurrence(['RRULE:FREQ=MONTHLY;BYDAY=1SA']).frequence, 'autre');
  assert.equal(C.lireRecurrence(['RRULE:FREQ=WEEKLY;BYDAY=TH,SA']).frequence, 'autre');
  assert.equal(C.lireRecurrence(['RRULE:FREQ=WEEKLY;COUNT=5']).frequence, 'autre');
  assert.equal(C.lireRecurrence(['RRULE:FREQ=WEEKLY', 'EXDATE:20261010T190000Z']).frequence, 'autre');
});

test('champsPropresALaDate : ce que la date modifiée a changé par rapport à sa série', () => {
  const serie = { summary: 'Créneau Libre', description: 'Tarif : consommation minimum de 90 €', colorId: '3' };
  assert.deepEqual(plain(C.champsPropresALaDate(serie, Object.assign({ id: 'a_1' }, serie))), {});
  assert.deepEqual(plain(C.champsPropresALaDate(serie, {
    summary: 'Réservation Client', description: '📌 Cette session est réservée par un client.\n\n---interne---\nClient : Dupont', colorId: '2'
  })), {
    summary: 'Réservation Client', description: '📌 Cette session est réservée par un client.\n\n---interne---\nClient : Dupont', colorId: '2'
  });
  // Couleur absente : la date suit celle de la série (on n'écrit pas de couleur vide)
  assert.deepEqual(plain(C.champsPropresALaDate(serie, { summary: 'Créneau Libre', description: '' })), { description: '' });
});

test('Annulation : titre « ANNULÉ - », raison en public, plus de bouton, lieux à annuler en interne', () => {
  const vue = {
    titre: 'Soirée BOTC',
    descriptionPublique: 'Un jeu de mystère.\n\nAnimé par : Martin',
    notesInternes: 'Publié : Discord ✅ 03/10 https://discord.com/channels/1/2 · Vibes ⏳',
    inscription: { mode: 'normal', url: '' },
    canaux: { vibes: '', meetup: 'https://www.meetup.com/au-de12/events/42', discord: '', instagram: '' },
    places: { gerer: true, nombre: '12', inscription: 'obligatoire', complet: false },
    tarif: { choix: 'formule', montant: '', texte: '' },
    annulation: ''
  };
  assert.deepEqual(plain(C.lieuxAAnnuler(vue)), [
    { canal: 'meetup', nom: 'Meetup', url: 'https://www.meetup.com/au-de12/events/42' },
    { canal: 'vibes', nom: 'Vibes', url: '' },
    { canal: 'discord', nom: 'Discord', url: 'https://discord.com/channels/1/2' }
  ]);

  const a = C.annulerChamps(vue, '  Martin est malade,\nreportée.  ', '12/10/2026', 'alice@au-de12paris.com');
  assert.equal(a.titre, 'ANNULÉ - Soirée BOTC');
  assert.ok(C.estAnnule(a.titre));
  const d = C.construireDescription(a);
  assert.equal(d, 'Annulé : Martin est malade, reportée.\n\n' +
    'Un jeu de mystère.\n\nAnimé par : Martin\nTarif : formule avec alcool 18 €, sans alcool 16 €\n\n' +
    'Inscription : aucune\n\n---interne---\n' +
    'Annulé le 12/10/2026 par alice@au-de12paris.com : Martin est malade, reportée.\n' +
    'À annuler à la main : Meetup ⏳ https://www.meetup.com/au-de12/events/42 · Vibes ⏳ · Discord ⏳ https://discord.com/channels/1/2\n' +
    'Publié : Discord ✅ 03/10 https://discord.com/channels/1/2 · Vibes ⏳');
  assert.ok(!stripInternal(d).includes('alice'));

  // Relu puis réécrit (formulaire) : rien ne change
  const relu = plain(C.lireDescription(d));
  assert.equal(relu.annulation, 'Martin est malade, reportée.');
  assert.equal(relu.descriptionPublique, 'Un jeu de mystère.\n\nAnimé par : Martin');
  assert.equal(C.construireDescription(relu), d);
});

test('Annulation : raison obligatoire, détection du titre', () => {
  assert.throws(() => C.annulerChamps({ titre: 'X' }, '   ', '12/10/2026', 'a'), /raison/);
  assert.ok(C.estAnnule('ANNULÉ - Tables Ouvertes'));
  assert.ok(C.estAnnule('Annulé : Tables Ouvertes'));
  assert.ok(C.estAnnule('ANNULE Tables'));
  assert.ok(!C.estAnnule('Annulation de la Ligue ? Non'));
  assert.ok(!C.estAnnule('Tables Ouvertes'));
  assert.equal(C.titreAnnule('ANNULÉ - Tables Ouvertes'), 'ANNULÉ - Tables Ouvertes');
});
