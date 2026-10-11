// Catégories = couleurs Google Agenda (colorId), un tableau par calendrier.
// Doit rester identique au tableau COULEURS de docs/index.html du site public
// (dépôt calendrier-d12) tant que le site ne lit pas les catégories depuis une API.
//
//   bouton : 'inscription', 'reservation' ou null (aucun bouton sur le site)
//   salle  : JDR uniquement : 'bloque', 'libre' ou 'ligue'

const CATEGORIES = {
  jds: [
    { colorId: '3', nom: 'Soirée BOTC',       teinte: '#512DA8', bouton: 'inscription' },
    { colorId: '5', nom: 'Tables Ouvertes',   teinte: '#FDD835', bouton: 'inscription' },
    { colorId: '7', nom: 'Soirée Découverte', teinte: '#1E88E5', bouton: 'inscription' }
  ],
  jdr: [
    { colorId: '2',  nom: 'Réservation Client',                     teinte: '#7E57C2', bouton: null,          salle: 'bloque' },
    { colorId: '3',  nom: 'Créneau Libre',                          teinte: '#55b080', bouton: 'reservation', salle: 'libre' },
    { colorId: '4',  nom: 'MJ PRO - Vadrouilles & Magie',           teinte: '#E53935', bouton: 'inscription', salle: 'bloque' },
    { colorId: '5',  nom: 'OS & Initiation',                        teinte: '#FB8C00', bouton: 'inscription', salle: 'bloque' },
    { colorId: '8',  nom: 'MJ PRO - Campagne Semi-Ouverte',         teinte: '#455A64', bouton: null,          salle: 'bloque' },
    { colorId: '11', nom: 'Créneau prioritaire à la Ligue Ludique', teinte: '#F06292', bouton: null,          salle: 'ligue' }
  ]
};
