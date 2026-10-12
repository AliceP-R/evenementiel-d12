// Conventions Google Agenda d'Au Dé 12
//
// Traduit les champs du formulaire en description / horaires / récurrence Google Agenda,
// et inversement. Fonctions pures (aucun appel à Google) : testées avec Node, cf. tests/.
//
// Format écrit dans la description :
//
//   Annulé : <raison>                     (évènement annulé, cf. Annulation)
//
//   <description publique>
//   Places : 12, inscription obligatoire   (ou « Places : complet », cf. champs Places)
//   Tarif : <tarif>                        (cf. champ Tarif)
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

// Tarifs proposés dans le formulaire (charte : docs/formats-descriptions.md § 2.6)
const TARIFS = {
  formule: 'formule avec alcool 18 €, sans alcool 16 €',
  habituel: 'tarifs et fonctionnement habituels du bar'
};
const MODES_PLACES = { obligatoire: 'inscription obligatoire', recommandee: 'inscription recommandée' };

// Lignes de la description publique qui « collent » aux lignes Places / Tarif (même paragraphe)
const LIGNE_PRATIQUE = /^\s*(scénario|niveau|animé par|organisé par|places|tarif)\s*:/i;

// Évènement annulé : titre « ANNULÉ - … » et 1re ligne publique « Annulé : <raison> »
const PREFIXE_ANNULE = 'ANNULÉ - ';
const TITRE_ANNULE = /^\s*ANNUL[ÉE]E?(?![\p{L}])\s*[-–—:]?\s*/iu;
const LIGNE_ANNULATION = /^\s*annul[ée]e?\s*:\s*(.*\S)\s*$/i;
// Où l'évènement peut avoir été publié à la main (et donc où l'annuler à la main)
const LIEUX_A_ANNULER = [
  { canal: 'meetup', nom: 'Meetup', domaine: /meetup\.com/i },
  { canal: 'vibes', nom: 'Vibes', domaine: /vibes/i },
  { canal: 'discord', nom: 'Discord', domaine: /discord(?:app)?\.(?:com|gg)/i }
];

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
  const places = placesVides();
  const tarif = { choix: '', montant: '', texte: '' };
  let annulation = '';
  const lignes = [];

  publique.split('\n').forEach(ligne => {
    const a = ligne.match(LIGNE_ANNULATION);
    if (a && !annulation) { annulation = a[1]; return; }
    const p = ligne.match(/^\s*places\s*:\s*(.*)$/i);
    if (p && !places.gerer) {
      const lues = lirePlaces(p[1]);
      if (lues) { Object.assign(places, lues); return; }
    }
    const t = ligne.match(/^\s*tarif\s*:\s*(.*\S)\s*$/i);
    if (t && !tarif.choix) { Object.assign(tarif, lireTarif(t[1])); return; }
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

  // « Complet » : c'est l'outil qui a ajouté « Inscription : aucune » pour masquer le bouton
  if (places.complet && inscription.mode === 'aucune') inscription.mode = 'normal';

  return {
    descriptionPublique: lignes.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    notesInternes,
    inscription,
    canaux,
    places,
    tarif,
    annulation
  };
}

function placesVides() {
  return { gerer: false, nombre: '', inscription: 'obligatoire', complet: false };
}

// « 12, inscription obligatoire » / « complet » → champs Places (null si le texte n'est pas reconnu : il reste dans la description)
function lirePlaces(texte) {
  const t = String(texte).trim();
  if (/^complet\.?$/i.test(t)) return { gerer: true, nombre: '', inscription: 'obligatoire', complet: true };
  const m = t.match(/^(\d+)\s*,\s*inscription\s+(obligatoire|recommand[ée]e)\.?$/i);
  if (!m) return null;
  return { gerer: true, nombre: m[1], inscription: /^oblig/i.test(m[2]) ? 'obligatoire' : 'recommandee', complet: false };
}

// Texte après « Tarif : » → choix du formulaire (un texte inconnu devient « Autre »)
function lireTarif(texte) {
  const t = String(texte).trim();
  const normal = s => s.toLowerCase().replace(/\s+/g, ' ').replace(/\s*€/g, ' €').replace(/\.$/, '');
  if (normal(t) === normal(TARIFS.formule)) return { choix: 'formule', montant: '', texte: '' };
  if (normal(t) === normal(TARIFS.habituel)) return { choix: 'habituel', montant: '', texte: '' };
  const m = t.match(/^consommation minimum de (\d+(?:[.,]\d+)?)\s*€\.?$/i);
  if (m) return { choix: 'minimum', montant: m[1], texte: '' };
  return { choix: 'autre', montant: '', texte: t };
}

// Champs Places → texte après « Places : » ('' si pas de ligne)
function textePlaces(places) {
  if (!places || !places.gerer) return '';
  if (places.complet) return 'complet';
  const nombre = String(places.nombre || '').trim();
  return nombre ? `${nombre}, ${MODES_PLACES[places.inscription] || MODES_PLACES.obligatoire}` : '';
}

// Champ Tarif → texte après « Tarif : » ('' si pas de ligne)
function texteTarif(tarif) {
  if (!tarif) return '';
  if (TARIFS[tarif.choix]) return TARIFS[tarif.choix];
  if (tarif.choix === 'minimum') {
    const montant = String(tarif.montant || '').trim();
    return montant ? `consommation minimum de ${montant} €` : '';
  }
  if (tarif.choix === 'autre') return String(tarif.texte || '').trim();
  return '';
}

// Champs du formulaire → description Google Agenda
function construireDescription(champs) {
  const blocs = [];
  // Annulé : la raison en premier, plus de bouton, de liens par canal ni de places
  const annulation = String(champs.annulation || '').replace(/\s+/g, ' ').trim();
  if (annulation) {
    blocs.push('Annulé : ' + echapperHtml(annulation));
    champs = Object.assign({}, champs, { inscription: { mode: 'aucune' }, canaux: {}, places: placesVides() });
  }
  let publique = (champs.descriptionPublique || '').trim();

  // Places et Tarif : à la suite des lignes pratiques (Animé par…), sinon dans un paragraphe à part
  const pratiques = [];
  const places = textePlaces(champs.places);
  if (places) pratiques.push('Places : ' + places);
  const tarif = texteTarif(champs.tarif);
  if (tarif) pratiques.push('Tarif : ' + tarif);
  if (pratiques.length) {
    const derniere = publique.split('\n').pop();
    publique = publique ? publique + (LIGNE_PRATIQUE.test(derniere) ? '\n' : '\n\n') + pratiques.join('\n') : pratiques.join('\n');
  }
  if (publique) blocs.push(echapperHtml(publique));

  const lignes = [];
  const inscription = champs.inscription || {};
  const complet = !!(champs.places && champs.places.gerer && champs.places.complet);
  if (complet) {
    lignes.push('Inscription : aucune'); // complet : le bouton est masqué
  } else if (inscription.mode === 'externe' && (inscription.url || '').trim()) {
    lignes.push('Inscription : ' + echapperHtml(inscription.url.trim()));
  } else if (inscription.mode === 'aucune') {
    lignes.push('Inscription : aucune');
  }
  // Le site n'utilise ces liens qu'avec le bouton habituel (sinon il les afficherait en texte brut)
  const canaux = complet || inscription.mode === 'externe' || inscription.mode === 'aucune' ? {} : champs.canaux || {};
  CANAUX.forEach(c => {
    const url = (canaux[c] || '').trim();
    if (url) lignes.push(NOMS_CANAUX[c] + ' : ' + echapperHtml(url));
  });
  if (lignes.length) blocs.push(lignes.join('\n'));

  const notes = (champs.notesInternes || '').trim();
  if (notes) blocs.push('---interne---\n' + echapperHtml(notes));

  return blocs.join('\n\n');
}

// ---------- Annulation ----------

function estAnnule(titre) {
  return TITRE_ANNULE.test(String(titre || ''));
}

function titreAnnule(titre) {
  return PREFIXE_ANNULE + titreSansAnnulation(titre);
}

function titreSansAnnulation(titre) {
  return String(titre || '').replace(TITRE_ANNULE, '').trim();
}

// Liens Meetup, Vibes, Discord connus pour cet évènement (liens par canal, sinon notes internes ou description).
// Tous les lieux sont renvoyés, avec url '' quand aucun lien n'est connu : à vérifier à la main.
function lieuxAAnnuler(vue) {
  const textes = [vue.notesInternes || '', vue.descriptionPublique || ''].join('\n');
  const liens = textes.match(/https?:\/\/[^\s<>"']+/g) || [];
  return LIEUX_A_ANNULER.map(l => ({
    canal: l.canal,
    nom: l.nom,
    url: ((vue.canaux || {})[l.canal] || '').trim() || liens.find(u => l.domaine.test(u)) || ''
  }));
}

// Champs d'un évènement → mêmes champs, annulé : titre « ANNULÉ - … », raison en public,
// et en interne qui a annulé, quand, et les lieux où l'annuler à la main (avec leurs liens, qui disparaissent du public).
function annulerChamps(vue, raison, quand, qui) {
  const r = String(raison || '').replace(/\s+/g, ' ').trim();
  if (!r) throw new Error("Indique la raison de l'annulation.");
  const lieux = lieuxAAnnuler(vue).map(l => l.nom + ' ⏳' + (l.url ? ' ' + l.url : '')).join(' · ');
  const notes = [`Annulé le ${quand} par ${qui} : ${r}`, 'À annuler à la main : ' + lieux, (vue.notesInternes || '').trim()];
  return Object.assign({}, vue, {
    titre: titreAnnule(vue.titre),
    annulation: r,
    notesInternes: notes.filter(Boolean).join('\n')
  });
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
