const CONSTANTS = require("./constants");
const Log = require("Log");
const ResourceManager = require("ResourceManager");

function ControllerTerminal(rc) {
  this.room = rc;
  this.terminal = rc.room.terminal;
}

/**
 * Helper: Checks if terminal exists and is owned
 */
ControllerTerminal.prototype._isTerminalValid = function () {
  return this.terminal && this.terminal.my;
};
ControllerTerminal.prototype.calcHighestSellingPrice = function (resourceType, amount = 0) {
  if (!resourceType) {
    return null;
  }

  let modify;
  if (amount < global.modSellAmount1) {
    modify = global.modSellMultiplier1;
  } else if (amount < global.modSellAmount2) {
    modify = global.modSellMultiplier2;
  } else if (amount < global.modSellAmount3) {
    modify = global.modSellMultiplier3;
  } else {
    modify = global.modSellMultiplier4;
  }

  let maxSellPrice = this.getAvgPrice(resourceType, 2, 1);
  maxSellPrice = maxSellPrice * modify;
  Log.info(`${this.terminal} returns ${maxSellPrice.toFixed(3)} for resource ${resourceType}`, "calcHighestSellingPrice");

  return Math.max(maxSellPrice, global.minSellPrice);
};
ControllerTerminal.prototype.getAvgPrice = function (resourceType, days = 2, skipToday = 0) {
  const history = Game.market.getHistory(resourceType);
  let totalPrice = 0;
  for (let index = skipToday; index <= days; index += 1) {
    totalPrice += history[index].avgPrice;
  }
  return totalPrice / days;
};
ControllerTerminal.prototype.sellRoomMineral = function () {
  if (!this._isTerminalValid()) {
    return null;
  }
  const terminal = this.terminal;
  const theMineralType = terminal.room.mineral.mineralType;
  
  if (global.globalResourcesAmount(theMineralType) < global.numberOfTerminals() * global.getRoomThreshold(theMineralType, "all")) {
    return null;
  }
  
  let orderExists = false;

  for (const id in Game.market.orders) {
    const order = Game.market.orders[id];
    if (order.type === "sell" && order.resourceType === theMineralType && order.roomName === terminal.room.name) {
      Log.debug(`${order.roomName} found an existing sell order for ${global.resourceImg(theMineralType)}`, "sellRoomMineral");
      orderExists = true;
      
      // Adjust Price
      const thePrice = this.calcHighestSellingPrice(theMineralType, terminal.store[theMineralType]);
      if (order.price !== thePrice && Math.abs(order.price - thePrice) > 0.01) {
        Log.info(`${order.roomName} changed sell price from ${order.price} to ${thePrice} for ${global.resourceImg(theMineralType)}`, "sellRoomMineral");
        Game.market.changeOrderPrice(order.id, thePrice);
      }
      
      // Extend Order
      if (order.remainingAmount < CONSTANTS.MARKET.MIN_ORDER_AMOUNT) {
        const result = Game.market.extendOrder(order.id, CONSTANTS.MARKET.MAX_ORDER_AMOUNT - order.remainingAmount);
        switch (result) {
          case OK:
            Log.success(`${terminal.room} extends order for ${global.resourceImg(theMineralType)}`, "sellRoomMineral");
            break;
          default:
            Log.warn(`Result for extendOrder ${global.resourceImg(theMineralType)} in room ${terminal.room}: ${result}`, "sellRoomMineral");
        }
        break;
      }
    }
  }
  
  // Create new order
  if (!orderExists) {
    const price = this.calcHighestSellingPrice(theMineralType, terminal.store[theMineralType]);
    const result = Game.market.createOrder(ORDER_SELL, theMineralType, price, CONSTANTS.MARKET.MAX_ORDER_AMOUNT, terminal.room.name);
    switch (result) {
      case OK:
        Log.success(`Created sell order in room ${terminal.room} for ${global.resourceImg(theMineralType)} was successful`, "sellRoomMineral");
        break;
      default:
        Log.warn(`Result for create sell Order for ${global.resourceImg(theMineralType)} in room ${terminal.room}: ${result}`, "sellRoomMineral");
    }
  }
};
ControllerTerminal.prototype.sellRoomMineralOverflow = function () {
  if (!this._isTerminalValid()) {
    return null;
  }
  const terminal = this.terminal;
  const theMineralType = terminal.room.mineral.mineralType;

  if (terminal.cooldown === 0 && terminal.store[theMineralType] > CONSTANTS.MARKET.MAX_ORDER_AMOUNT) {
    const bestOrder = this.findBestBuyOrder(theMineralType, CONSTANTS.MARKET.ENERGY_PRICE, CONSTANTS.MARKET.PROFIT_THRESHOLD);
    if (bestOrder) {
      const result = Game.market.deal(bestOrder.id, bestOrder.amount, terminal.room.name);
      if (result === OK) {
        Log.success(
          `${bestOrder.amount} of ${global.resourceImg(bestOrder.resourceType)} sold to market. 💲: ${(bestOrder.amount * bestOrder.price).toFixed(2)} - EnergyCost: ${(
            bestOrder.fee * CONSTANTS.MARKET.ENERGY_PRICE
          ).toFixed(2)} `,
          "sellRoomMineralOverflow"
        );
      } else {
        Log.info(`No deal because: ${result}`, "sellRoomMineralOverflow");
      }
    } else {
      Log.info(`No deals for ${global.resourceImg(theMineralType)} overflow found for room ${terminal.room}`, "sellRoomMineralOverflow");
    }
  }
};

ControllerTerminal.prototype.adjustWallHits = function () {
  if (!this._isTerminalValid()) {
    return null;
  }
  const terminal = this.terminal;
  if (ResourceManager.getResourceAmount(terminal.room, RESOURCE_ENERGY, "terminal") > terminal.room.getRoomThreshold(RESOURCE_ENERGY, "terminal") + 20000) {
    Log.success(`Increased the wallHits in room ${terminal.room.name}`);
    terminal.room.memory.wallHits += CONSTANTS.RESOURCES.WALL_HITS_INCREMENT;
  }
};
ControllerTerminal.prototype.internalTrade = function () {
  const terminal = this.terminal;
  if (!terminal || !terminal.my || !terminal.isActive() || terminal.cooldown !== 0) {
    return;
  }
  
  let cancelTrading = false;

  for (const resourceType in terminal.store) {
    const amount = terminal.store[resourceType];
    
    if (cancelTrading || amount === 0 || terminal.room.getResourceAmount(resourceType, "storage") < terminal.room.getRoomThreshold(resourceType, "storage")) {
      continue;
    }

    const roomsWithTerminal = _.filter(Game.rooms, (r) => r.terminal && r.terminal.my && r.terminal.isActive());

    for (const r in roomsWithTerminal) {
      const targetRoom = roomsWithTerminal[r];
      
      if (targetRoom.terminal === terminal || cancelTrading) {
        continue;
      }
      
      const resourceAmountInRoom = targetRoom.getResourceAmount(resourceType, "storage");
      const needed = targetRoom.getRoomThreshold(resourceType, "storage") - resourceAmountInRoom;
      
      if (needed > 0) {
        const sendAmount = resourceType === RESOURCE_ENERGY
          ? Math.min(ResourceManager.getResourceAmount(terminal.room, RESOURCE_ENERGY, "storage") - terminal.room.getRoomThreshold(resourceType, "storage"), needed)
          : Math.min(amount, needed);

        if (sendAmount > 0) {
          const result = terminal.send(resourceType, sendAmount, targetRoom.name, "internal");
          switch (result) {
            case OK:
              cancelTrading = true;
              Log.success(`${terminal.room} transfers ${sendAmount} of ${global.resourceImg(resourceType)} to ${targetRoom}`, "internalTrade");
              break;
            default:
              Log.warn(`${terminal} has unknown result in ${terminal.room} tries to transfer to (${targetRoom}): ${result}`, "internalTrade");
          }
          break;
        }
      }
    }
    
    const helperArray = MarketCal.TIER_1_COMPOUNDS.concat(
      MarketCal.TIER_2_COMPOUNDS,
      MarketCal.TIER_3_COMPOUNDS,
      MarketCal.BASE_COMPOUNDS,
      MarketCal.COMPRESSED_RESOURCES
    );
    
    if (!cancelTrading && _.includes(helperArray, resourceType)) {
      const order = this.findBestBuyOrder(resourceType);
      if (order) {
        const dealAmount = Math.min(order.amount, amount);
        const result = Game.market.deal(order.id, dealAmount, terminal.room.name);
        switch (result) {
          case OK:
            cancelTrading = true;
            Log.success(`${terminal.room} sells ${dealAmount} of ${global.resourceImg(resourceType)} for ${order.price}`, "internalTrade");
            break;
          default:
            Log.warn(`${terminal} has unknown result in ${terminal.room} tries to sell ${dealAmount} ${global.resourceImg(resourceType)} to market: ${result}`, "internalTrade");
        }
      }
    }
  }
};
ControllerTerminal.prototype.buyEnergyOrder = function () {
  const terminal = this.terminal;
  if (!terminal || !terminal.isActive() || !terminal.my) {
    return null;
  }
  
  const energyInTerminal = ResourceManager.getResourceAmount(terminal.room, RESOURCE_ENERGY, "terminal");
  const threshold = terminal.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");

  if (Game.market.credits < threshold) {
    Log.warn(`There are less than ${threshold} credits available. Skipping...`, "buyEnergyOrder");
    return false;
  }
  
  if (energyInTerminal < terminal.room.getRoomThreshold(RESOURCE_ENERGY, "storage") - CONSTANTS.RESOURCES.TERMINAL_ENERGY_BUFFER) {
    Log.debug(`Less than ${threshold} energy in Terminal. We should check orders for room ${terminal.room.name}`, "buyEnergyOrder");

    let orderExists = false;
    for (const id in Game.market.orders) {
      const order = Game.market.orders[id];
      if (order.type === "buy" && order.resourceType === RESOURCE_ENERGY && order.roomName === terminal.room.name) {
        Log.debug(`Found an existing buy energy order for room ${order.roomName}`, "buyEnergyOrder");
        orderExists = true;
        const storageThreshold = terminal.room.getRoomThreshold(RESOURCE_ENERGY, "storage");
        if (order.remainingAmount + energyInTerminal < storageThreshold) {
          Log.debug(
            `Found an existing buy energy order for room ${order.roomName} with remainingAmount ${order.remainingAmount} so I try to extend order by ${storageThreshold} - ${order.remainingAmount} - ${energyInTerminal}`,
            "buyEnergyOrder"
          );

          const result = Game.market.extendOrder(order.id, storageThreshold - order.remainingAmount - energyInTerminal);
          switch (result) {
            case OK:
              Log.success(`ExtendOrder in room ${terminal.room} was successful`, "buyEnergyOrder");
              break;
            default:
              Log.warn(`Result for extendOrder in room ${terminal.room}: ${result}`, "buyEnergyOrder");
          }
          break;
        }
      }
    }
    
    if (!orderExists) {
      const result = Game.market.createOrder(ORDER_BUY, RESOURCE_ENERGY, CONSTANTS.MARKET.ENERGY_PRICE, threshold, terminal.room.name);
      switch (result) {
        case OK:
          Log.success(`Created order in room ${terminal.room} for ${threshold} energy was successful`, "buyEnergyOrder");
          break;
        default:
          Log.warn(`Result for createOrder in room ${terminal.room}: ${result}`, "buyEnergyOrder");
      }
    }
  }
};
/**
 * Finds the best buy order for a resource type
 * @param {string} resourceType - The resource type to find orders for
 * @param {number} [energyPrice] - Energy price for profit calculation (optional)
 * @param {number} [minProfit] - Minimum profit threshold (optional)
 * @returns {Object|null} Best order or null
 */
ControllerTerminal.prototype.findBestBuyOrder = function (resourceType, energyPrice, minProfit) {
  const orders = Game.market.getAllOrders({
    type: ORDER_BUY,
    resourceType: resourceType,
  });

  // If no profit calculation requested, return order with highest price
  if (energyPrice === undefined || minProfit === undefined) {
    let bestOrder = null;
    let highestPrice = 0;
    
    for (const order of orders) {
      if (order.remainingAmount > 0 && order.price > highestPrice) {
        highestPrice = order.price;
        bestOrder = order;
      }
    }
    
    return bestOrder;
  }

  // Calculate profit with transaction costs
  const terminal = this.terminal;
  const ordersWithProfit = orders
    .filter(order => order.remainingAmount > 0)
    .map(order => {
      const amount = order.remainingAmount;
      let fee = 0;
      let profit = order.price;
      
      if (order.roomName) {
        fee = Game.market.calcTransactionCost(amount, terminal.room.name, order.roomName);
        profit = order.price - (fee * energyPrice) / amount;
      }

      return {
        ...order,
        fee: fee,
        profit: profit,
        amount: amount,
      };
    })
    .filter(order => order.profit > minProfit);
  
  if (ordersWithProfit.length === 0) {
    return null;
  }
  
  return _.max(ordersWithProfit, "profit");
};

module.exports = ControllerTerminal;
