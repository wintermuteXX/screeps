const Log = require("Log");
const utilsUsername = require("utils.username");
const utilsResources = require("utils.resources");
// @ts-ignore - ControllerRoom and ControllerGame are runtime modules
const ControllerRoom = require("ControllerRoom");
// @ts-ignore - ControllerRoom and ControllerGame are runtime modules
const ControllerGame = require("ControllerGame");





/**
 * Show what's in all terminals
 */
function whatsInTerminals() {
  const roomData = {};
  const sums = {};
  const rooms = _.filter(Game.rooms, (r) => {
    return r.controller && r.controller.my && r.terminal;
  });
  _.forEach(rooms, (r) => {
    roomData[r.name] = roomData[r.name] || {};
    _.forEach(r.terminal.store, (quantity, item) => {
      sums[item] = sums[item] || 0;
      sums[item] = sums[item] + quantity;
      roomData[r.name][item] = quantity;
    });
  });
  Log.info("Room Data: " + JSON.stringify(roomData, null, 3), "Terminal");
  Log.info("Totals: " + JSON.stringify(sums, null, 3), "Terminal");
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
  result.push('<table border="1">');
  result.push("<caption> LABS\n</caption>");
  result.push("<tr>");
  result.push("<th> STATUS </th>");
  result.push("<th> C </th>");
  result.push("<th> C </th>");
  result.push("<th> A </th>");
  result.push("<th> B </th>");
  result.push("<th> A </th>");
  result.push("<th> B </th>");
  result.push("</tr>");

  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];

    const labs = room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return 'structureType' in structure && structure.structureType === STRUCTURE_LAB;
      },
    });

    for (const labIdx in labs) {
      const labC = labs[labIdx];
      // @ts-ignore - Lab memory is custom
      const labMemory = labC.memory;
      if (labC && labMemory && labMemory.partnerA) {
        result.push("<tr>");
        const partnerA = Game.getObjectById(labMemory.partnerA);
        const partnerB = Game.getObjectById(labMemory.partnerB);
        // @ts-ignore - Lab memory is custom
        const partnerAMemory = partnerA && partnerA.memory ? partnerA.memory : null;
        if (partnerA && partnerAMemory) {
          result.push("<td> " + partnerAMemory.status + " </td>");
          result.push("<td> " + utilsResources.resourceImg(labMemory.resource) + " </td>");
          result.push("<td> " + labC + " </td>");
          result.push("<td> " + utilsResources.resourceImg(partnerAMemory.resource) + " </td>");
          // @ts-ignore - Lab memory is custom
          const partnerBMemory = partnerB && partnerB.memory ? partnerB.memory : null;
          if (partnerB && partnerBMemory) {
            result.push("<td> " + utilsResources.resourceImg(partnerBMemory.resource) + " </td>");
          }
          result.push("<td> " + partnerA + " </td>");
          if (partnerB) {
            result.push("<td> " + partnerB + " </td>");
          }
          result.push("</tr>");
        }
      }
    }
  }
  return result.join("");
}

/**
 * Show resources across all rooms
 * @param {boolean} hide - If true, only show resources with amount > 0
 * @returns {string} HTML table string
 */
function myResources(hide = false) {
  const result = [];
  result.push('<table border="1">');
  result.push("<caption> RESOURCE\n</caption>");
  result.push("<tr>");
  result.push("<th></th>");
  result.push("<th> AMOUNT </th>");
  result.push("<th> Offset to perfect </th>");
  result.push("</tr>");

  let numberOfRooms = 0;
  for (const roomName in Game.rooms) {
    if (Game.rooms[roomName].storage) numberOfRooms += 1;
  }

  for (const resourceIdx in RESOURCES_ALL) {
    const resource = RESOURCES_ALL[resourceIdx];

    if (!hide) {
      result.push("<tr>");
      result.push("<td> " + utilsResources.resourceImg(resource) + " </td>");
      result.push("<td align='right'> " + utilsResources.globalResourcesAmount(resource) + " </td>");
      const offset = utilsResources.globalResourcesAmount(resource) - numberOfRooms * global.getRoomThreshold(resource, "all");
      if (offset >= 0) {
        result.push("<td align='right' style='color:#008000'> " + offset + " </td>");
      } else {
        result.push("<td align='right' style='color:#FF0000'> " + offset + " </td>");
      }
      result.push("</tr>");
    } else {
      if (utilsResources.globalResourcesAmount && utilsResources.globalResourcesAmount(resource) > 0) {
        result.push("<tr>");
        result.push("<td> " + utilsResources.resourceImg(resource) + " </td>");
        result.push("<td align='right'> " + utilsResources.globalResourcesAmount(resource) + " </td>");
        result.push("<td align='right'> " + (utilsResources.globalResourcesAmount(resource) - numberOfRooms * global.getRoomThreshold(resource, "all")) + " </td>");
        result.push("</tr>");
      }
    }
  }

  return result.join("");
}

/**
 * Show market information
 * @returns {string} HTML table string
 */
function marketInfo() {
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

  for (const resourceIdx in RESOURCES_ALL) {
    const resources = RESOURCES_ALL[resourceIdx];

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
      if (amountSell > 1000) amountSell = amountSell / 1000 + "K";
    }

    let amountBuy = " - ";
    if (ordersBuy[0] && ordersBuy[0].amount) {
      amountBuy = ordersBuy[ordersBuy.length - 1].amount;
      if (amountBuy > 1000) amountBuy = amountBuy / 1000 + "K";
    }

    result.push("<tr>");
    result.push("<td> " + utilsResources.resourceImg(resources) + " </td>");
    result.push("<td> " + priceSell + " </td>");
    result.push("<td> " + amountSell + " </td>");
    result.push("<td> " + lastPriceSell + " </td>");
    result.push("<td> " + ordersSell.length + " </td>");
    result.push("<td> " + utilsResources.resourceImg(resources) + " </td>");
    result.push("<td> " + priceBuy + " </td>");
    result.push("<td> " + amountBuy + " </td>");
    result.push("<td> " + lastPriceBuy + " </td>");
    result.push("<td> " + ordersBuy.length + " </td>");
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
 * Displays all available helper functions in a compact table format
 * Usage: help() or help('category')
 * Categories: 'all', 'resources', 'planner', 'market', 'utils'
 * @param {string} category - Category to show (default: 'all')
 * @returns {string} HTML table string
 */
function help(category = 'all') {
  const functions = {
    resources: [
      { name: 'myResources(hide)', desc: 'Table of all resources across rooms', example: 'myResources(true)' },
      { name: 'showLabs()', desc: 'Table showing lab status and reactions', example: 'showLabs()' },
      { name: 'globalResourcesAmount(res)', desc: 'Total amount of resource across all rooms', example: 'globalResourcesAmount(RESOURCE_ENERGY)' },
      { name: 'getRoomThreshold(res, struct)', desc: 'Threshold (fill level) for resource', example: 'getRoomThreshold(RESOURCE_ENERGY, "storage")' },
      { name: 'reorderResources()', desc: 'Reorders resources in terminal/storage', example: 'reorderResources()' }
    ],
    planner: [
      { name: 'plannerVisualize(room)', desc: 'Visualizes planned layout in game view', example: 'plannerVisualize("W1N1")' },
      { name: 'plannerStats(room)', desc: 'Statistics about planned layout', example: 'plannerStats("W1N1")' },
      { name: 'plannerReset(room)', desc: 'Resets layout for a room', example: 'plannerReset("W1N1")' },
      { name: 'plannerRun(room)', desc: 'Runs RoomPlanner manually', example: 'plannerRun("W1N1")' },
      { name: 'plannerSetCenter(room, x, y)', desc: 'Sets center coordinates for planning', example: 'plannerSetCenter("W1N1", 25, 25)' }
    ],
    market: [
      { name: 'marketInfo()', desc: 'Table with market info (prices, amounts, orders)', example: 'marketInfo()' },
      { name: 'MarketCal', desc: 'Market Calculator object', example: 'MarketCal.calculateBestPrice(...)' }
    ],
    utils: [
      { name: 'voiceConsole(text)', desc: 'Text-to-speech (Chrome/Firefox only)', example: 'voiceConsole("Hello")' },
      { name: 'isHostileUsername(user)', desc: 'Checks if username is hostile', example: 'isHostileUsername("Player")' }
    ]
  };

  let result = [];
  result.push('<table border="1" style="border-collapse: collapse;">');
  result.push('<caption><strong>SCREEPS HELPER FUNCTIONS</strong></caption>');
  result.push('<tr>');
  result.push('<th style="padding: 5px; background-color: #333;">FUNCTION</th>');
  result.push('<th style="padding: 5px; background-color: #333;">DESCRIPTION</th>');
  result.push('<th style="padding: 5px; background-color: #333;">EXAMPLE</th>');
  result.push('</tr>');

  if (category === 'all' || !category) {
    // Show all categories
    for (const [cat, funcs] of Object.entries(functions)) {
      result.push(`<tr><td colspan="3" style="padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;">${cat.toUpperCase()}</td></tr>`);
      funcs.forEach(func => {
        result.push('<tr>');
        result.push(`<td style="padding: 5px; color: #00ff00;">${func.name}</td>`);
        result.push(`<td style="padding: 5px; color: #cccccc;">${func.desc}</td>`);
        result.push(`<td style="padding: 5px; color: #888; font-family: monospace;">${func.example}</td>`);
        result.push('</tr>');
      });
    }
  } else if (functions[category]) {
    // Show specific category
    result.push(`<tr><td colspan="3" style="padding: 5px; background-color: #222; color: #00ffff; font-weight: bold;">${category.toUpperCase()}</td></tr>`);
    functions[category].forEach(func => {
      result.push('<tr>');
      result.push(`<td style="padding: 5px; color: #00ff00;">${func.name}</td>`);
      result.push(`<td style="padding: 5px; color: #cccccc;">${func.desc}</td>`);
      result.push(`<td style="padding: 5px; color: #888; font-family: monospace;">${func.example}</td>`);
      result.push('</tr>');
    });
  } else {
    result.push(`<tr><td colspan="3" style="padding: 5px; color: #ff0000;">Unknown category: ${category}</td></tr>`);
    result.push(`<tr><td colspan="3" style="padding: 5px; color: #cccccc;">Available: ${Object.keys(functions).join(', ')}</td></tr>`);
  }

  result.push('</table>');
  result.push('<p style="color: #888; font-size: 12px;">Usage: help() or help("category") | Categories: all, resources, planner, market, utils</p>');
  
  const resultString = result.join('');
  console.log(resultString);
  return resultString;
}

/**
 * Visualize all transport orders (givesResources and needsResources) for a room
 * @param {string|null} roomName - Room name to visualize, or null for all rooms
 * @returns {string} HTML table string
 */
function visualizeLogistic(roomName = null) {
  const result = [];
  result.push('<table border="1" style="border-collapse: collapse; width: 100%;">');
  result.push('<caption><strong>TRANSPORT ORDERS (LOGISTICS)</strong></caption>');
  
  // Get rooms to process
  const roomsToProcess = [];
  if (roomName) {
    const room = Game.rooms[roomName];
    if (room && room.controller && room.controller.my) {
      roomsToProcess.push(room);
    } else {
      result.push(`<tr><td colspan="8" style="color: #ff0000;">Room "${roomName}" not found or not owned</td></tr>`);
      result.push('</table>');
      return result.join('');
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
    result.push('</table>');
    return result.join('');
  }
  
  // Create a temporary ControllerGame instance to create ControllerRoom instances
  const tempControllerGame = new ControllerGame();
  
  for (const room of roomsToProcess) {
    // @ts-ignore - _rooms is a private property but we need it for console visualization
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
    result.push('</tr>');
    
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
          
          // @ts-ignore - targetObj may have store property
          if (targetObj.store) {
            // @ts-ignore - store property exists on structures/creeps
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
        const sourceName = sourceObj ? sourceObj.toString() : 'NOT FOUND';
        const targetName = targetObj ? targetObj.toString() : 'NOT FOUND';
        
        let status = 'OK';
        if (!sourceObj || !targetObj) {
          status = 'INVALID';
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
          let targetFreeStr = '0';
          if (targetObj.store) {
            // Structure with store
            const freeCap = targetObj.store.getFreeCapacity(need.resourceType) || 0;
            targetFreeStr = String(freeCap);
          } else if (targetObj.store && targetObj.store.getFreeCapacity) {
            // Tombstone or ruin (can't receive, but has store)
            targetFreeStr = '0';
          } else {
            // Object without store (e.g., Controller) - assume it can receive
            targetFreeStr = '∞';
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
        result.push('</tr>');
      }
    } else {
      result.push('<tr><td colspan="10" style="padding: 5px; color: #888;">No transport orders available (no matching pairs with need.priority < give.priority)</td></tr>');
    }
    
    // Summary row
    result.push('<tr style="background-color: #333;">');
    result.push(`<td colspan="10" style="padding: 5px; color: #cccccc;">Summary: ${transportOrders.length} transport order(s) from ${givesResources.length} gives and ${needsResources.length} needs</td>`);
    result.push('</tr>');
  }
  
  result.push('</table>');
  const resultString = result.join('');
  console.log(resultString);
  return resultString;
}

module.exports = {
  whatsInTerminals,
  numberOfTerminals,
  showLabs,
  myResources,
  marketInfo,
  json,
  help,
  visualizeLogistic
};

