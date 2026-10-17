const TYPES = {
  normal: { name: 'Normal', color: '#a8a77a' }, feu: { name: 'Feu', color: '#ee8130' },
  eau: { name: 'Eau', color: '#6390f0' }, plante: { name: 'Plante', color: '#7ac74c' },
  electrik: { name: 'Électrik', color: '#e6c01c' }, glace: { name: 'Glace', color: '#6cc8c4' },
  combat: { name: 'Combat', color: '#c22e28' }, poison: { name: 'Poison', color: '#a33ea1' },
  sol: { name: 'Sol', color: '#c9a64a' }, vol: { name: 'Vol', color: '#a98ff3' },
  psy: { name: 'Psy', color: '#f95587' }, insecte: { name: 'Insecte', color: '#a6b91a' },
  roche: { name: 'Roche', color: '#b6a136' }, spectre: { name: 'Spectre', color: '#735797' },
  dragon: { name: 'Dragon', color: '#6f35fc' }, acier: { name: 'Acier', color: '#9a9ab5' },
  fee: { name: 'Fée', color: '#d685ad' },
};

// weight = tirage normal, guar = 5e carte (Rare ou mieux), dup = prix de revente au Marché
const RARITIES = [
  { key: 'C', sym: '◆', name: 'Commune', color: '#aab2bf', weight: 71, guar: 0, dup: 10 },
  { key: 'R', sym: '◆◆', name: 'Rare', color: '#4f9dff', weight: 26, guar: 91, dup: 25 },
  { key: 'E', sym: '◆◆◆', name: 'Épique', color: '#a66bff', weight: 2.5, guar: 7.3, dup: 60 },
  { key: 'L', sym: '★', name: 'Légendaire', color: '#f5c518', weight: 0.42, guar: 1.4, dup: 200 },
  { key: 'M', sym: '👑', name: 'Mythique', color: '#ff5a3c', weight: 0.08, guar: 0.3, dup: 600 },
];

const BOOSTERS = [
  { id: 'mix', scene: 'mix', name: 'Mix', sub: 'Tous les Pokémon', icon: '⭐', color: '#f5c518', mascot: 25, price: 150, types: null },
  { id: 'feu', scene: 'feu', name: 'Brasier', sub: 'Flammes et braises', icon: '🔥', color: '#ee6a2a', mascot: 6, price: 175, types: ['feu'] },
  { id: 'eau', scene: 'eau', name: 'Abysses', sub: 'Océans et glaciers', icon: '💧', color: '#3f7fe0', mascot: 9, price: 175, types: ['eau', 'glace'] },
  { id: 'plante', scene: 'plante', name: 'Sylve', sub: 'Forêts et insectes', icon: '🍃', color: '#4fa83a', mascot: 3, price: 175, types: ['plante', 'insecte'] },
  { id: 'elec', scene: 'electrik', name: 'Orage', sub: 'Haute tension', icon: '⚡', color: '#ffe600', mascot: 145, price: 175, types: ['electrik', 'acier'] },
  { id: 'psy', scene: 'psy', name: 'Arcanes', sub: 'Esprit et magie', icon: '🔮', color: '#e0457b', mascot: 150, price: 175, types: ['psy', 'fee'] },
  { id: 'spectre', scene: 'spectre', name: 'Ombres', sub: 'Spectres et venins', icon: '👻', color: '#7b54a8', mascot: 94, price: 175, types: ['spectre', 'poison'] },
  { id: 'combat', scene: 'combat', name: 'Arène', sub: 'Poings et rochers', icon: '👊', color: '#b5532e', mascot: 68, price: 175, types: ['combat', 'sol', 'roche'] },
  { id: 'ciel', scene: 'dragon', name: 'Firmament', sub: 'Ciel et dragons', icon: '🐉', color: '#5a5fd8', mascot: 149, price: 175, types: ['vol', 'dragon'] },
];

// Ligne n = Pokédex n : nom|types|rareté
const POKEMON = `Bulbizarre|plante,poison|C
Herbizarre|plante,poison|R
Florizarre|plante,poison|L
Salamèche|feu|C
Reptincel|feu|R
Dracaufeu|feu,vol|L
Carapuce|eau|C
Carabaffe|eau|R
Tortank|eau|L
Chenipan|insecte|C
Chrysacier|insecte|C
Papilusion|insecte,vol|R
Aspicot|insecte,poison|C
Coconfort|insecte,poison|C
Dardargnan|insecte,poison|R
Roucool|normal,vol|C
Roucoups|normal,vol|C
Roucarnage|normal,vol|R
Rattata|normal|C
Rattatac|normal|C
Piafabec|normal,vol|C
Rapasdepic|normal,vol|R
Abo|poison|C
Arbok|poison|R
Pikachu|electrik|E
Raichu|electrik|E
Sabelette|sol|C
Sablaireau|sol|R
Nidoran♀|poison|C
Nidorina|poison|C
Nidoqueen|poison,sol|E
Nidoran♂|poison|C
Nidorino|poison|C
Nidoking|poison,sol|E
Mélofée|fee|C
Mélodelfe|fee|R
Goupix|feu|C
Feunard|feu|E
Rondoudou|normal,fee|C
Grodoudou|normal,fee|R
Nosferapti|poison,vol|C
Nosferalto|poison,vol|R
Mystherbe|plante,poison|C
Ortide|plante,poison|C
Rafflesia|plante,poison|R
Paras|insecte,plante|C
Parasect|insecte,plante|R
Mimitoss|insecte,poison|C
Aéromite|insecte,poison|R
Taupiqueur|sol|C
Triopikeur|sol|R
Miaouss|normal|C
Persian|normal|R
Psykokwak|eau|C
Akwakwak|eau|R
Férosinge|combat|C
Colossinge|combat|R
Caninos|feu|C
Arcanin|feu|E
Ptitard|eau|C
Têtarte|eau|C
Tartard|eau,combat|R
Abra|psy|C
Kadabra|psy|R
Alakazam|psy|L
Machoc|combat|C
Machopeur|combat|R
Mackogneur|combat|E
Chétiflor|plante,poison|C
Boustiflor|plante,poison|C
Empiflor|plante,poison|R
Tentacool|eau,poison|C
Tentacruel|eau,poison|R
Racaillou|roche,sol|C
Gravalanch|roche,sol|C
Grolem|roche,sol|R
Ponyta|feu|C
Galopa|feu|R
Ramoloss|eau,psy|C
Flagadoss|eau,psy|R
Magnéti|electrik,acier|C
Magnéton|electrik,acier|R
Canarticho|normal,vol|C
Doduo|normal,vol|C
Dodrio|normal,vol|R
Otaria|eau|C
Lamantine|eau,glace|R
Tadmorv|poison|C
Grotadmorv|poison|R
Kokiyas|eau|C
Crustabri|eau,glace|R
Fantominus|spectre,poison|C
Spectrum|spectre,poison|R
Ectoplasma|spectre,poison|L
Onix|roche,sol|R
Soporifik|psy|C
Hypnomade|psy|R
Krabby|eau|C
Krabboss|eau|R
Voltorbe|electrik|C
Électrode|electrik|R
Noeunoeuf|plante,psy|C
Noadkoko|plante,psy|R
Osselait|sol|C
Ossatueur|sol|R
Kicklee|combat|R
Tygnon|combat|R
Excelangue|normal|R
Smogo|poison|C
Smogogo|poison|R
Rhinocorne|sol,roche|C
Rhinoféros|sol,roche|R
Leveinard|normal|E
Saquedeneu|plante|R
Kangourex|normal|E
Hypotrempe|eau|C
Hypocéan|eau|R
Poissirène|eau|C
Poissoroy|eau|R
Stari|eau|C
Staross|eau,psy|R
M. Mime|psy,fee|R
Insécateur|insecte,vol|E
Lippoutou|glace,psy|R
Élektek|electrik|R
Magmar|feu|R
Scarabrute|insecte|R
Tauros|normal|R
Magicarpe|eau|C
Léviator|eau,vol|L
Lokhlass|eau,glace|E
Métamorph|normal|R
Évoli|normal|R
Aquali|eau|E
Voltali|electrik|E
Pyroli|feu|E
Porygon|normal|R
Amonita|roche,eau|C
Amonistar|roche,eau|R
Kabuto|roche,eau|C
Kabutops|roche,eau|R
Ptéra|roche,vol|L
Ronflex|normal|L
Artikodin|glace,vol|M
Électhor|electrik,vol|M
Sulfura|feu,vol|M
Minidraco|dragon|C
Draco|dragon|R
Dracolosse|dragon,vol|L
Mewtwo|psy|M
Mew|psy|M`.split('\n').map((line, i) => {
  const [name, types, r] = line.split('|');
  return { id: i + 1, name, types: types.split(','), r };
});
