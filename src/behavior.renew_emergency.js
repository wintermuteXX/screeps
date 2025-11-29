/**
 * Legacy-Alias für behavior.renew mit mode "emergency"
 * Wird für Abwärtskompatibilität beibehalten
 * 
 * Neuer Code sollte "renew:emergency" verwenden
 */
var createRenewBehavior = require("behavior.renew");

// Exportiere das Emergency-Behavior direkt
module.exports = createRenewBehavior("renew_emergency");
