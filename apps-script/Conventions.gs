// Conventions Google Agenda d'Au Dé 12
//
// Traduit les champs du formulaire en description / horaires / récurrence Google Agenda,
// et inversement. Fonctions pures (aucun appel à Google) : testées avec Node, cf. tests/.
//
// Format écrit dans la description :
//
//   <description publique>
//
//   Inscription : <lien>          (ou « Inscription : aucune »)
//   Vibes : <lien>
//   Meetup : <lien>
//   Discord : <lien>
//   Instagram : <lien>
//
//   ---interne---
//   <notes internes : jamais envoyées au public>

const CANAUX = ['vibes', 'meetup', 'discord', 'instagram'];
const NOMS_CANAUX = { vibes: 'Vibes', meetup: 'Meetup', discord: 'Discord', instagram: 'Instagram' };

// Même tolérance que stripInternal() dans le Code.gs du site public
const MARQUEUR_INTERNE = /(?:-{2,}|[–—]+)\s*interne\s*(?:-{2,}|[–—]+)/i;

// ---------- Description ----------

// Convertit la description Google Agenda (souvent du HTML) en texte simple
function htmlEnTexte(html) {
  if (!html) return '';
  return String(html)
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    // Lien : on garde l'adresse (et le texte s'il est différent)
    .replace(/<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (tout, href, texte) => {
      const t = texte.replace(/<[^>]*>/g, '').trim();
      const h = decoderEntites(href);
      return !t || decoderEntites(t) === h ? h : `${t} (${h})`;
    })
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, decoderEntites)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decoderEntites(texte) {
  const entites = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
  return String(texte).replace(/&[a-z]+;|&#\d+;/gi, e => {
    if (entites[e.toLowerCase()]) return entites[e.toLowerCase()];
    const code = e.match(/^&#(\d+);$/);
    return code ? String.fromCharCode(Number(code[1])) : e;
  });
}

// Le site public insère la description en HTML : on échappe le texte saisi
function echapperHtml(texte) {
  return String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Description Google Agenda → champs du formulaire
function lireDescription(description) {
  const texte = htmlEnTexte(description);
  const coupure = texte.search(MARQUEUR_INTERNE);
  const publique = coupure === -1 ? texte : texte.substring(0, coupure);
  const notesInternes = coupure === -1 ? '' : texte.substring(coupure).replace(MARQUEUR_INTERNE, '').trim();

  const inscription = { mode: 'normal', url: '' };
  const canaux = { vibes: '', meetup: '', discord: '', instagram: '' };
  const lignes = [];

  publique.split('\n').forEach(ligne => {
    const m = ligne.match(/^\s*(inscription|vibes|meetup|discord|instagram)\s*:\s*(.*)$/i);
    if (m) {
      const cle = m[1].toLowerCase();
      const url = (m[2].match(/https?:\/\/\S+/) || [''])[0];
      if (cle === 'inscription') {
        if (url) { inscription.mode = 'externe'; inscription.url = url; return; }
        if (/^aucune/i.test(m[2].trim())) { inscription.mode = 'aucune'; return; }
      } else if (url) {
        canaux[cle] = url;
        return;
      }
    }
    lignes.push(ligne);
  });

  return {
    descriptionPublique: lignes.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    notesInternes,
    inscription,
    canaux
  };
}

// Champs du formulaire → description Google Agenda
function construireDescription(champs) {
  const blocs = [];
  const publique = (champs.descriptionPublique || '').trim();
  if (publique) blocs.push(echapperHtml(publique));

  const lignes = [];
  const inscription = champs.inscription || {};
  if (inscription.mode === 'externe' && (inscription.url || '').trim()) {
    lignes.push('Inscription : ' + echapperHtml(inscription.url.trim()));
  } else if (inscription.mode === 'aucune') {
    lignes.push('Inscription : aucune');
  }
  // Le site n'utilise ces liens qu'avec le bouton habituel (sinon il les afficherait en texte brut)
  const canaux = inscription.mode === 'externe' || inscription.mode === 'aucune' ? {} : champs.canaux || {};
  CANAUX.forEach(c => {
    const url = (canaux[c] || '').trim();
    if (url) lignes.push(NOMS_CANAUX[c] + ' : ' + echapperHtml(url));
  });
  if (lignes.length) blocs.push(lignes.join('\n'));

  const notes = (champs.notesInternes || '').trim();
  if (notes) blocs.push('---interne---\n' + echapperHtml(notes));

  return blocs.join('\n\n');
}

// ---------- Horaires ----------

function ajouterJours(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// start / end Google Agenda → champs du formulaire.
// Les dateTime doivent être exprimés dans le fuseau du bar (paramètre timeZone de l'API).
function lireHoraires(start, end) {
  if (start.date) {
    return {
      journeeEntiere: true,
      date: start.date,
      dateFin: ajouterJours(end.date || start.date, end.date ? -1 : 0), // Google : fin exclusive
      heureDebut: '',
      heureFin: ''
    };
  }
  return {
    journeeEntiere: false,
    date: start.dateTime.slice(0, 10),
    dateFin: end.dateTime.slice(0, 10),
    heureDebut: start.dateTime.slice(11, 16),
    heureFin: end.dateTime.slice(11, 16)
  };
}

// Champs du formulaire → start / end Google Agenda.
// Une heure de fin inférieure ou égale au début signifie « le lendemain » (fin de service après minuit).
function construireHoraires(champs, fuseau) {
  if (champs.journeeEntiere) {
    const dateFin = champs.dateFin && champs.dateFin >= champs.date ? champs.dateFin : champs.date;
    return {
      start: { date: champs.date },
      end: { date: ajouterJours(dateFin, 1) }
    };
  }
  const lendemain = champs.heureFin <= champs.heureDebut;
  return {
    start: { dateTime: `${champs.date}T${champs.heureDebut}:00`, timeZone: fuseau },
    end: { dateTime: `${lendemain ? ajouterJours(champs.date, 1) : champs.date}T${champs.heureFin}:00`, timeZone: fuseau }
  };
}

// ---------- Récurrence ----------

// recurrence Google Agenda → { frequence: 'aucune' | 'hebdo' | 'bihebdo' | 'autre', fin: 'AAAA-MM-JJ' | '' }
// « autre » : règle faite dans Google Agenda que l'outil ne sait pas modifier (on la conserve telle quelle)
function lireRecurrence(recurrence) {
  if (!recurrence || !recurrence.length) return { frequence: 'aucune', fin: '' };
  const regles = recurrence.filter(r => /^RRULE:/i.test(r));
  if (regles.length !== 1 || recurrence.length !== 1) return { frequence: 'autre', fin: '' };

  const params = {};
  regles[0].replace(/^RRULE:/i, '').split(';').forEach(p => {
    const [cle, valeur] = p.split('=');
    params[cle.toUpperCase()] = valeur;
  });
  const connus = ['FREQ', 'INTERVAL', 'UNTIL', 'BYDAY', 'WKST'];
  const inconnu = Object.keys(params).some(k => connus.indexOf(k) === -1);
  const plusieursJours = params.BYDAY && params.BYDAY.split(',').length > 1;
  const intervalle = Number(params.INTERVAL || 1);
  if (params.FREQ !== 'WEEKLY' || inconnu || plusieursJours || (intervalle !== 1 && intervalle !== 2)) {
    return { frequence: 'autre', fin: '' };
  }
  const fin = params.UNTIL ? `${params.UNTIL.slice(0, 4)}-${params.UNTIL.slice(4, 6)}-${params.UNTIL.slice(6, 8)}` : '';
  return { frequence: intervalle === 2 ? 'bihebdo' : 'hebdo', fin };
}

// { frequence, fin } → recurrence Google Agenda (tableau vide si pas de répétition)
function construireRecurrence(rec, journeeEntiere) {
  if (!rec || (rec.frequence !== 'hebdo' && rec.frequence !== 'bihebdo')) return [];
  let regle = 'RRULE:FREQ=WEEKLY';
  if (rec.frequence === 'bihebdo') regle += ';INTERVAL=2';
  if (rec.fin) {
    const compact = rec.fin.replace(/-/g, '');
    // RFC 5545 : UNTIL en date seule pour une journée entière, en UTC sinon
    regle += ';UNTIL=' + (journeeEntiere ? compact : compact + 'T235959Z');
  }
  return [regle];
}
