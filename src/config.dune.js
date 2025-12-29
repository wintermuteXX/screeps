// Dune-Universum Konfiguration
// Planeten und ihre zugehörigen Fraktionen

const DUNE_PLANETS = {
  atreides: [
    "Caladan", "Arrakis", "Dune", "Ix", "Ecaz", "Giedi", "Kaitain", "Salusa", "Wallach", "Ginaz",
  ],
  harkonnen: [
    "GiediPrime", "Lankiveil", "Tupile", "BelaTegeuse", "Harmonthep", "Richese", "Tleilax", "Ix", "Ecaz",
  ],
  fremen: [
    "Arrakis", "Dune", "SietchTabr", "SietchJacurutu", "SietchMakab", "SietchTobr", "SietchWarrick",
  ],
  corrino: [
    "Kaitain", "SalusaSecundus", "Corrin", "Ophiuchi", "BelaTegeuse", "Richese", "Tupile",
  ],
  beneGesserit: [
    "Wallach", "Chapterhouse", "Rakis", "Tupile", "BelaTegeuse", "Richese", "Tleilax",
  ],
  mentat: [
    "Ix", "Tleilax", "Ecaz", "Ginaz", "Richese", "BelaTegeuse",
  ],
  sardaukar: [
    "SalusaSecundus", "Kaitain", "Corrin", "Ophiuchi",
  ],
  other: [
    "Tleilax", "Ix", "Richese", "Ecaz", "Ginaz", "BelaTegeuse", "Tupile", "Ophiuchi",
  ],
};

// Dune-Namen gruppiert nach Fraktionen
const DUNE_NAMES = {
  atreides: {
    firstNames: ["Paul", "Leto", "Duncan", "Gurney", "Thufir", "Jessica", "Alia", "Ghanima", "LetoII", "Miles", "Teg"],
    lastNames: ["Atreides", "Idaho", "Halleck", "Hawat", "Yueh", "Mapes", "Teg"],
  },
  harkonnen: {
    firstNames: ["Vladimir", "Feyd", "Glossu", "Piter", "Beast", "Rabban", "Abulurd"],
    lastNames: ["Harkonnen", "deVries", "Raban"],
  },
  fremen: {
    firstNames: ["Stilgar", "Chani", "Jamis", "Liet", "Otheym", "Harah", "Shadout", "Ramallo", "Naib", "MuadDib", "Usul"],
    lastNames: ["Kynes", "Stilgar", "Otheym", "Mapes", "alGaib"],
  },
  corrino: {
    firstNames: ["Shaddam", "Irulan", "Wensicia", "Faradn", "Corrino", "Elrood"],
    lastNames: ["Corrino", "IV"],
  },
  beneGesserit: {
    firstNames: ["Gaius", "Helen", "Mohiam", "Reverend", "Mother", "Bene", "Odrade", "Sheeana", "Murbella"],
    lastNames: ["Mohiam", "Gesserit", "Ramallo", "Odrade"],
  },
  mentat: {
    firstNames: ["Thufir", "Piter", "Mentat", "Hayt"],
    lastNames: ["Hawat", "deVries", "Mentat"],
  },
  sardaukar: {
    firstNames: ["Bashar", "Sardaukar", "Imperial", "Zensunni"],
    lastNames: ["Sardaukar", "Imperial"],
  },
  other: {
    firstNames: ["Moneo", "Siona", "Miles", "Teg", "Odrade", "Sheeana", "Duncan", "Hayt"],
    lastNames: ["Atreides", "Teg", "Odrade", "Idaho"],
  },
};

/**
 * Wählt eine zufällige Fraktion basierend auf verfügbaren Planeten
 * @returns {string} Fraktionsname
 */
function getRandomFaction() {
  const factions = Object.keys(DUNE_PLANETS);
  return factions[Math.floor(Math.random() * factions.length)];
}

/**
 * Wählt einen zufälligen Planetennamen aus allen verfügbaren Planeten
 * @returns {string} Planetname
 */
function getRandomPlanet() {
  const allPlanets = [];
  for (const faction in DUNE_PLANETS) {
    allPlanets.push(...DUNE_PLANETS[faction]);
  }
  // Entferne Duplikate
  const uniquePlanets = [...new Set(allPlanets)];
  return uniquePlanets[Math.floor(Math.random() * uniquePlanets.length)];
}

module.exports = {
  DUNE_PLANETS,
  DUNE_NAMES,
  getRandomFaction,
  getRandomPlanet,
};
