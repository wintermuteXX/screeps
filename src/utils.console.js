const utilsResources = require("./utils.resources");
const cpuAnalyzer = require("./service.cpu");
const ControllerRoom = require("./controller.room");
const ControllerGame = require("./controller.game");
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

/**
 * Displays all available helper functions in a compact table format
 * Usage: help() or help('category')
 * Categories: 'all', 'resources', 'planner', 'market', 'utils'
 * @param {string} category - Category to show (default: 'all')
 * @returns {string} HTML table string
 */
function help(category = "all") {
  const functions = {
    resources: [
      { name: "showResources(hide)", desc: "Table of all resources across rooms", example: "showResources(true)" },
      { name: "showLabs()", desc: "Table showing lab status and reactions", example: "showLabs()" },
      { name: "showLogistic(roomName)", desc: "Shows transport orders (givesResources and needsResources)", example: 'showLogistic("W1N1")' },
      { name: "showTerminals()", desc: "Table showing what's in all terminals", example: "showTerminals()" },
    ],
    planner: [
      { name: "plannerVisualize(room)", desc: "Visualizes planned layout in game view", example: 'plannerVisualize("W1N1")' },
      { name: "plannerStats(room)", desc: "Statistics about planned layout", example: 'plannerStats("W1N1")' },
      { name: "plannerRun(room)", desc: "Runs RoomPlanner manually", example: 'plannerRun("W1N1")' },
      { name: "plannerSetCenter(room, x, y)", desc: "Sets center coordinates for planning", example: 'plannerSetCenter("W1N1", 25, 25)' },
      { name: "plannerReset(room)", desc: "Resets layout for a room", example: 'plannerReset("W1N1")' },
      { name: "plannerOrphaned(room)", desc: "Lists orphaned structures", example: 'plannerOrphaned("W1N1")' },
      { sub: "Recalculate" },
      { name: "plannerRecalculateExtensions(room)", desc: "Recalculates extension placements", example: 'plannerRecalculateExtensions("W1N1")' },
      { name: "plannerRecalculateExtensionsAll()", desc: "Recalculates extensions for all rooms", example: "plannerRecalculateExtensionsAll()" },
      { name: "plannerRecalculateLabs(room)", desc: "Recalculates lab placements", example: 'plannerRecalculateLabs("W1N1")' },
    ],
    stats: [
      { name: "showCPU()", desc: "Shows CPU usage statistics", example: "showCPU()" },
      { name: "showRclUpgradeTimes()", desc: "Shows RCL upgrade times for all owned rooms", example: "showRclUpgradeTimes()" },
      { name: "showScout(room, duration)", desc: "Shows scout data on world map", example: 'showScout("W1N1")' },
    ],
    market: [
      { name: "showMarket()", desc: "Table with market info (prices, amounts, orders)", example: "showMarket()" },
    ],
    creeps: [
      { name: "cc(spawn, role, memory?)", desc: "Create a creep manually at a specific spawn", example: 'cc("Spawn3", "supporter")' },
    ],
    utils: [
      { name: "json(x)", desc: "Pretty-print JSON", example: 'json({key: "value"})' },
      { name: "cleanMemory(type, property)", desc: "Cleans up memory by removing specified property", example: 'cleanMemory("rooms", "dunePlanet")' },
      { name: "profileMemory(root, depth)", desc: "Profiles memory usage by calculating JSON sizes", example: "profileMemory(Memory, 2)" },
    ],
  };

  const headers = ["FUNCTION", "DESCRIPTION", "EXAMPLE"];
  const rows = [];

  const renderFunc = (func) => {
    if (func.sub) {
      rows.push({ type: "subheading", content: `── ${func.sub} ──`, colspan: 3, style: "padding: 3px 5px 3px 15px; background-color: #1a1a1a; color: #888; font-style: italic; font-size: 11px;" });
    } else {
      rows.push([func.name, func.desc, func.example]);
    }
  };

  if (category === "all" || !category) {
    for (const [cat, funcs] of Object.entries(functions)) {
      rows.push({ type: "section", content: cat.toUpperCase(), colspan: 3, style: "padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;" });
      funcs.forEach(renderFunc);
    }
  } else if (functions[category]) {
    rows.push({ type: "section", content: category.toUpperCase(), colspan: 3, style: "padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;" });
    functions[category].forEach(renderFunc);
  } else {
    rows.push({ type: "section", content: `Unknown category: ${category}`, colspan: 3, style: "padding: 5px; color: #ff0000;" });
    rows.push({ type: "section", content: `Available: ${Object.keys(functions).join(", ")}`, colspan: 3, style: "padding: 5px; color: #cccccc;" });
  }

  const options = {
    caption: "<strong>SCREEPS HELPER FUNCTIONS</strong>",
    tableStyle: "border-collapse: collapse;",
    headerStyle: "padding: 5px; background-color: #333;",
    rowStyle: () => "background-color: #1a1a1a;",
    cellStyle: (_rowIdx, colIdx) => {
      const colors = ["color: #00ff00;", "color: #cccccc;", "color: #888; font-family: monospace;"];
      return `padding: 5px; ${colors[colIdx] || ""}`;
    },
  };

  const resultString = Log.table(headers, rows, options) + `<p style="color: #888; font-size: 12px;">Usage: help() or help("category") | Categories: ${Object.keys(functions).join(", ")}</p>`;
  return resultString;
}


/**
 * Show what's in all terminals
 * @returns {string} HTML table string
 */
function showTerminals() {
  const roomData = {};
  const sums = {};
  const rooms = _.filter(Game.rooms, (r) => r.controller && r.controller.my && r.terminal);

  if (rooms.length === 0) {
    const resultString = Log.table(
      ["ROOM"],
      [{ type: "section", content: "No terminals found in owned rooms", colspan: 1, style: "padding: 5px; color: #888;" }],
      { caption: "<strong>TERMINAL CONTENTS</strong>", tableStyle: "border-collapse: collapse; width: 100%;", headerStyle: "padding: 5px; background-color: #333;" }
    );
    return resultString;
  }

  const resourceTypes = new Set();
  _.forEach(rooms, (r) => {
    roomData[r.name] = roomData[r.name] || {};
    _.forEach(r.terminal.store, (quantity, item) => {
      resourceTypes.add(item);
      sums[item] = sums[item] || 0;
      sums[item] += quantity;
      roomData[r.name][item] = quantity;
    });
  });

  if (resourceTypes.size === 0) {
    const resultString = Log.table(
      ["ROOM"],
      [{ type: "section", content: "All terminals are empty", colspan: 1, style: "padding: 5px; color: #888;" }],
      { caption: "<strong>TERMINAL CONTENTS</strong>", tableStyle: "border-collapse: collapse; width: 100%;", headerStyle: "padding: 5px; background-color: #333;" }
    );
    return resultString;
  }

  const sortedResources = Array.from(resourceTypes).sort();
  const headers = ["ROOM", ...sortedResources.map((res) => utilsResources.resourceImg(res))];
  const rows = rooms.map((room) => [
    room.name,
    ...sortedResources.map((res) => (roomData[room.name][res] || 0).toLocaleString()),
  ]);
  const footer = ["TOTAL", ...sortedResources.map((res) => (sums[res] || 0).toLocaleString())];

  const options = {
    caption: "<strong>TERMINAL CONTENTS</strong>",
    tableStyle: "border-collapse: collapse; width: 100%;",
    headerStyle: "padding: 5px; background-color: #333;",
    rowStyle: () => "background-color: #1a1a1a;",
    cellStyle: (_rowIdx, colIdx, value) => {
      if (colIdx === 0) return "padding: 5px; color: #00ffff; font-weight: bold;";
      return `padding: 5px; text-align: right; color: ${parseInt(value, 10) > 0 ? "#cccccc" : "#888"};`;
    },
    footer,
    footerRowStyle: "background-color: #333;",
    footerCellStyle: (colIdx) => (colIdx === 0 ? "padding: 5px; font-weight: bold; color: #00ff00;" : "padding: 5px; text-align: right; font-weight: bold; color: #00ff00;"),
  };

  const resultString = Log.table(headers, rows, options);
  return resultString;
}

/**
 * Get number of terminals
 * @returns {number} Number of terminals
 */
function numberOfTerminals() {
  let count = 0;
  for (const roomName in Game.rooms) {
    if (Game.rooms[roomName].terminal) {
      count += 1;
    }
  }
  return count;
}

/**
 * Show lab status and reactions
 * @returns {string} HTML table string
 */
function showLabs() {
  const roomsWithLabs = [];
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (!room.controller || !room.controller.my) continue;
    const labs = room.find(FIND_STRUCTURES, {
      filter: (s) => "structureType" in s && s.structureType === STRUCTURE_LAB,
    });
    if (labs.length > 0) roomsWithLabs.push({ room, roomName, labs });
  }

  const headers = ["ROOM", "STATUS", "RESULT", "CENTER LAB", "REAGENT A", "REAGENT B", "PARTNER LABS"];
  const rows = [];

  if (roomsWithLabs.length === 0) {
    rows.push({ type: "section", content: "No labs found in owned rooms", colspan: 7, style: "padding: 5px; color: #888;" });
  } else {
    let hasLabs = false;
    for (const { room, roomName, labs } of roomsWithLabs) {
      let roomHeaderAdded = false;
      for (const labIdx in labs) {
        const labC = labs[labIdx];
        const labMemory = labC && labC.memory;
        if (!labC || !labMemory || !labMemory.partnerA) continue;

        hasLabs = true;
        const partnerA = Game.getObjectById(labMemory.partnerA);
        const partnerB = Game.getObjectById(labMemory.partnerB);
        const partnerAMemory = partnerA && partnerA.memory ? partnerA.memory : null;
        if (!partnerA || !partnerAMemory) continue;

        if (!roomHeaderAdded) {
          rows.push({ type: "section", content: `ROOM: ${roomName}`, colspan: 7, style: "padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;" });
          roomHeaderAdded = true;
        }

        const status = partnerAMemory.status || "UNKNOWN";
        const partnerBMemory = partnerB && partnerB.memory ? partnerB.memory : null;
        const reagentB = partnerB && partnerBMemory ? utilsResources.resourceImg(partnerBMemory.resource) : "-";
        const partnerNames = [partnerA.toString()];
        if (partnerB) partnerNames.push(partnerB.toString());

        rows.push([
          "",
          status,
          utilsResources.resourceImg(labMemory.resource),
          labC.toString(),
          utilsResources.resourceImg(partnerAMemory.resource),
          reagentB,
          partnerNames.join(", "),
        ]);
      }
    }
    if (!hasLabs) {
      rows.push({ type: "section", content: "No active lab reactions found", colspan: 7, style: "padding: 5px; color: #888;" });
    }
  }

  const options = {
    caption: "<strong>LAB STATUS AND REACTIONS</strong>",
    tableStyle: "border-collapse: collapse; width: 100%;",
    headerStyle: "padding: 5px; background-color: #333;",
    rowStyle: () => "background-color: #1a1a1a;",
    cellStyle: (_rowIdx, colIdx, value) => {
      if (colIdx === 0) return "padding: 5px; color: #888;";
      if (colIdx === 1) {
        const statusColor = value === "OK" ? "#00ff00" : value === "ERROR" ? "#ff0000" : "#ffaa00";
        return `padding: 5px; color: ${statusColor}; font-weight: bold;`;
      }
      if (colIdx === 2 || colIdx === 4 || colIdx === 5) return "padding: 5px; text-align: center;";
      if (colIdx === 3) return "padding: 5px; color: #00ffff;";
      if (colIdx === 6) return "padding: 5px; color: #cccccc;";
      return "padding: 5px;";
    },
  };

  const resultString = Log.table(headers, rows, options);
  return resultString;
}

/**
 * Show resources across all rooms
 * @param {boolean} [hide=false] - If true, only show resources with amount > 0
 * @returns {string} HTML table string
 */
function showResources(hide = false) {
  const formatNumber = (num) => {
    const numStr = Math.floor(num).toString();
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  let numberOfRooms = 0;
  for (const roomName in Game.rooms) {
    if (Game.rooms[roomName].storage) numberOfRooms += 1;
  }

  const headers = ["RESOURCE", "AMOUNT", "OFFSET TO PERFECT"];
  const rows = [];
  const offsets = [];

  for (const resource of RESOURCES_ALL) {
    const amount = utilsResources.globalResourcesAmount(resource);
    const threshold = numberOfRooms * global.getRoomThreshold(resource, "all");
    const offset = amount - threshold;

    if (hide && amount === 0) continue;

    const offsetSymbol = offset > 0 ? "+" : "";
    rows.push([utilsResources.resourceImg(resource), formatNumber(amount), `${offsetSymbol}${formatNumber(offset)}`]);
    offsets.push(offset);
  }

  const options = {
    caption: "RESOURCES",
    captionStyle: "padding: 5px; font-weight: bold; font-size: 1.1em;",
    tableStyle: "border-collapse: collapse; border-color: #fff; font-family: monospace;",
    headerStyle: "padding: 8px; background-color: #333;",
    rowStyle: (rowIdx) => `background-color: ${rowIdx % 2 === 0 ? "#1a1a1a" : "#222"};`,
    cellStyle: (rowIdx, colIdx) => {
      const style = "padding: 5px;";
      if (colIdx === 1) return `${style} text-align: right; color: #fff;`;
      if (colIdx === 2) {
        const offset = offsets[rowIdx] != null ? offsets[rowIdx] : 0;
        const color = offset > 0 ? "#4CAF50" : offset < 0 ? "#F44336" : "#FFC107";
        return `${style} text-align: right; color: ${color}; border-color: #fff; font-weight: bold;`;
      }
      return style;
    },
  };

  if (rows.length === 0) {
    return Log.table(headers, [{ type: "section", content: "No resources found", colspan: 3, style: "padding: 10px; text-align: center; color: #888;" }], options);
  }

  return Log.table(headers, rows, options);
}

/**
 * Show market information
 * @returns {string} HTML table string
 */
function showMarket() {
  const headers = ["", "MIN SELL PRICE", "AMOUNT ON SELL", "MAX SELL PRICE", "AMOUNT SELL ORDERS", "", "MIN BUY PRICE", "AMOUNT ON BUY", "MAX BUY PRICE", "AMOUNT BUY ORDERS"];
  const rows = [];
  const orders = Game.market.getAllOrders();

  for (const resources of RESOURCES_ALL) {
    const orderMinerals = orders.filter((order) => order.resourceType === resources);
    const ordersSell = orderMinerals.filter((order) => order.type === "sell");
    const ordersBuy = orderMinerals.filter((order) => order.type === "buy");

    ordersSell.sort((a, b) => a.price - b.price);
    ordersBuy.sort((a, b) => a.price - b.price);

    let priceSell = " - ";
    let lastPriceSell = " - ";
    if (ordersSell[0] && ordersSell[0].price) {
      priceSell = ordersSell[0].price;
      lastPriceSell = ordersSell[ordersSell.length - 1].price;
    }

    let priceBuy = " - ";
    let lastPriceBuy = " - ";
    if (ordersBuy[0] && ordersBuy[0].price) {
      priceBuy = ordersBuy[0].price;
      lastPriceBuy = ordersBuy[ordersBuy.length - 1].price;
    }

    let amountSell = " - ";
    if (ordersSell[0] && ordersSell[0].amount) {
      amountSell = ordersSell[0].amount;
      if (amountSell > 1000) amountSell = `${amountSell / 1000}K`;
    }

    let amountBuy = " - ";
    if (ordersBuy[0] && ordersBuy[0].amount) {
      amountBuy = ordersBuy[ordersBuy.length - 1].amount;
      if (amountBuy > 1000) amountBuy = `${amountBuy / 1000}K`;
    }

    rows.push([
      utilsResources.resourceImg(resources),
      priceSell,
      amountSell,
      lastPriceSell,
      ordersSell.length,
      utilsResources.resourceImg(resources),
      priceBuy,
      amountBuy,
      lastPriceBuy,
      ordersBuy.length,
    ]);
  }

  return Log.table(headers, rows, { caption: " MARKET\n", tableStyle: "border-collapse: collapse;" });
}

/**
 * Pretty-print JSON
 * @param {*} x - Object to stringify
 * @returns {string} Formatted JSON string
 */
function json(x) {
  return JSON.stringify(x, null, 2);
}

/**
 * Recursively profiles memory objects to calculate sizes
 * @param {Object} memoryObject - Memory object to profile
 * @param {Object} sizes - Object to store sizes
 * @param {number} currentDepth - Current recursion depth
 * @returns {void}
 */
function recursiveMemoryProfile(memoryObject, sizes, currentDepth) {
  for (const key in memoryObject) {
    if (currentDepth == 0 || !_.keys(memoryObject[key]) || _.keys(memoryObject[key]).length == 0) {
      sizes[key] = JSON.stringify(memoryObject[key]).length;
    } else {
      sizes[key] = {};
      recursiveMemoryProfile(memoryObject[key], sizes[key], currentDepth - 1);
    }
  }
}

/**
 * Profiles memory usage by calculating JSON string sizes
 * @param {Object} root - Root memory object to profile (default: Memory)
 * @param {number} depth - Recursion depth (default: 1)
 * @returns {string} JSON string with memory sizes
 */
function profileMemory(root = Memory, depth = 1) {
  const sizes = {};
  const start = Game.cpu.getUsed();
  recursiveMemoryProfile(root, sizes, depth);
  const elapsed = Game.cpu.getUsed() - start;
  return `Profiling memory...\nTime elapsed: ${elapsed}\n${JSON.stringify(sizes, undefined, "\t")}`;
}

/**
 * Cleans up memory by removing specified properties
 * @param {string} memoryType - "rooms" or "creeps" - where to clean
 * @param {string} propertyName - Name of the property to remove (e.g. "dunePlanet", "duneFaction", "spawnRenamed")
 * @returns {string} Summary of cleaned entries
 */
function cleanMemory(memoryType, propertyName) {
  if (!memoryType || !propertyName) {
    return "Usage: cleanMemory('rooms'|'creeps', 'propertyName')";
  }

  if (memoryType !== "rooms" && memoryType !== "creeps") {
    return `Invalid memory type: "${memoryType}". Use "rooms" or "creeps"`;
  }

  const memoryObject = Memory[memoryType];
  if (!memoryObject) {
    return `No ${memoryType} in memory`;
  }

  let cleaned = 0;
  for (const key in memoryObject) {
    if (memoryObject[key][propertyName] !== undefined) {
      delete memoryObject[key][propertyName];
      cleaned++;
    }
  }

  const message = cleaned > 0
    ? `Cleaned memory: Removed "${propertyName}" from ${cleaned} ${memoryType.slice(0, -1)}(s)`
    : `No "${propertyName}" entries found in ${memoryType}`;
  
  return message;
}

/**
 * Visualize all transport orders (givesResources and needsResources) for a room
 * @param {string|null} roomName - Room name to visualize, or null for all rooms
 * @returns {string} HTML table string
 */
function showLogistic(roomName = null) {
  const roomsToProcess = [];
  if (roomName) {
    const room = Game.rooms[roomName];
    if (room && room.controller && room.controller.my) {
      roomsToProcess.push(room);
    } else {
      const resultString = Log.table([], [{ type: "section", content: `Room "${roomName}" not found or not owned`, colspan: 10, style: "color: #ff0000;" }], {
        caption: "<strong>TRANSPORT ORDERS (LOGISTICS)</strong>",
        tableStyle: "border-collapse: collapse; width: 100%;",
      });
      return resultString;
    }
  } else {
    for (const name in Game.rooms) {
      const room = Game.rooms[name];
      if (room && room.controller && room.controller.my) roomsToProcess.push(room);
    }
  }

  if (roomsToProcess.length === 0) {
    const resultString = Log.table([], [{ type: "section", content: "No owned rooms found", colspan: 10, style: "color: #ff0000;" }], {
      caption: "<strong>TRANSPORT ORDERS (LOGISTICS)</strong>",
      tableStyle: "border-collapse: collapse; width: 100%;",
    });
    return resultString;
  }

  const logisticsHeaders = ["RESOURCE", "FROM (SOURCE)", "AMOUNT", "PRIORITY", "TO (TARGET)", "AMOUNT", "PRIORITY", "SOURCE OBJ", "TARGET OBJ", "STATUS"];
  const rows = [];
  const tempControllerGame = new ControllerGame();

  for (const room of roomsToProcess) {
    const rc = tempControllerGame._rooms[room.name];
    if (!rc) continue;

    rows.push({ type: "section", content: `ROOM: ${room.name}`, colspan: 10, style: "padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;" });
    rows.push({ type: "header", cells: logisticsHeaders, headerStyle: "padding: 5px; background-color: #333;" });

    const givesResources = rc.givesResources();
    const needsResources = rc.needsResources();
    const transportOrders = [];
    for (const give of givesResources) {
      for (const need of needsResources) {
        if (give.resourceType !== need.resourceType || need.priority >= give.priority || need.id === give.id) continue;
        const targetObj = Game.getObjectById(need.id);
        if (!targetObj) continue;
        if (targetObj.store) {
          const freeCap = targetObj.store.getFreeCapacity(need.resourceType) || 0;
          if (freeCap <= 0) continue;
        }
        const sourceObj = Game.getObjectById(give.id);
        if (!sourceObj) continue;
        transportOrders.push({ give, need });
      }
    }
    transportOrders.sort((a, b) => (a.need.priority || 0) - (b.need.priority || 0));

    if (transportOrders.length > 0) {
      for (const order of transportOrders) {
        const { give, need } = order;
        const sourceObj = Game.getObjectById(give.id);
        const targetObj = Game.getObjectById(need.id);
        const sourceName = sourceObj ? sourceObj.toString() : "NOT FOUND";
        const targetName = targetObj ? targetObj.toString() : "NOT FOUND";

        let status = "OK";
        if (!sourceObj || !targetObj) {
          status = "INVALID";
        } else {
          let sourceAvailable = 0;
          if (sourceObj.store) sourceAvailable = sourceObj.store[give.resourceType] || 0;
          else if (sourceObj.amount !== undefined && sourceObj.resourceType === give.resourceType) sourceAvailable = sourceObj.amount || 0;
          else if (sourceObj.store && sourceObj.store.getUsedCapacity) sourceAvailable = sourceObj.store[give.resourceType] || 0;

          let targetFreeStr = "0";
          if (targetObj.store) targetFreeStr = String(targetObj.store.getFreeCapacity(need.resourceType) || 0);
          else if (!targetObj.store || !targetObj.store.getFreeCapacity) targetFreeStr = "∞";

          status = `${sourceAvailable} available → ${targetFreeStr} free`;
        }

        rows.push([
          utilsResources.resourceImg(give.resourceType),
          sourceName,
          give.amount || 0,
          give.priority || 0,
          targetName,
          need.amount || 0,
          need.priority || 0,
          give.id,
          need.id,
          status,
        ]);
      }
    } else {
      rows.push({ type: "section", content: "No transport orders available (no matching pairs with need.priority < give.priority)", colspan: 10, style: "padding: 5px; color: #888;" });
    }
    rows.push({ type: "section", content: `Summary: ${transportOrders.length} transport order(s) from ${givesResources.length} gives and ${needsResources.length} needs`, colspan: 10, style: "padding: 5px; background-color: #333; color: #cccccc;" });
  }

  const options = {
    caption: "<strong>TRANSPORT ORDERS (LOGISTICS)</strong>",
    tableStyle: "border-collapse: collapse; width: 100%;",
    rowStyle: () => "background-color: #1a1a1a;",
    cellStyle: (_rowIdx, colIdx) => {
      if (colIdx === 1) return "padding: 5px; color: #00ff00;";
      if (colIdx === 4) return "padding: 5px; color: #ff8800;";
      if (colIdx === 2 || colIdx === 3 || colIdx === 5 || colIdx === 6) return "padding: 5px; text-align: right;";
      if (colIdx === 7 || colIdx === 8) return "padding: 5px; font-family: monospace; font-size: 10px;";
      return "padding: 5px;";
    },
  };

  const resultString = Log.table([], rows, options);
  return resultString;
}

/**
 * Shows CPU analysis
 * @returns {void}
 */
function showCPU() {
  if (!Memory.cpuHistory || Memory.cpuHistory.length < 2) {
    return "No CPU data - Insufficient CPU history data (need at least 2 samples)";
  }

  const stats = cpuAnalyzer.getStatistics(100);
  const decision = cpuAnalyzer.canConquerNewRoom();

  return `CPU: Avg ${stats.average.cpuUsed.toFixed(2)}/${stats.average.cpuLimit.toFixed(0)} (${((stats.average.cpuUsed / stats.average.cpuLimit) * 100).toFixed(1)}%) | CPU/Room ${stats.average.cpuPerRoom.toFixed(2)} | Can Conquer ${decision.canConquer ? "YES" : "NO"}${!decision.canConquer ? ` (${decision.reason})` : ""}`;
}

/**
 * Internal helper function to draw a single room on the scout visualization
 * @param {string} roomName - Room name to visualize
 * @param {Object} roomMemory - Room memory data
 * @param {string} centerRoom - Center room name for distance calculation
 * @returns {boolean} True if room was visualized, false otherwise
 */

function _drawScoutRoom(roomName, roomMemory, centerRoom) {
  // Skip if never checked
  if (!roomMemory.lastCheck) return false;

  // Calculate distance from center
  const distance = Game.map.getRoomLinearDistance(centerRoom, roomName);
  if (distance > CONSTANTS.TRANSPORT.SCOUT_MAX_DISTANCE) return false;

  // Get room status
  const roomStatus = Game.map.getRoomStatus(roomName);
  if (roomStatus.status !== "normal") return false;
  
  // Get data from structures.controller (single controller per room)
  let controllerMemory = null;
  if (roomMemory.structures) {
    controllerMemory = roomMemory.structures.controller || null;
    if (!controllerMemory && roomMemory.structures.controllers) {
      const controllerIds = Object.keys(roomMemory.structures.controllers);
      if (controllerIds.length > 0) {
        controllerMemory = roomMemory.structures.controllers[controllerIds[0]];
      }
    }
  }
  
  // Get sources array from new structure or flat structure (set by analyzeRoom)
  let sourcesArray = null;
  if (roomMemory.sources && Array.isArray(roomMemory.sources)) {
    sourcesArray = roomMemory.sources;
  } else if (roomMemory.structures && roomMemory.structures.sources) {
    sourcesArray = Object.keys(roomMemory.structures.sources).map(sourceId => {
      const sourceMem = roomMemory.structures.sources[sourceId];
      return {
        id: sourceId,
        containerID: sourceMem.containerID || null,
        linkID: sourceMem.linkID || null,
      };
    });
  }
  
  // Get mineral memory from new structure or flat structure (set by analyzeRoom)
  let mineralMemory = null;
  if (roomMemory.mineral) {
    mineralMemory = roomMemory.mineral;
  } else if (roomMemory.structures && roomMemory.structures.minerals) {
    const mineralIds = Object.keys(roomMemory.structures.minerals);
    if (mineralIds.length > 0) {
      mineralMemory = roomMemory.structures.minerals[mineralIds[0]];
    }
  }

  // Determine color and symbol based on room status
  let color = "#888888"; // Gray = unknown/old data
  let symbol = "?";
  let size = 0.3;

  // Check how recent the data is
  const ticksSinceCheck = Game.time - roomMemory.lastCheck;
  const isOld = ticksSinceCheck > CONSTANTS.TRANSPORT.SCOUT_OLD_THRESHOLD;

  if (isOld) {
    color = "#444444"; // Very old data
    symbol = "·";
    size = 0.2;
  } else {
    // Recent data - show detailed info
    if (roomMemory.isHostile || roomMemory.avoid) {
      color = "#ff0000"; // Red = hostile
      symbol = "⚠";
      size = 0.4;
    } else if (controllerMemory && controllerMemory.my) {
      color = "#00ff00"; // Green = owned
      symbol = "✓";
      size = 0.4;
    } else if (controllerMemory && !controllerMemory.owner && !controllerMemory.reservation) {
      color = "#00ffff"; // Cyan = free to claim
      symbol = "○";
      size = 0.5;
    } else if (roomMemory.roomType === "ROOMTYPE_CORE") {
      color = "#ffff00"; // Yellow = core room (3 sources)
      symbol = "★";
      size = 0.4;
    } else if (sourcesArray && sourcesArray.length === 2) {
      color = "#ffaa00"; // Orange = 2 sources
      symbol = "●";
      size = 0.35;
    } else {
      color = "#8888ff"; // Blue = explored
      symbol = "·";
      size = 0.3;
    }
  }

  // Draw main symbol on world map (center of room)
  const centerPos = new RoomPosition(25, 25, roomName);
  Game.map.visual.text(symbol, centerPos, {
    size: size,
    color: color,
    align: "center",
    opacity: 0.8,
  });

  // Draw info: Score and Mineral in top-left, Sources in top-right
  let xOffsetLeft = 0.5;
  let hasInfo = false;

  // Score (colored based on value) - top-left corner
  if (roomMemory.score && roomMemory.score.total && roomMemory.score.total > CONSTANTS.TRANSPORT.SCOUT_SCORE_THRESHOLD) {
    const scoreText = roomMemory.score.total.toString();
    const scoreValue = roomMemory.score.total;
    
    // Determine color based on score
    let scoreColor = "#ff0000"; // Red for < 1500
    if (scoreValue >= 1600) {
      scoreColor = "#00ff00"; // Green for >= 1600
    } else if (scoreValue >= 1500) {
      scoreColor = "#ffaa00"; // Orange for 1500-1599
    }
    
    const scorePos = new RoomPosition(xOffsetLeft, 6, roomName);
    Game.map.visual.text(scoreText, scorePos, {
      size: 0.20,  // 30% of the original size (0.2 * 0.3 = 0.06)
      color: scoreColor,
      align: "left",
      opacity: 0.8,
    });
    xOffsetLeft += scoreText.length * 0.05 + 0.2; // Space after score (adjusted for smaller text)
    hasInfo = true;
  }

  // Mineral (colored based on owned rooms with this mineral) - top-left corner after score
  if (mineralMemory && mineralMemory.type) {
    const mineralShort = mineralMemory.type.replace("RESOURCE_", "").substring(0, 2);
    const mineralType = mineralMemory.type;
    
    // Count how many owned rooms already have this mineral
    let ownedRoomsWithMineral = 0;
    
    // Check Memory.rooms for owned rooms with this mineral
    if (Memory.rooms) {
      for (const otherRoomName in Memory.rooms) {
        // Skip current room
        if (otherRoomName === roomName) continue;
        
        const otherRoomMemory = Memory.rooms[otherRoomName];
        // Only count rooms we own - structures.controller
        let otherControllerMemory = null;
        if (otherRoomMemory.structures) {
          otherControllerMemory = otherRoomMemory.structures.controller || null;
          if (!otherControllerMemory && otherRoomMemory.structures.controllers) {
            const controllerIds = Object.keys(otherRoomMemory.structures.controllers);
            if (controllerIds.length > 0) {
              otherControllerMemory = otherRoomMemory.structures.controllers[controllerIds[0]];
            }
          }
        }
        if (otherControllerMemory && otherControllerMemory.my) {
          // Get mineral from new structure or flat structure (set by analyzeRoom)
          let otherMineralMemory = null;
          if (otherRoomMemory.mineral) {
            otherMineralMemory = otherRoomMemory.mineral;
          } else if (otherRoomMemory.structures && otherRoomMemory.structures.minerals) {
            const mineralIds = Object.keys(otherRoomMemory.structures.minerals);
            if (mineralIds.length > 0) {
              otherMineralMemory = otherRoomMemory.structures.minerals[mineralIds[0]];
            }
          }
          if (otherMineralMemory && otherMineralMemory.type === mineralType) {
            ownedRoomsWithMineral++;
          }
        }
      }
    }
    
    // Check Game.rooms for owned rooms with this mineral
    for (const otherRoomName in Game.rooms) {
      // Skip current room
      if (otherRoomName === roomName) continue;
      
      const gameRoom = Game.rooms[otherRoomName];
      if (gameRoom.controller && gameRoom.controller.my) {
        if (gameRoom.mineral && gameRoom.mineral.mineralType === mineralType) {
          ownedRoomsWithMineral++;
        }
      }
    }
    
    // Determine color based on count
    let mineralColor = "#00ff00"; // Green: no room with this mineral owned
    if (ownedRoomsWithMineral === 1) {
      mineralColor = "#ffff00"; // Yellow: one room with this mineral owned
    } else if (ownedRoomsWithMineral > 1) {
      mineralColor = "#ff0000"; // Red: more than one room with this mineral owned
    }
    
    const mineralPos = new RoomPosition(xOffsetLeft, 15, roomName);
    Game.map.visual.text(mineralShort, mineralPos, {
      size: 0.20,  // 30% of the original size (0.2 * 0.3 = 0.06), matching score size
      color: mineralColor,
      align: "left",
      opacity: 0.8,
    });
    xOffsetLeft += mineralShort.length * 0.05 + 0.2; // Space after mineral (adjusted for smaller text)
    hasInfo = true;
  }

  // Source count as yellow dots (0-4 dots) - top-right corner
  const sourceCount = sourcesArray ? sourcesArray.length : 0;
  const sourceDots = "•".repeat(Math.min(sourceCount, CONSTANTS.TRANSPORT.SCOUT_MAX_SOURCE_DOTS));
  if (sourceDots) {
    const dotsPos = new RoomPosition(49, 5, roomName);
    Game.map.visual.text(sourceDots, dotsPos, {
      size: 1.5,  // Double size (0.25 * 2 = 0.5)
      color: "#ffff00",
      align: "right",
      opacity: 0.9,
    });
    hasInfo = true;
  }

  // Draw background for better readability if we have info
  if (hasInfo) {
    // Background for left side (score + mineral)
    const bgWidthLeft = xOffsetLeft + 0.3;
    const bgPosLeft = new RoomPosition(0.3, 0.3, roomName);
    Game.map.visual.rect(bgPosLeft, bgWidthLeft, 0.5, {
      fill: "#000000",
      opacity: 0.6,
      stroke: "#000000",
      strokeWidth: 0.1,
    });
    // Background for right side (sources) if present
    if (sourceDots) {
      const bgWidthRight = sourceDots.length * 0.3 + 0.5;  // Adjusted for larger text (0.15 * 2 = 0.3)
      const bgPosRight = new RoomPosition(49 - bgWidthRight + 0.3, 0.3, roomName);
      Game.map.visual.rect(bgPosRight, bgWidthRight, 0.7, {  // Height slightly increased for larger text
        fill: "#000000",
        opacity: 0.6,
        stroke: "#000000",
        strokeWidth: 0.1,
      });
    }
  }

  return true;
}

/**
 * Visualizes Scout data on the World Map
 * Shows: Explored rooms, hostile rooms, free rooms, scores, etc.
 * Visualization persists for SCOUT_VISUALIZATION_DURATION ticks (default: 100)
 * Usage: showScout() or showScout('W1N1') or showScout('W1N1', false) to disable
 * @param {string|null} centerRoom - Room name to use as center (default: first owned room)
 * @param {boolean|number|null} duration - Duration in ticks (default: CONSTANTS.TICKS.SCOUT_VISUALIZATION_DURATION) or false to disable
 * @returns {void}
 */
function showScout(centerRoom = null, duration = null) {
  // Handle disable request
  if (duration === false) {
    if (Memory.scoutVisualization) {
      delete Memory.scoutVisualization;
      Game.map.visual.clear();
      return "✅ Scout visualization disabled";
    }
    return;
  }

  // Set duration (default from constants)
  const visualizationDuration = duration !== null && typeof duration === "number" 
    ? duration 
    : CONSTANTS.TICKS.SCOUT_VISUALIZATION_DURATION;

  // Clear previous visualization
  Game.map.visual.clear();

  // Find center room (first owned room or specified)
  if (!centerRoom) {
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      if (room.controller && room.controller.my) {
        centerRoom = roomName;
        break;
      }
    }
  }

  if (!centerRoom) {
    return "No owned room found for center. Usage: showScout('W1N1')";
  }

  // Iterate through all rooms in memory
  if (!Memory.rooms) {
    return "No room memory found. Scout needs to explore rooms first.";
  }

  let roomsVisualized = 0;
  for (const roomName in Memory.rooms) {
    if (_drawScoutRoom(roomName, Memory.rooms[roomName], centerRoom)) {
      roomsVisualized++;
    }
  }

  // Store visualization state in memory for persistence
  Memory.scoutVisualization = {
    centerRoom: centerRoom,
    visualizeUntil: Game.time + visualizationDuration,
    enabled: true,
  };

  return `✅ Scout data visualized: ${roomsVisualized} rooms shown on world map (center: ${centerRoom})\n   Visualization will persist for ${visualizationDuration} ticks (until tick ${Game.time + visualizationDuration})\n   Use showScout(false) to disable early\nLegend: ✓=Owned, ○=Free, ★=Core(3s), ●=2s, ⚠=Hostile, ·=Explored, ?=Old data`;
}

/**
 * Internal function to redraw scout visualization (called automatically each tick if enabled)
 * This is called from main.js or controller.game.js to maintain visualization
 */
function _redrawScoutVisualization() {
  if (!Memory.scoutVisualization || !Memory.scoutVisualization.enabled) {
    return;
  }

  const {centerRoom, visualizeUntil} = Memory.scoutVisualization;

  // Check if visualization should still be active
  if (Game.time > visualizeUntil) {
    // Auto-disable after duration
    delete Memory.scoutVisualization;
    Game.map.visual.clear();
    return;
  }

  // Redraw visualization (reuse the main function logic)
  // We need to extract the drawing logic to avoid infinite recursion
  _drawScoutVisualization(centerRoom);
}

/**
 * Internal function to draw scout visualization
 * @param {string} centerRoom - Room name to use as center
 * @returns {void}
 */
function _drawScoutVisualization(centerRoom) {
  // Clear and redraw
  Game.map.visual.clear();

  if (!Memory.rooms) return;

  for (const roomName in Memory.rooms) {
    _drawScoutRoom(roomName, Memory.rooms[roomName], centerRoom);
  }
}

/**
 * Shows RCL upgrade times for all owned rooms
 * Displays a table with rooms on Y-axis and RCL levels on X-axis
 * @returns {string} HTML table string
 */
function showRclUpgradeTimes() {
  const formatTime = (ticks) => (ticks === undefined || ticks === null ? "-" : ticks.toLocaleString());

  const getTimeColor = (ticks, level) => {
    if (ticks === undefined || ticks === null) return "#888";
    const goodTimes = { 1: 1000, 2: 2000, 3: 5000, 4: 10000, 5: 20000, 6: 40000, 7: 80000, 8: 150000 };
    const goodTime = goodTimes[level] || 100000;
    if (ticks <= goodTime) return "#00ff00";
    if (ticks <= goodTime * 1.5) return "#ffaa00";
    return "#ff0000";
  };

  const ownedRooms = [];
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (room.controller && room.controller.my) ownedRooms.push({ roomName, room });
  }
  ownedRooms.sort((a, b) => (b.room.controller ? b.room.controller.level : 0) - (a.room.controller ? a.room.controller.level : 0));

  if (ownedRooms.length === 0) {
    const resultString = Log.table([], [{ type: "section", content: "No owned rooms found", colspan: 9, style: "padding: 5px; color: #888;" }], {
      caption: "<strong>RCL UPGRADE TIMES</strong>",
      tableStyle: "border-collapse: collapse; width: 100%;",
    }) + '<p style="color: #888; font-size: 12px;">Legend: Green = Good time, Orange = Acceptable, Red = Slow | Values shown in ticks</p>';
    return resultString;
  }

  const allLevels = new Set();
  ownedRooms.forEach(({ roomName }) => {
    const roomMemory = Memory.rooms && Memory.rooms[roomName];
    if (roomMemory && roomMemory.rclUpgradeTimes) {
      Object.keys(roomMemory.rclUpgradeTimes).forEach((level) => {
        if (level !== "lastLevel" && level !== "lastLevelTick") allLevels.add(parseInt(level));
      });
    }
  });
  const sortedLevels = Array.from(allLevels).sort((a, b) => a - b);

  if (sortedLevels.length === 0) {
    const resultString = Log.table([], [{ type: "section", content: "No RCL upgrade time data available", colspan: 2, style: "padding: 5px; color: #888;" }], {
      caption: "<strong>RCL UPGRADE TIMES</strong>",
      tableStyle: "border-collapse: collapse; width: 100%;",
    }) + '<p style="color: #888; font-size: 12px;">Legend: Green = Good time, Orange = Acceptable, Red = Slow | Values shown in ticks</p>';
    return resultString;
  }

  const headers = ["ROOM", "CURRENT RCL", ...sortedLevels.map((l) => `RCL ${l}`)];
  const rawValues = [];
  const rows = ownedRooms.map(({ roomName, room }) => {
    const roomMemory = Memory.rooms && Memory.rooms[roomName];
    const currentRcl = room.controller ? room.controller.level : 0;
    const upgradeTimes = (roomMemory && roomMemory.rclUpgradeTimes) || {};
    const rawRow = [null, null];
    const cells = [roomName, currentRcl];
    sortedLevels.forEach((level) => {
      const upgradeTime = upgradeTimes[level.toString()];
      rawRow.push(upgradeTime);
      cells.push(formatTime(upgradeTime));
    });
    rawValues.push(rawRow);
    return cells;
  });

  const footerTimes = sortedLevels.map((level) => {
    const times = ownedRooms
      .map(({ roomName }) => (Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName].rclUpgradeTimes) || {})
      .map((ut) => ut[level.toString()])
      .filter((t) => t !== undefined && t !== null);
    return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  });
  const footer = ["AVERAGE", "", ...footerTimes.map((t) => formatTime(t))];

  const options = {
    caption: "<strong>RCL UPGRADE TIMES</strong>",
    tableStyle: "border-collapse: collapse; width: 100%;",
    headerStyle: "padding: 5px; background-color: #333;",
    rowStyle: () => "background-color: #1a1a1a;",
    cellStyle: (rowIdx, colIdx, value) => {
      const style = "padding: 5px;";
      if (colIdx === 0) return `${style} color: #00ffff; font-weight: bold;`;
      if (colIdx === 1) return `${style} text-align: center; color: #ffff00; font-weight: bold;`;
      if (colIdx >= 2) {
        const raw = rowIdx < rawValues.length ? rawValues[rowIdx][colIdx] : (footerTimes[colIdx - 2] != null ? footerTimes[colIdx - 2] : null);
        const level = sortedLevels[colIdx - 2];
        const color = getTimeColor(raw, level);
        return `${style} text-align: center; color: ${color};${rowIdx >= rows.length ? " font-weight: bold;" : ""}`;
      }
      return style;
    },
    footer,
    footerRowStyle: "background-color: #333;",
    footerCellStyle: (colIdx, value) => {
      if (colIdx === 0) return "padding: 5px; font-weight: bold; color: #00ff00;";
      if (colIdx === 1) return "padding: 5px;";
      const level = sortedLevels[colIdx - 2];
      const raw = footerTimes[colIdx - 2];
      const color = getTimeColor(raw, level);
      return `padding: 5px; text-align: center; font-weight: bold; color: ${color};`;
    },
  };

  const resultString = Log.table(headers, rows, options) + '<p style="color: #888; font-size: 12px;">Legend: Green = Good time, Orange = Acceptable, Red = Slow | Values shown in ticks</p>';
  return resultString;
}

/**
 * Create a creep manually at a specific spawn
 * Usage: cc("Spawn3", "supporter") or cc("Spawn1", "miner", { targetRoom: "W1N1" })
 * @param {string} spawnName - Name of the spawn to use (e.g., "Spawn1", "Spawn3")
 * @param {string} role - Role of the creep to spawn (e.g., "supporter", "miner", "transporter")
 * @param {Object} [extraMemory={}] - Additional memory properties to set on the creep
 * @returns {string} Result message
 */
function cc(spawnName, role, extraMemory = {}) {
  // Validate spawn
  const spawn = Game.spawns[spawnName];
  if (!spawn) {
    const availableSpawns = Object.keys(Game.spawns).join(", ");
    return `❌ Spawn "${spawnName}" not found. Available spawns: ${availableSpawns}`;
  }

  // Load creep configs
  const creepConfigs = require("./config.creeps");

  // Validate role
  const config = creepConfigs[role];
  if (!config) {
    const availableRoles = Object.keys(creepConfigs).join(", ");
    return `❌ Role "${role}" not found. Available roles: ${availableRoles}`;
  }

  // Get body (handle dynamic body functions like upgrader.getUpgraderBody)
  let body;
  if (typeof config.getUpgraderBody === "function") {
    // Special case for upgrader with dynamic body
    const rc = spawn.room.controller;
    body = config.getUpgraderBody({ getLevel: () => rc ? rc.level : 1 });
  } else {
    body = config.body;
  }

  if (!body || body.length === 0) {
    return `❌ No body defined for role "${role}"`;
  }

  // Generate name
  const namePrefix = config.namePrefix || role;
  const name = `${namePrefix}_${Game.time}`;

  // Build memory
  const memory = {
    role: role,
    home: spawn.room.name,
    behaviors: config.behaviors || [],
    ...extraMemory,
  };

  // Check if spawn is busy
  if (spawn.spawning) {
    return `⏳ Spawn "${spawnName}" is busy spawning ${spawn.spawning.name}`;
  }

  // Calculate energy cost
  const energyCost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
  const availableEnergy = spawn.room.energyAvailable;

  if (availableEnergy < energyCost) {
    return `⚡ Not enough energy. Need ${energyCost}, have ${availableEnergy}`;
  }

  // Spawn the creep
  const result = spawn.spawnCreep(body, name, { memory });

  if (result === OK) {
    return `✅ Spawning "${name}" (${role}) at ${spawnName}. Energy: ${energyCost}`;
  } else {
    const errorMessages = {
      [ERR_NOT_OWNER]: "Not owner of spawn",
      [ERR_NAME_EXISTS]: "Name already exists",
      [ERR_BUSY]: "Spawn is busy",
      [ERR_NOT_ENOUGH_ENERGY]: "Not enough energy",
      [ERR_INVALID_ARGS]: "Invalid body or name",
      [ERR_RCL_NOT_ENOUGH]: "RCL too low for this body",
    };
    return `❌ Failed to spawn: ${errorMessages[result] || `Error code ${result}`}`;
  }
}

module.exports = {
  showTerminals,
  numberOfTerminals,
  showLabs,
  showResources,
  showMarket,
  json,
  help,
  showLogistic,
  showCPU,
  showScout,
  showRclUpgradeTimes,
  cleanMemory,
  profileMemory,
  cc,
  _redrawScoutVisualization, // Internal function for automatic redraw
};

