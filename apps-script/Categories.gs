// Catégories = couleurs Google Agenda (colorId), un tableau par calendrier.
// nom, teinte, bouton et salle doivent rester identiques au tableau COULEURS de docs/index.html du site public
// (dépôt calendrier-d12) tant que le site ne lit pas les catégories depuis une API.
//
//   bouton : 'inscription', 'reservation' ou null (aucun bouton sur le site)
//   salle  : JDR uniquement : 'bloque', 'libre' ou 'ligue'
//
// Réglages propres à l'outil (charte docs/formats-descriptions.md § 2.4 et 2.6) :
//   inscriptions     : case « Gérer les inscriptions » cochée à l'ouverture d'un nouvel évènement
//   places           : nombre de places prérempli (seulement Tables Ouvertes et BOTC)
//   modePlaces       : 'recommandee' si l'inscription est recommandée plutôt qu'obligatoire
//   tarifObligatoire : on ne peut pas enregistrer sans choisir un tarif

const CATEGORIES = {
  jds: [
    { colorId: '3', nom: 'Soirée BOTC',       teinte: '#512DA8', bouton: 'inscription', inscriptions: true, places: 12, tarifObligatoire: true },
    { colorId: '5', nom: 'Tables Ouvertes',   teinte: '#FDD835', bouton: 'inscription', inscriptions: true, places: 15, modePlaces: 'recommandee', tarifObligatoire: true },
    { colorId: '7', nom: 'Soirée Découverte', teinte: '#1E88E5', bouton: 'inscription', inscriptions: true, tarifObligatoire: true },
    { colorId: '9', nom: 'Évènement externe', teinte: '#3F51B5', bouton: null }
  ],
  jdr: [
    { colorId: '2',  nom: 'Réservation Client',                     teinte: '#7E57C2', bouton: null,          salle: 'bloque' },
    { colorId: '3',  nom: 'Créneau Libre',                          teinte: '#55b080', bouton: 'reservation', salle: 'libre' },
    { colorId: '4',  nom: 'MJ PRO - Vadrouilles & Magie',           teinte: '#E53935', bouton: 'inscription', salle: 'bloque', inscriptions: true },
    { colorId: '5',  nom: 'OS & Initiation',                        teinte: '#FB8C00', bouton: 'inscription', salle: 'bloque', inscriptions: true },
    { colorId: '8',  nom: 'MJ PRO - Campagne Semi-Ouverte',         teinte: '#455A64', bouton: null,          salle: 'bloque', inscriptions: true },
    { colorId: '9',  nom: 'Évènement externe',                      teinte: '#3F51B5', bouton: null,          salle: 'bloque' },
    { colorId: '11', nom: 'Créneau prioritaire à la Ligue Ludique', teinte: '#F06292', bouton: null,          salle: 'ligue' }
  ]
};
