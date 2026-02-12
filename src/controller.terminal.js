const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");
const ResourceManager = require("./service.resource");
const BASE_MINERALS_WITHOUT_ENERGY = require("./service.market").BASE_MINERALS_WITHOUT_ENERGY;

class ControllerTerminal {
  constructor(rc) {
    this.room = rc;
    this.terminal = rc.room.terminal;
  }

  /**
   * Runs all terminal operations based on tick intervals
   */
  run() {
    if (Game.time % CONSTANTS.TICKS.BUY_ENERGY_ORDER === 0) {
      this.buyEnergyOrder();
    }
    if (Game.time % CONSTANTS.TICKS.INTERNAL_TRADE === 0) {
      this.internalTrade();
    }
    if (Game.time % CONSTANTS.TICKS.SELL_MINERAL_OVERFLOW === 0) {
      this.sellRoomMineralOverflow();
    }
    if (Game.time % CONSTANTS.TICKS.SELL_MINERAL === 0) {
      this.sellRoomMineral();
    }
    if (Game.time % CONSTANTS.TICKS.BUY_MISSING_MINERALS === 0) {
      this.buyMissingMinerals();
    }
  }

  /**
   * Helper: Checks if terminal exists and is owned
   */
  _isTerminalValid() {
    return this.terminal && this.terminal.my;
  }

  /**
   * Helper: Checks if terminal is active and ready for trading
   */
  _isTerminalActive() {
    return this.terminal && this.terminal.my && this.terminal.isActive() && this.terminal.cooldown === 0;
  }

  /**
   * Helper: Handles market order result and logs appropriately
   */
  _handleOrderResult(result, action, resourceType, room, context) {
    switch (result) {
      case OK:
        Log.success(`${action} in room ${room} for ${global.resourceImg(resourceType)} was successful`, context);
        return true;
      default:
        Log.warn(`Result for ${action} ${global.resourceImg(resourceType)} in room ${room}: ${global.getErrorString(result)}`, context);
        return false;
    }
  }

  /**
   * Helper: Finds existing order by type, resourceType and roomName
   */
  _findExistingOrder(type, resourceType, roomName) {
    for (const id in Game.market.orders) {
      const order = Game.market.orders[id];
      if (order.type === type && order.resourceType === resourceType && order.roomName === roomName) {
        return order;
      }
    }
    return null;
  }

  
  buyMissingMinerals() {
    if (!this._isTerminalValid()) {
      return null;
    }
    const {terminal} = this;
    const mineralsForThisRoom = _.shuffle(BASE_MINERALS_WITHOUT_ENERGY);
    for (const mineralType of mineralsForThisRoom) {
      const globalAmount = global.globalResourcesAmount(mineralType);
      const threshold = global.numberOfTerminals() * global.getRoomThreshold(mineralType, "all");
      if (globalAmount >= threshold) {
        continue;
      }
      const bestOrder = this.findBestSellOrder(mineralType);
      if (!bestOrder) {
        Log.test(`No best order found for ${mineralType}`, "buyMissingMinerals");
        continue;
      }
      let amount = Math.min(bestOrder.amount, threshold - globalAmount);
      Log.test(`Buying ${amount} of ${mineralType}`, "buyMissingMinerals");
      const result = Game.market.deal(bestOrder.id, amount, terminal.room.name);
      this._handleOrderResult(result, "BuyOrder", mineralType, terminal.room, "buyMissingMinerals");
      // exit after first successful buy
      break;
    }
  }

  calcHighestSellingPrice(resourceType, amount) {
    if (amount === undefined) {
      amount = 0;
    }
    if (!resourceType) {
      return null;
    }

    let modify;
    if (amount < CONSTANTS.MARKET.MOD_SELL_AMOUNT_1) {
      modify = CONSTANTS.MARKET.MOD_SELL_MULTIPLIER_1;
    } else if (amount < CONSTANTS.MARKET.MOD_SELL_AMOUNT_2) {
      modify = CONSTANTS.MARKET.MOD_SELL_MULTIPLIER_2;
    } else if (amount < CONSTANTS.MARKET.MOD_SELL_AMOUNT_3) {
      modify = CONSTANTS.MARKET.MOD_SELL_MULTIPLIER_3;
    } else {
      modify = CONSTANTS.MARKET.MOD_SELL_MULTIPLIER_4;
    }

    let maxSellPrice = this.getAvgPrice(resourceType, 2, 1);
    maxSellPrice = maxSellPrice * modify;
    Log.info(`${this.terminal} returns ${maxSellPrice.toFixed(3)} for resource ${resourceType}`, "calcHighestSellingPrice");

    return Math.max(maxSellPrice, CONSTANTS.MARKET.MIN_SELL_PRICE);
  }

  getAvgPrice(resourceType, days, skipToday) {
    if (days === undefined) {
      days = 2;
    }
    if (skipToday === undefined) {
      skipToday = 0;
    }
    const history = Game.market.getHistory(resourceType);
    if (!history || history.length === 0) {
      return 0;
    }
    const endIndex = Math.min(days, history.length - 1);
    let totalPrice = 0;
    let count = 0;
    for (let index = skipToday; index <= endIndex; index += 1) {
      if (history[index] && typeof history[index].avgPrice === "number") {
        totalPrice += history[index].avgPrice;
        count += 1;
      }
    }
    return count > 0 ? totalPrice / count : 0;
  }

  sellRoomMineral() {
    if (!this._isTerminalValid()) {
      return null;
    }
    const {terminal} = this;
    if (!terminal.room.mineral) {
      return null;
    }
    const theMineralType = terminal.room.mineral.mineralType;

    // Check if we have enough global resources before selling
    const globalAmount = global.globalResourcesAmount(theMineralType);
    const threshold = global.numberOfTerminals() * global.getRoomThreshold(theMineralType, "all");

    if (globalAmount < threshold) {
      return null;
    }

    const existingOrder = this._findExistingOrder("sell", theMineralType, terminal.room.name);

    if (existingOrder) {
      // Adjust Price
      const newPrice = this.calcHighestSellingPrice(theMineralType, terminal.store[theMineralType]);
      if (Math.abs(existingOrder.price - newPrice) > 0.01) {
        Log.info(`${terminal.room} changed sell price from ${existingOrder.price} to ${newPrice} for ${global.resourceImg(theMineralType)}`, "sellRoomMineral");
        Game.market.changeOrderPrice(existingOrder.id, newPrice);
      }

      // Extend Order if needed
      if (existingOrder.remainingAmount < CONSTANTS.MARKET.MIN_ORDER_AMOUNT) {
        const extendAmount = CONSTANTS.MARKET.MAX_ORDER_AMOUNT - existingOrder.remainingAmount;
        const result = Game.market.extendOrder(existingOrder.id, extendAmount);
        this._handleOrderResult(result, "ExtendOrder", theMineralType, terminal.room, "sellRoomMineral");
      }
      return;
    }

    // Create new order
    const price = this.calcHighestSellingPrice(theMineralType, terminal.store[theMineralType]);
    const result = Game.market.createOrder({
      type: ORDER_SELL,
      resourceType: theMineralType,
      price: price,
      totalAmount: CONSTANTS.MARKET.MAX_ORDER_AMOUNT,
      roomName: terminal.room.name,
    });
    this._handleOrderResult(result, "CreateOrder", theMineralType, terminal.room, "sellRoomMineral");
  }

  sellRoomMineralOverflow() {
    if (!this._isTerminalActive()) {
      return null;
    }
    const {terminal} = this;
    if (!terminal.room.mineral) {
      return null;
    }
    const theMineralType = terminal.room.mineral.mineralType;

    if (terminal.store[theMineralType] <= CONSTANTS.MARKET.MAX_ORDER_AMOUNT) {
      return null;
    }

    const bestOrder = this.findBestBuyOrder(theMineralType, CONSTANTS.MARKET.ENERGY_PRICE, CONSTANTS.MARKET.PROFIT_THRESHOLD);
    if (!bestOrder) {
      Log.info(`No deals for ${global.resourceImg(theMineralType)} overflow found for room ${terminal.room}`, "sellRoomMineralOverflow");
      return null;
    }

    const result = Game.market.deal(bestOrder.id, bestOrder.amount, terminal.room.name);
    if (result === OK) {
      const revenue = (bestOrder.amount * bestOrder.price).toFixed(2);
      const energyCost = (bestOrder.fee * CONSTANTS.MARKET.ENERGY_PRICE).toFixed(2);
      Log.success(
        `${bestOrder.amount} of ${global.resourceImg(bestOrder.resourceType)} sold to market. 💲: ${revenue} - EnergyCost: ${energyCost}`,
        "sellRoomMineralOverflow",
      );
    } else {
      Log.info(`No deal because: ${global.getErrorString(result)}`, "sellRoomMineralOverflow");
    }
  }

  internalTrade() {
    if (!this._isTerminalActive()) {
      return;
    }

    const {terminal} = this;
    const roomsWithTerminal = _.filter(Game.rooms, (r) => r.terminal && r.terminal.my && r.terminal.isActive());

    // Pre-calculate helper array once (room-to-room transfer works without MarketCal)
    let sellableResources = [];
    if (typeof global.MarketCal !== "undefined") {
      const MarketCal = global.MarketCal;
      sellableResources = MarketCal.TIER_1_COMPOUNDS.concat(
        MarketCal.TIER_2_COMPOUNDS,
        MarketCal.TIER_3_COMPOUNDS,
        MarketCal.BASE_COMPOUNDS,
        MarketCal.COMPRESSED_RESOURCES,
      );
    }

    let cancelTrading = false;

    for (const resourceType in terminal.store) {
      if (cancelTrading) {
        break;
      }

      // Skip invalid resource types
      if (!resourceType || resourceType === "") {
        continue;
      }

      const amount = terminal.store[resourceType];
      if (amount === 0) {
        continue;
      }

      // Check if we should keep this resource
      // Use "all" to check storage + terminal together
      const totalAmount = terminal.room.getResourceAmount(resourceType, "all");
      const threshold = terminal.room.getRoomThreshold(resourceType, "storage");
      if (totalAmount < threshold) {
        continue;
      }

      // Calculate available amount for sending (total - threshold, but limited by terminal amount)
      const availableAmount = Math.min(totalAmount - threshold, amount);

      // Try to send to other rooms first
      for (const targetRoom of roomsWithTerminal) {
        if (targetRoom.terminal === terminal || cancelTrading) {
          continue;
        }

        // Check total amount in target room (storage + terminal)
        const resourceAmountInRoom = targetRoom.getResourceAmount(resourceType, "all");
        const needed = targetRoom.getRoomThreshold(resourceType, "storage") - resourceAmountInRoom;

        if (needed <= 0) {
          continue;
        }

        // Ensure only one terminal sends this resource to this room this tick
        const sentKey = `${resourceType}_${targetRoom.name}`;
        if (Memory.internalTradeSent && Memory.internalTradeSent[sentKey]) {
          continue;
        }

        // Send the minimum of: available amount, needed amount
        const sendAmount = Math.min(availableAmount, needed);

        if (sendAmount > 0) {
          const result = terminal.send(resourceType, sendAmount, targetRoom.name, "internal");
          if (result === OK) {
            if (!Memory.internalTradeSent) Memory.internalTradeSent = {};
            Memory.internalTradeSent[sentKey] = true;
            cancelTrading = true;
            Log.success(`${terminal.room} transfers ${sendAmount} of ${global.resourceImg(resourceType)} to ${targetRoom}`, "internalTrade");
          } else {
            Log.warn(`${terminal.room} failed to transfer ${sendAmount} of ${global.resourceImg(resourceType)} to ${targetRoom}: ${global.getErrorString(result)}`, "internalTrade");
          }
          break;
        }
      }

      // If no internal trade happened and resource is sellable, try market
      if (!cancelTrading && _.includes(sellableResources, resourceType)) {
        const order = this.findBestBuyOrder(resourceType);
        if (order) {
          // Use availableAmount instead of amount to respect threshold
          const dealAmount = Math.min(order.amount, availableAmount);
          if (dealAmount <= 0) {
            continue; // deal(0) returns ERR_INVALID_ARGS
          }
          const result = Game.market.deal(order.id, dealAmount, terminal.room.name);
          if (result === OK) {
            cancelTrading = true;
            Log.success(`${terminal.room} sells ${dealAmount} of ${global.resourceImg(resourceType)} for ${order.price}`, "internalTrade");
          } else {
            Log.warn(`${terminal.room} failed to sell ${dealAmount} of ${global.resourceImg(resourceType)} to market: ${global.getErrorString(result)}`, "internalTrade");
          }
        }
      }
    }
  }

  buyEnergyOrder() {
    if (!this._isTerminalValid() || !this.terminal.isActive()) {
      return null;
    }

    const {terminal} = this;
    const energyInTerminal = ResourceManager.getResourceAmount(terminal.room, RESOURCE_ENERGY, "terminal");
    const threshold = terminal.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
    // Only place buy order if we have at least that many credits (reuse threshold as min. credits heuristic)
    if (Game.market.credits < threshold) {
      Log.warn(`Credits (${Game.market.credits}) below minimum (${threshold}). Skipping energy buy.`, "buyEnergyOrder");
      return false;
    }

    const storageThreshold = terminal.room.getRoomThreshold(RESOURCE_ENERGY, "storage");
    const minEnergyNeeded = storageThreshold - CONSTANTS.RESOURCES.TERMINAL_ENERGY_BUFFER;

    if (energyInTerminal >= minEnergyNeeded) {
      return null;
    }

    const existingOrder = this._findExistingOrder("buy", RESOURCE_ENERGY, terminal.room.name);

    if (existingOrder) {
      const totalNeeded = storageThreshold - energyInTerminal;

      if (existingOrder.remainingAmount < totalNeeded) {
        const extendAmount = totalNeeded - existingOrder.remainingAmount;
        const result = Game.market.extendOrder(existingOrder.id, extendAmount);
        this._handleOrderResult(result, "ExtendOrder", RESOURCE_ENERGY, terminal.room, "buyEnergyOrder");
      }
      return;
    }

    // Create new order
    const result = Game.market.createOrder({
      type: ORDER_BUY,
      resourceType: RESOURCE_ENERGY,
      price: CONSTANTS.MARKET.ENERGY_PRICE,
      totalAmount: threshold,
      roomName: terminal.room.name,
    });
    this._handleOrderResult(result, "CreateOrder", RESOURCE_ENERGY, terminal.room, "buyEnergyOrder");
  }

  findBestSellOrder(resourceType) {
    const orders = Game.market.getAllOrders({
      type: ORDER_SELL,
      resourceType: resourceType,
    });
    return _.min(orders, "price");
  }

  /**
   * Finds the best buy order for a resource type
   * @param {string} resourceType - The resource type to find orders for
   * @param {number} [energyPrice] - Energy price for profit calculation (optional)
   * @param {number} [minProfit] - Minimum profit threshold (optional)
   * @returns {Object|null} Best order or null
   */
  findBestBuyOrder(resourceType, energyPrice, minProfit) {
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

    // Calculate profit with transaction costs (requires terminal for fee calculation)
    if (!this.terminal) {
      return null;
    }
    const {terminal} = this;
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
  }
}

module.exports = ControllerTerminal;

