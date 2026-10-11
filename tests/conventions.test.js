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
    canaux: { vibes: 'https://vibes.lgbt/a', meetup: '', discord: 'https://discord.com/c', instagram: '' }
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
    canaux: { vibes: '', meetup: '', discord: '', instagram: '' }
  });
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
