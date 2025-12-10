const ResourceManager = require("./service.resource");

// Helper function to create fill level entries
const fillLevel = (storage, terminal = 0, factory = 0, extras = {}) => ({
  storage,
  terminal,
  factory,
  ...extras,
});

// Common fill level patterns
const BASE_RESOURCE = fillLevel(21000, 0, 2000); // Base resources (H, O, U, L, K, Z, catalyst, ghodium)
const COMMODITY = fillLevel(5000, 0, 2000); // Commodities (silicon, metal, biomass, mist)
const INTERMEDIATE = fillLevel(9000, 0, 0); // Intermediate compounds
const CATALYZED = fillLevel(21000, 0, 0); // Catalyzed resources
const BAR = fillLevel(5000, 0, 1000); // Bars and related
const NO_STORAGE = fillLevel(0, 0, 0); // No storage (many end products)
const SMALL_STORAGE = fillLevel(1000, 0, 0); // Small storage base (composite, crystal, liquid)

const fillLevelConfig = {
  [RESOURCE_ENERGY]: fillLevel(30000, 50000, 5000),
  [RESOURCE_POWER]: fillLevel(5000, 0, 0),
  [RESOURCE_HYDROGEN]: BASE_RESOURCE,
  [RESOURCE_OXYGEN]: BASE_RESOURCE,
  [RESOURCE_UTRIUM]: BASE_RESOURCE,
  [RESOURCE_LEMERGIUM]: BASE_RESOURCE,
  [RESOURCE_KEANIUM]: BASE_RESOURCE,
  [RESOURCE_ZYNTHIUM]: BASE_RESOURCE,
  [RESOURCE_CATALYST]: BASE_RESOURCE,
  [RESOURCE_GHODIUM]: BASE_RESOURCE,
  [RESOURCE_SILICON]: COMMODITY,
  [RESOURCE_METAL]: COMMODITY,
  [RESOURCE_BIOMASS]: COMMODITY,
  [RESOURCE_MIST]: COMMODITY,
  [RESOURCE_HYDROXIDE]: CATALYZED,
  [RESOURCE_ZYNTHIUM_KEANITE]: INTERMEDIATE,
  [RESOURCE_UTRIUM_LEMERGITE]: INTERMEDIATE,
  [RESOURCE_UTRIUM_HYDRIDE]: INTERMEDIATE,
  [RESOURCE_UTRIUM_OXIDE]: INTERMEDIATE,
  [RESOURCE_KEANIUM_HYDRIDE]: INTERMEDIATE,
  [RESOURCE_KEANIUM_OXIDE]: INTERMEDIATE,
  [RESOURCE_LEMERGIUM_HYDRIDE]: INTERMEDIATE,
  [RESOURCE_LEMERGIUM_OXIDE]: INTERMEDIATE,
  [RESOURCE_ZYNTHIUM_HYDRIDE]: INTERMEDIATE,
  [RESOURCE_ZYNTHIUM_OXIDE]: INTERMEDIATE,
  [RESOURCE_GHODIUM_HYDRIDE]: INTERMEDIATE,
  [RESOURCE_GHODIUM_OXIDE]: INTERMEDIATE,
  [RESOURCE_UTRIUM_ACID]: INTERMEDIATE,
  [RESOURCE_UTRIUM_ALKALIDE]: INTERMEDIATE,
  [RESOURCE_KEANIUM_ACID]: INTERMEDIATE,
  [RESOURCE_KEANIUM_ALKALIDE]: INTERMEDIATE,
  [RESOURCE_LEMERGIUM_ACID]: INTERMEDIATE,
  [RESOURCE_LEMERGIUM_ALKALIDE]: INTERMEDIATE,
  [RESOURCE_ZYNTHIUM_ACID]: INTERMEDIATE,
  [RESOURCE_ZYNTHIUM_ALKALIDE]: INTERMEDIATE,
  [RESOURCE_GHODIUM_ACID]: INTERMEDIATE,
  [RESOURCE_GHODIUM_ALKALIDE]: INTERMEDIATE,
  [RESOURCE_CATALYZED_UTRIUM_ACID]: CATALYZED,
  [RESOURCE_CATALYZED_UTRIUM_ALKALIDE]: CATALYZED,
  [RESOURCE_CATALYZED_KEANIUM_ACID]: CATALYZED,
  [RESOURCE_CATALYZED_KEANIUM_ALKALIDE]: CATALYZED,
  [RESOURCE_CATALYZED_LEMERGIUM_ACID]: CATALYZED,
  [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]: CATALYZED,
  [RESOURCE_CATALYZED_ZYNTHIUM_ACID]: CATALYZED,
  [RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE]: CATALYZED,
  [RESOURCE_CATALYZED_GHODIUM_ACID]: CATALYZED,
  [RESOURCE_CATALYZED_GHODIUM_ALKALIDE]: CATALYZED,
  [RESOURCE_OPS]: fillLevel(18000, 0, 0),
  [RESOURCE_UTRIUM_BAR]: BAR,
  [RESOURCE_LEMERGIUM_BAR]: BAR,
  [RESOURCE_ZYNTHIUM_BAR]: BAR,
  [RESOURCE_KEANIUM_BAR]: BAR,
  [RESOURCE_GHODIUM_MELT]: BAR,
  [RESOURCE_OXIDANT]: BAR,
  [RESOURCE_REDUCTANT]: BAR,
  [RESOURCE_PURIFIER]: BAR,
  [RESOURCE_BATTERY]: BAR,
  [RESOURCE_COMPOSITE]: fillLevel(1000, 0, 0, { factory2: 400, factory3: 1000 }),
  [RESOURCE_CRYSTAL]: fillLevel(1000, 0, 0, { factory5: 2200 }),
  [RESOURCE_LIQUID]: fillLevel(1000, 0, 0, { factory4: 3000, factory5: 3000 }),
  [RESOURCE_WIRE]: fillLevel(0, 0, 0, { factory1: 800, factory2: 300, factory3: 234 }),
  [RESOURCE_SWITCH]: fillLevel(0, 0, 0, { factory2: 80, factory4: 80 }),
  [RESOURCE_TRANSISTOR]: fillLevel(0, 0, 0, { factory3: 40, factory4: 100 }),
  [RESOURCE_MICROCHIP]: fillLevel(0, 0, 0, { factory4: 20, factory5: 60 }),
  [RESOURCE_CIRCUIT]: fillLevel(0, 0, 0, { factory5: 20 }),
  [RESOURCE_DEVICE]: NO_STORAGE,
  [RESOURCE_CELL]: fillLevel(0, 0, 0, { factory1: 400, factory2: 200, factory5: 620 }),
  [RESOURCE_PHLEGM]: fillLevel(0, 0, 0, { factory2: 200, factory3: 60 }),
  [RESOURCE_TISSUE]: fillLevel(0, 0, 0, { factory3: 60, factory4: 100, factory5: 120 }),
  [RESOURCE_MUSCLE]: fillLevel(0, 0, 0, { factory4: 20 }),
  [RESOURCE_ORGANOID]: fillLevel(0, 0, 0, { factory5: 20 }),
  [RESOURCE_ORGANISM]: NO_STORAGE,
  [RESOURCE_ALLOY]: fillLevel(0, 0, 0, { factory1: 800, factory2: 820 }),
  [RESOURCE_TUBE]: fillLevel(0, 0, 0, { factory3: 80, factory4: 300, factory5: 240 }),
  [RESOURCE_FIXTURES]: fillLevel(0, 0, 0, { factory3: 40, factory4: 60, factory5: 240 }),
  [RESOURCE_FRAME]: fillLevel(0, 0, 0, { factory5: 40 }),
  [RESOURCE_HYDRAULICS]: fillLevel(0, 0, 0, { factory5: 20 }),
  [RESOURCE_MACHINE]: NO_STORAGE,
  [RESOURCE_CONDENSATE]: fillLevel(0, 0, 0, { factory1: 600, factory2: 600 }),
  [RESOURCE_CONCENTRATE]: fillLevel(0, 0, 0, { factory2: 200, factory3: 120, factory4: 60 }),
  [RESOURCE_EXTRACT]: fillLevel(0, 0, 0, { factory3: 40, factory4: 40 }),
  [RESOURCE_SPIRIT]: fillLevel(0, 0, 0, { factory4: 40, factory5: 60 }),
  [RESOURCE_EMANATION]: fillLevel(0, 0, 0, { factory5: 20 }),
  [RESOURCE_ESSENCE]: NO_STORAGE,
};

/**
 * Get resource image HTML for console display
 * @param {string} resourceType - The resource type
 * @returns {string} HTML string with image link
 */
function resourceImg(resourceType) {
  return (
    '<a target="_blank" href="https://screeps.com/a/#!/market/all/' +
    Game.shard.name +
    "/" +
    resourceType +
    '"><img src ="https://s3.amazonaws.com/static.screeps.com/upload/mineral-icons/' +
    resourceType +
    '.png" /></a>'
  );
}

/**
 * Get global resource amount across all rooms
 * @param {string} resource - Resource type
 * @returns {number} Total amount
 */
function globalResourcesAmount(resource) {
  return ResourceManager.getGlobalResourceAmount(resource);
}

/**
 * Reorder resources in terminal/storage display
 */
function reorderResources() {
  const scriptInject = `
<script>
const g = window || global;
clearInterval(g.resourceReorder);
g.resourceReorder = setInterval(() => {
    /* Resources are are grouped by functionality. Color is sorted by Hue within a category */
    const resourceOrder = ["energy","power", "H","O","Z","L","U","K","X","G","OH","ZK","UL","ZH","ZH2O","XZH2O","ZO","ZHO2","XZHO2","LH","LH2O","XLH2O","LO","LHO2","XLHO2","UH","UH2O","XUH2O","UO","UHO2","XUHO2","KH","KH2O","XKH2O","KO","KHO2","XKHO2","GH","GH2O","XGH2O","GO","GHO2","XGHO2","ops","battery","reductant","oxidant","zynthium_bar","lemergium_bar","utrium_bar","keanium_bar","purifier","ghodium_melt","composite","crystal","liquid","metal","alloy","tube","wire","fixtures","frame","hydraulics","machine","biomass","cell","phlegm","tissue","muscle","organoid","organism","silicon","wire","switch","transistor","microchip","circuit","device","mist","condensate","concentrate","extract","spirit","emanation","essence"];;
    const $scope = angular.element(document.getElementsByClassName('carry-resource')[0]).scope();
    if(!$scope){ return; }
    const orderedStore = {};
    const curStore = $scope.Room.selectedObject.store;
    for (const resource of resourceOrder) {
        if (resource in curStore) {
            orderedStore[resource] = curStore[resource];
        }
    }
    /* Need to append a random element to force an angular update */
    orderedStore['dummy_' + Math.random()] = 0;
    $scope.Room.selectedObject.store = orderedStore;
}, 1000);
</script>`.replace(/\r?\n|\r/g, ``);
  const Log = require("./lib.log");
  Log.info(scriptInject, "ScriptInject");
}

module.exports = {
  fillLevelConfig,
  resourceImg,
  globalResourcesAmount,
  reorderResources
};

