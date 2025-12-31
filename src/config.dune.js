// Dune-Universum Konfiguration
// Liste aller verfügbaren Planetennamen

const DUNE_PLANETS = [
  "Arrakis",
  "BelaTegeuse",
  "Caladan",
  "Chapterhouse",
  "Corrin",
  "Dune",
  "Ecaz",
  "Giedi",
  "GiediPrime",
  "Ginaz",
  "Harmonthep",
  "Ix",
  "Kaitain",
  "Lankiveil",
  "Ophiuchi",
  "Rakis",
  "Richese",
  "Salusa",
  "SalusaSecundus",
  "SietchJacurutu",
  "SietchMakab",
  "SietchTabr",
  "SietchTobr",
  "SietchWarrick",
  "Tleilax",
  "Tupile",
  "Wallach",
];

// Dune-inspired messages for controller signing
const DUNE_MESSAGES = [
  "The spice must flow... and so must information. Room analyzed.",
  "I must not fear. Fear is the mind-killer. This room has been scouted.",
  "The sleeper has awakened. Your room has been mapped.",
  "He who controls the spice controls the universe. I control the data now.",
  "Walk without rhythm, and you won't attract the worm. Room scouted silently.",
  "Bless the Maker and His water. This room has been blessed with analysis.",
  "A beginning is a very delicate time. This room's beginning has been documented.",
  "The mystery of life isn't a problem to solve, but a reality to experience. Room experienced.",
  "I see plans within plans. Your room is part of a greater plan.",
  "The power to destroy a thing is the absolute control over it. I control this room's data.",
  "Without change something sleeps inside us. This room has been awakened.",
  "The Fremen have a saying: 'God created Arrakis to train the faithful.' This room trains scouts.",
  "The spice extends life. The spice expands consciousness. This room expands knowledge.",
  "The voice of the people is the voice of God. The voice of this room has been heard.",
  "Muad'Dib has passed through here. Room scouted and analyzed.",
  "The desert takes the weak. This room has been claimed by the strong.",
  "Shai-Hulud watches. This room has been observed.",
  "Water is life. Data is power. This room's data has been collected.",
  "The Litany Against Fear has been recited. This room is no longer unknown.",
  "House Atreides sends its regards. Room intelligence gathered.",
];

/**
 * Wählt einen zufälligen Planetennamen aus allen verfügbaren Planeten
 * @returns {string} Planetname
 */
function getRandomPlanet() {
  return DUNE_PLANETS[Math.floor(Math.random() * DUNE_PLANETS.length)];
}

module.exports = {
  DUNE_PLANETS,
  DUNE_MESSAGES,
  getRandomPlanet,
};
