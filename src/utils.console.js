const Log = require("./lib.log");
const utilsUsername = require("./utils.username");
const utilsResources = require("./utils.resources");
const cpuAnalyzer = require("./service.cpu");
const ControllerRoom = require("./controller.room");
const ControllerGame = require("./controller.game");
const CONSTANTS = require("./config.constants");

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
      { name: "plannerReset(room)", desc: "Resets layout for a room", example: 'plannerReset("W1N1")' },
      { name: "plannerRun(room)", desc: "Runs RoomPlanner manually", example: 'plannerRun("W1N1")' },
      { name: "plannerSetCenter(room, x, y)", desc: "Sets center coordinates for planning", example: 'plannerSetCenter("W1N1", 25, 25)' },
      { name: "showCPU()", desc: "Shows CPU usage statistics", example: "showCPU()" },
      { name: "showScout(room, duration)", desc: "Shows scout data on world map (persists for 100 ticks)", example: 'showScout("W1N1") or showScout(false) to disable' },
    ],
    market: [
      { name: "showMarket()", desc: "Table with market info (prices, amounts, orders)", example: "showMarket()" },
    ],
    utils: [
      { name: "json(x)", desc: "Pretty-print JSON", example: 'json({key: "value"})' },
    ],
  };

  const result = [];
  result.push('<table border="1" style="border-collapse: collapse;">');
  result.push("<caption><strong>SCREEPS HELPER FUNCTIONS</strong></caption>");
  result.push("<tr>");
  result.push('<th style="padding: 5px; background-color: #333;">FUNCTION</th>');
  result.push('<th style="padding: 5px; background-color: #333;">DESCRIPTION</th>');
  result.push('<th style="padding: 5px; background-color: #333;">EXAMPLE</th>');
  result.push("</tr>");

  if (category === "all" || !category) {
    // Show all categories
    for (const [cat, funcs] of Object.entries(functions)) {
      result.push(`<tr><td colspan="3" style="padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;">${cat.toUpperCase()}</td></tr>`);
      funcs.forEach(func => {
        result.push("<tr>");
        result.push(`<td style="padding: 5px; color: #00ff00;">${func.name}</td>`);
        result.push(`<td style="padding: 5px; color: #cccccc;">${func.desc}</td>`);
        result.push(`<td style="padding: 5px; color: #888; font-family: monospace;">${func.example}</td>`);
        result.push("</tr>");
      });
    }
  } else if (functions[category]) {
    // Show specific category
    result.push(`<tr><td colspan="3" style="padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;">${category.toUpperCase()}</td></tr>`);
    functions[category].forEach(func => {
      result.push("<tr>");
      result.push(`<td style="padding: 5px; color: #00ff00;">${func.name}</td>`);
      result.push(`<td style="padding: 5px; color: #cccccc;">${func.desc}</td>`);
      result.push(`<td style="padding: 5px; color: #888; font-family: monospace;">${func.example}</td>`);
      result.push("</tr>");
    });
  } else {
    result.push(`<tr><td colspan="3" style="padding: 5px; color: #ff0000;">Unknown category: ${category}</td></tr>`);
    result.push(`<tr><td colspan="3" style="padding: 5px; color: #cccccc;">Available: ${Object.keys(functions).join(", ")}</td></tr>`);
  }

  result.push("</table>");
  result.push('<p style="color: #888; font-size: 12px;">Usage: help() or help("category") | Categories: all, resources, planner, market, utils</p>');

  const resultString = result.join("");
  console.log(resultString);
  return resultString;
}


/**
 * Show what's in all terminals
 * @returns {string} HTML table string
 */
function showTerminals() {
  const result = [];
  result.push('<table border="1" style="border-collapse: collapse; width: 100%;">');
  result.push("<caption><strong>TERMINAL CONTENTS</strong></caption>");

  const roomData = {};
  const sums = {};
  const rooms = _.filter(Game.rooms, (r) => {
    return r.controller && r.controller.my && r.terminal;
  });

  if (rooms.length === 0) {
    result.push('<tr><td colspan="2" style="padding: 5px; color: #888;">No terminals found in owned rooms</td></tr>');
    result.push("</table>");
    const resultString = result.join("");
    console.log(resultString);
    return resultString;
  }

  // Collect all resource types
  const resourceTypes = new Set();
  _.forEach(rooms, (r) => {
    roomData[r.name] = roomData[r.name] || {};
    _.forEach(r.terminal.store, (quantity, item) => {
      resourceTypes.add(item);
      sums[item] = sums[item] || 0;
      sums[item] = sums[item] + quantity;
      roomData[r.name][item] = quantity;
    });
  });

  if (resourceTypes.size === 0) {
    result.push('<tr><td colspan="2" style="padding: 5px; color: #888;">All terminals are empty</td></tr>');
    result.push("</table>");
    const resultString = result.join("");
    console.log(resultString);
    return resultString;
  }

  // Table headers
  result.push('<tr style="background-color: #333;">');
  result.push('<th style="padding: 5px;">ROOM</th>');
  const sortedResources = Array.from(resourceTypes).sort();
  sortedResources.forEach(res => {
    result.push(`<th style="padding: 5px;">${utilsResources.resourceImg(res)}</th>`);
  });
  result.push("</tr>");

  // Room rows
  _.forEach(rooms, (room) => {
    result.push('<tr style="background-color: #1a1a1a;">');
    result.push(`<td style="padding: 5px; color: #00ffff; font-weight: bold;">${room.name}</td>`);
    sortedResources.forEach(res => {
      const amount = roomData[room.name][res] || 0;
      const color = amount > 0 ? "#cccccc" : "#888";
      result.push(`<td style="padding: 5px; text-align: right; color: ${color};">${amount.toLocaleString()}</td>`);
    });
    result.push("</tr>");
  });

  // Totals row
  result.push('<tr style="background-color: #333;">');
  result.push('<td style="padding: 5px; font-weight: bold; color: #00ff00;">TOTAL</td>');
  sortedResources.forEach(res => {
    const total = sums[res] || 0;
    result.push(`<td style="padding: 5px; text-align: right; font-weight: bold; color: #00ff00;">${total.toLocaleString()}</td>`);
  });
  result.push("</tr>");

  result.push("</table>");
  const resultString = result.join("");
  console.log(resultString);
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
  const result = [];
  result.push('<table border="1" style="border-collapse: collapse; width: 100%;">');
  result.push("<caption><strong>LAB STATUS AND REACTIONS</strong></caption>");

  let hasLabs = false;
  const roomsWithLabs = [];

  // Collect all rooms with labs
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (!room.controller || !room.controller.my) continue;

    const labs = room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return "structureType" in structure && structure.structureType === STRUCTURE_LAB;
      },
    });

    if (labs.length > 0) {
      roomsWithLabs.push({ room, roomName, labs });
    }
  }

  if (roomsWithLabs.length === 0) {
    result.push('<tr><td colspan="7" style="padding: 5px; color: #888;">No labs found in owned rooms</td></tr>');
    result.push("</table>");
    const resultString = result.join("");
    console.log(resultString);
    return resultString;
  }

  // Table headers
  result.push('<tr style="background-color: #333;">');
  result.push('<th style="padding: 5px;">ROOM</th>');
  result.push('<th style="padding: 5px;">STATUS</th>');
  result.push('<th style="padding: 5px;">RESULT</th>');
  result.push('<th style="padding: 5px;">CENTER LAB</th>');
  result.push('<th style="padding: 5px;">REAGENT A</th>');
  result.push('<th style="padding: 5px;">REAGENT B</th>');
  result.push('<th style="padding: 5px;">PARTNER LABS</th>');
  result.push("</tr>");

  // Process each room
  for (const { room, roomName, labs } of roomsWithLabs) {
    let roomHeaderAdded = false;

    for (const labIdx in labs) {
      const labC = labs[labIdx];
      const labMemory = labC.memory;

      if (labC && labMemory && labMemory.partnerA) {
        hasLabs = true;

        // Add room header for first lab in room
        if (!roomHeaderAdded) {
          result.push(`<tr><td colspan="7" style="padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;">ROOM: ${roomName}</td></tr>`);
          roomHeaderAdded = true;
        }

        result.push('<tr style="background-color: #1a1a1a;">');

        const partnerA = Game.getObjectById(labMemory.partnerA);
        const partnerB = Game.getObjectById(labMemory.partnerB);
        const partnerAMemory = partnerA && partnerA.memory ? partnerA.memory : null;

        if (partnerA && partnerAMemory) {
          // Room name (only for first row per room, handled by header)
          result.push('<td style="padding: 5px; color: #888;"></td>');

          // Status
          const status = partnerAMemory.status || "UNKNOWN";
          const statusColor = status === "OK" ? "#00ff00" : status === "ERROR" ? "#ff0000" : "#ffaa00";
          result.push(`<td style="padding: 5px; color: ${statusColor}; font-weight: bold;">${status}</td>`);

          // Result resource (center lab output)
          result.push(`<td style="padding: 5px; text-align: center;">${utilsResources.resourceImg(labMemory.resource)}</td>`);

          // Center lab
          result.push(`<td style="padding: 5px; color: #00ffff;">${labC}</td>`);

          // Reagent A
          result.push(`<td style="padding: 5px; text-align: center;">${utilsResources.resourceImg(partnerAMemory.resource)}</td>`);

          // Reagent B
          const partnerBMemory = partnerB && partnerB.memory ? partnerB.memory : null;
          if (partnerB && partnerBMemory) {
            result.push(`<td style="padding: 5px; text-align: center;">${utilsResources.resourceImg(partnerBMemory.resource)}</td>`);
          } else {
            result.push('<td style="padding: 5px; color: #888; text-align: center;">-</td>');
          }

          // Partner labs
          const partnerNames = [partnerA.toString()];
          if (partnerB) {
            partnerNames.push(partnerB.toString());
          }
          result.push(`<td style="padding: 5px; color: #cccccc;">${partnerNames.join(", ")}</td>`);

          result.push("</tr>");
        }
      }
    }
  }

  if (!hasLabs) {
    result.push('<tr><td colspan="7" style="padding: 5px; color: #888;">No active lab reactions found</td></tr>');
  }

  result.push("</table>");
  const resultString = result.join("");
  console.log(resultString);
  return resultString;
}

/**
 * Show resources across all rooms
 * @param {boolean} [hide=false] - If true, only show resources with amount > 0
 * @returns {string} HTML table string
 */
function showResources(hide = false) {
  const result = [];
  result.push('<table border="1" style="border-collapse: collapse; border-color: #fff; font-family: monospace;">');
  result.push('<caption style="padding: 5px; font-weight: bold; font-size: 1.1em;">RESOURCES</caption>');
  result.push('<tr style="background-color: #333;">');
  result.push('<th style="padding: 8px; text-align: left;">RESOURCE</th>');
  result.push('<th style="padding: 8px; text-align: right;">AMOUNT</th>');
  result.push('<th style="padding: 8px; text-align: right;">OFFSET TO PERFECT</th>');
  result.push("</tr>");

  let numberOfRooms = 0;
  for (const roomName in Game.rooms) {
    if (Game.rooms[roomName].storage) numberOfRooms += 1;
  }

  // Helper function to format numbers with thousand separators
  const formatNumber = (num) => {
    // Convert to integer and format with thousand separators (dots)
    const numStr = Math.floor(num).toString();
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  let rowCount = 0;
  for (const resource of RESOURCES_ALL) {
    const amount = utilsResources.globalResourcesAmount(resource);
    const threshold = numberOfRooms * global.getRoomThreshold(resource, "all");
    const offset = amount - threshold;

    // Skip if hide is true and amount is 0
    if (hide && amount === 0) {
      continue;
    }

    // Alternate row colors for better readability
    const rowBgColor = rowCount % 2 === 0 ? "#1a1a1a" : "#222";
    result.push(`<tr style="background-color: ${rowBgColor};">`);
    
    // Resource icon/name
    result.push(`<td style="padding: 5px;">${utilsResources.resourceImg(resource)}</td>`);
    
    // Amount with formatting
    result.push(`<td style="padding: 5px; text-align: right; color: #fff;">${formatNumber(amount)}</td>`);
    
    // Offset with color coding
    let offsetColor = "#888";
    let offsetSymbol = "";
    if (offset > 0) {
      offsetColor = "#4CAF50"; // Green for positive
      offsetSymbol = "+";
    } else if (offset < 0) {
      offsetColor = "#F44336"; // Red for negative
    } else {
      offsetColor = "#FFC107"; // Yellow/Orange for zero
    }
    
    result.push(`<td style="padding: 5px; text-align: right; color: ${offsetColor}; border-color: #fff; font-weight: bold;">${offsetSymbol}${formatNumber(offset)}</td>`);
    
    result.push("</tr>");
    rowCount++;
  }

  if (rowCount === 0) {
    result.push('<tr><td colspan="3" style="padding: 10px; text-align: center; color: #888;">No resources found</td></tr>');
  }

  result.push("</table>");
  return result.join("");
}

/**
 * Show market information
 * @returns {string} HTML table string
 */
function showMarket() {
  const result = [];
  result.push('<table border="1">');
  result.push("<caption> MARKET\n</caption>");
  result.push("<tr>");
  result.push("<th></th>");
  result.push("<th> MIN SELL PRICE </th>");
  result.push("<th> AMOUNT ON SELL </th>");
  result.push("<th> MAX SELL PRICE </th>");
  result.push("<th> AMOUNT SELL ORDERS </th>");
  result.push("<th></th>");
  result.push("<th> MIN BUY PRICE </th>");
  result.push("<th> AMOUNT ON BUY </th>");
  result.push("<th> MAX BUY PRICE </th>");
  result.push("<th> AMOUNT BUY ORDERS </th>");
  result.push("</tr>");

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
      if (amountSell > 1000) amountSell = `${amountSell / 1000  }K`;
    }

    let amountBuy = " - ";
    if (ordersBuy[0] && ordersBuy[0].amount) {
      amountBuy = ordersBuy[ordersBuy.length - 1].amount;
      if (amountBuy > 1000) amountBuy = `${amountBuy / 1000  }K`;
    }

    result.push("<tr>");
    result.push(`<td> ${  utilsResources.resourceImg(resources)  } </td>`);
    result.push(`<td> ${  priceSell  } </td>`);
    result.push(`<td> ${  amountSell  } </td>`);
    result.push(`<td> ${  lastPriceSell  } </td>`);
    result.push(`<td> ${  ordersSell.length  } </td>`);
    result.push(`<td> ${  utilsResources.resourceImg(resources)  } </td>`);
    result.push(`<td> ${  priceBuy  } </td>`);
    result.push(`<td> ${  amountBuy  } </td>`);
    result.push(`<td> ${  lastPriceBuy  } </td>`);
    result.push(`<td> ${  ordersBuy.length  } </td>`);
    result.push("</tr>");
  }

  return result.join("");
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
 * Visualize all transport orders (givesResources and needsResources) for a room
 * @param {string|null} roomName - Room name to visualize, or null for all rooms
 * @returns {string} HTML table string
 */
function showLogistic(roomName = null) {
  const result = [];
  result.push('<table border="1" style="border-collapse: collapse; width: 100%;">');
  result.push("<caption><strong>TRANSPORT ORDERS (LOGISTICS)</strong></caption>");

  // Get rooms to process
  const roomsToProcess = [];
  if (roomName) {
    const room = Game.rooms[roomName];
    if (room && room.controller && room.controller.my) {
      roomsToProcess.push(room);
    } else {
      result.push(`<tr><td colspan="8" style="color: #ff0000;">Room "${roomName}" not found or not owned</td></tr>`);
      result.push("</table>");
      return result.join("");
    }
  } else {
    // All owned rooms
    for (const name in Game.rooms) {
      const room = Game.rooms[name];
      if (room && room.controller && room.controller.my) {
        roomsToProcess.push(room);
      }
    }
  }

  if (roomsToProcess.length === 0) {
    result.push('<tr><td colspan="8" style="color: #ff0000;">No owned rooms found</td></tr>');
    result.push("</table>");
    return result.join("");
  }

  // Create a temporary ControllerGame instance to create ControllerRoom instances
  const tempControllerGame = new ControllerGame();

  for (const room of roomsToProcess) {
    const rc = tempControllerGame._rooms[room.name];
    if (!rc) continue;

    // Room header
    result.push(`<tr><td colspan="10" style="padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;">ROOM: ${room.name}</td></tr>`);

    // Table headers
    result.push('<tr style="background-color: #333;">');
    result.push('<th style="padding: 5px;">RESOURCE</th>');
    result.push('<th style="padding: 5px;">FROM (SOURCE)</th>');
    result.push('<th style="padding: 5px;">AMOUNT</th>');
    result.push('<th style="padding: 5px;">PRIORITY</th>');
    result.push('<th style="padding: 5px;">TO (TARGET)</th>');
    result.push('<th style="padding: 5px;">AMOUNT</th>');
    result.push('<th style="padding: 5px;">PRIORITY</th>');
    result.push('<th style="padding: 5px;">SOURCE OBJ</th>');
    result.push('<th style="padding: 5px;">TARGET OBJ</th>');
    result.push('<th style="padding: 5px;">STATUS</th>');
    result.push("</tr>");

    // Get givesResources and needsResources
    const givesResources = rc.givesResources();
    const needsResources = rc.needsResources();

    // Find matching transport orders (need.priority < give.priority)
    const transportOrders = [];
    for (const give of givesResources) {
      for (const need of needsResources) {
        // Check if same resource type and need priority is less than give priority
        if (give.resourceType === need.resourceType && need.priority < give.priority && need.id !== give.id) {
          // Verify target still exists and has capacity
          const targetObj = Game.getObjectById(need.id);
          if (!targetObj) continue;

          if (targetObj.store) {
            const freeCap = targetObj.store.getFreeCapacity(need.resourceType) || 0;
            if (freeCap <= 0) continue;
          }

          // Verify source still exists
          const sourceObj = Game.getObjectById(give.id);
          if (!sourceObj) continue;

          transportOrders.push({ give, need });
        }
      }
    }

    // Sort by priority (need.priority) from smallest to largest
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
          // Calculate source available amount
          let sourceAvailable = 0;
          if (sourceObj.store) {
            // Structure with store (container, storage, terminal, etc.)
            sourceAvailable = sourceObj.store[give.resourceType] || 0;
          } else if (sourceObj.amount !== undefined && sourceObj.resourceType === give.resourceType) {
            // Dropped resource
            sourceAvailable = sourceObj.amount || 0;
          } else if (sourceObj.store && sourceObj.store.getUsedCapacity) {
            // Tombstone or ruin
            sourceAvailable = sourceObj.store[give.resourceType] || 0;
          }

          // Calculate target free capacity
          let targetFreeStr = "0";
          if (targetObj.store) {
            // Structure with store
            const freeCap = targetObj.store.getFreeCapacity(need.resourceType) || 0;
            targetFreeStr = String(freeCap);
          } else if (targetObj.store && targetObj.store.getFreeCapacity) {
            // Tombstone or ruin (can't receive, but has store)
            targetFreeStr = "0";
          } else {
            // Object without store (e.g., Controller) - assume it can receive
            targetFreeStr = "∞";
          }

          status = `${sourceAvailable} available → ${targetFreeStr} free`;
        }

        result.push('<tr style="background-color: #1a1a1a;">');
        result.push(`<td style="padding: 5px;">${utilsResources.resourceImg(give.resourceType)}</td>`);
        result.push(`<td style="padding: 5px; color: #00ff00;">${sourceName}</td>`);
        result.push(`<td style="padding: 5px; text-align: right;">${give.amount || 0}</td>`);
        result.push(`<td style="padding: 5px; text-align: right;">${give.priority || 0}</td>`);
        result.push(`<td style="padding: 5px; color: #ff8800;">${targetName}</td>`);
        result.push(`<td style="padding: 5px; text-align: right;">${need.amount || 0}</td>`);
        result.push(`<td style="padding: 5px; text-align: right;">${need.priority || 0}</td>`);
        result.push(`<td style="padding: 5px; font-family: monospace; font-size: 10px;">${give.id}</td>`);
        result.push(`<td style="padding: 5px; font-family: monospace; font-size: 10px;">${need.id}</td>`);
        result.push(`<td style="padding: 5px;">${status}</td>`);
        result.push("</tr>");
      }
    } else {
      result.push('<tr><td colspan="10" style="padding: 5px; color: #888;">No transport orders available (no matching pairs with need.priority < give.priority)</td></tr>');
    }

    // Summary row
    result.push('<tr style="background-color: #333;">');
    result.push(`<td colspan="10" style="padding: 5px; color: #cccccc;">Summary: ${transportOrders.length} transport order(s) from ${givesResources.length} gives and ${needsResources.length} needs</td>`);
    result.push("</tr>");
  }

  result.push("</table>");
  const resultString = result.join("");
  console.log(resultString);
  return resultString;
}

/**
 * Shows CPU analysis
 * @returns {void}
 */
function showCPU() {
  if (!Memory.cpuHistory || Memory.cpuHistory.length < 2) {
    console.log("No CPU data - Insufficient CPU history data (need at least 2 samples)");
    return;
  }

  const stats = cpuAnalyzer.getStatistics(100);
  const decision = cpuAnalyzer.canConquerNewRoom();

  console.log(`CPU: Avg ${stats.average.cpuUsed.toFixed(2)}/${stats.average.cpuLimit.toFixed(0)} (${((stats.average.cpuUsed / stats.average.cpuLimit) * 100).toFixed(1)}%) | CPU/Room ${stats.average.cpuPerRoom.toFixed(2)} | Can Conquer ${decision.canConquer ? "YES" : "NO"}${!decision.canConquer ? ` (${decision.reason})` : ""}`);
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

  // Determine color and symbol based on room status
  let color = "#888888"; // Gray = unknown/old data
  let symbol = "?";
  let size = 0.3;

  // Check how recent the data is
  const ticksSinceCheck = Game.time - roomMemory.lastCheck;
  const isRecent = ticksSinceCheck < CONSTANTS.TRANSPORT.SCOUT_RECENT_THRESHOLD;
  const isOld = ticksSinceCheck > CONSTANTS.TRANSPORT.SCOUT_OLD_THRESHOLD;

  if (isOld) {
    color = "#444444"; // Very old data
    symbol = "·";
    size = 0.2;
  } else if (isRecent) {
    // Recent data - show detailed info
    if (roomMemory.isHostile || roomMemory.avoid) {
      color = "#ff0000"; // Red = hostile
      symbol = "⚠";
      size = 0.4;
    } else if (roomMemory.controller && roomMemory.controller.my) {
      color = "#00ff00"; // Green = owned
      symbol = "✓";
      size = 0.4;
    } else if (roomMemory.controller && !roomMemory.controller.owner && !roomMemory.controller.reservation) {
      color = "#00ffff"; // Cyan = free to claim
      symbol = "○";
      size = 0.5;
    } else if (roomMemory.roomType === "ROOMTYPE_CORE") {
      color = "#ffff00"; // Yellow = core room (3 sources)
      symbol = "★";
      size = 0.4;
    } else if (roomMemory.sources && roomMemory.sources.length === 2) {
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

  // Score (white) - top-left corner
  if (roomMemory.score && roomMemory.score.total && roomMemory.score.total > CONSTANTS.TRANSPORT.SCOUT_SCORE_THRESHOLD) {
    const scoreText = roomMemory.score.total.toString();
    const scorePos = new RoomPosition(xOffsetLeft, 1, roomName);
    Game.map.visual.text(scoreText, scorePos, {
      size: 0.2,
      color: "#ffffff",
      align: "left",
      opacity: 0.8,
    });
    xOffsetLeft += scoreText.length * 0.15 + 0.2; // Space after score
    hasInfo = true;
  }

  // Mineral (orange) - top-left corner after score
  if (roomMemory.mineral && roomMemory.mineral.type && isRecent) {
    const mineralShort = roomMemory.mineral.type.replace("RESOURCE_", "").substring(0, 2);
    const mineralPos = new RoomPosition(xOffsetLeft, 1, roomName);
    Game.map.visual.text(mineralShort, mineralPos, {
      size: 0.2,
      color: "#ffaa00",
      align: "left",
      opacity: 0.8,
    });
    hasInfo = true;
  }

  // Source count as yellow dots (0-4 dots) - top-right corner
  const sourceCount = roomMemory.sources ? roomMemory.sources.length : 0;
  const sourceDots = "•".repeat(Math.min(sourceCount, CONSTANTS.TRANSPORT.SCOUT_MAX_SOURCE_DOTS));
  if (sourceDots) {
    const dotsPos = new RoomPosition(49, 1, roomName);
    Game.map.visual.text(sourceDots, dotsPos, {
      size: 0.25,
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
      const bgWidthRight = sourceDots.length * 0.15 + 0.5;
      const bgPosRight = new RoomPosition(49 - bgWidthRight + 0.3, 0.3, roomName);
      Game.map.visual.rect(bgPosRight, bgWidthRight, 0.5, {
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
      console.log("✅ Scout visualization disabled");
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
    console.log("No owned room found for center. Usage: showScout('W1N1')");
    return;
  }

  // Iterate through all rooms in memory
  if (!Memory.rooms) {
    console.log("No room memory found. Scout needs to explore rooms first.");
    return;
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

  console.log(`✅ Scout data visualized: ${roomsVisualized} rooms shown on world map (center: ${centerRoom})`);
  console.log(`   Visualization will persist for ${visualizationDuration} ticks (until tick ${Game.time + visualizationDuration})`);
  console.log("   Use showScout(false) to disable early");
  console.log("Legend: ✓=Owned, ○=Free, ★=Core(3s), ●=2s, ⚠=Hostile, ·=Explored, ?=Old data");
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
  _redrawScoutVisualization, // Internal function for automatic redraw
};

