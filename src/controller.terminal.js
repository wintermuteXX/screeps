const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");
const ResourceManager = require("./service.resource");
const BASE_MINERALS_WITHOUT_ENERGY = require("./service.market").BASE_MINERALS_WITHOUT_ENERGY;

/**
 * Room terminal: energy buy orders, internal transfers, mineral sell/overflow.
 */
class ControllerTerminal {
  /**
   * @param {import("./controller.room")} rc
   */
  constructor(rc) {
    this.room = rc;
    this.terminal = rc.room.terminal;
  }

  /**
   * Runs terminal operations on their tick intervals.
   * @returns {void}
   */
  run() {
    if (!this.terminal) {
      return;
    }

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
  }

  // ---------------------------------------------------------------------------
  // Public operations
  // ---------------------------------------------------------------------------

  /**
   * Keep a buy order when terminal energy is below the storage operating buffer.
   * @returns {boolean|null|void}
   */
  buyEnergyOrder() {
    if (!this._isTerminalValid() || !this.terminal.isActive()) {
      return null;
    }

    const {terminal} = this;
    const room = terminal.room;
    const energyInTerminal = ResourceManager.getResourceAmount(room, RESOURCE_ENERGY, "terminal");
    const terminalThreshold = room.getRoomThreshold(RESOURCE_ENERGY, "terminal");

    if (Game.market.credits < terminalThreshold) {
      Log.warn(
        `Credits (${Game.market.credits}) below minimum (${terminalThreshold}). Skipping energy buy.`,
        "buyEnergyOrder",
      );
      return false;
    }

    const storageThreshold = room.getRoomThreshold(RESOURCE_ENERGY, "storage");
    const minEnergyNeeded = storageThreshold - CONSTANTS.RESOURCES.TERMINAL_ENERGY_BUFFER;
    if (energyInTerminal >= minEnergyNeeded) {
      return null;
    }

    const existingOrder = this._findExistingOrder(ORDER_BUY, RESOURCE_ENERGY, room.name);
    if (existingOrder) {
      const totalNeeded = storageThreshold - energyInTerminal;
      if (existingOrder.remainingAmount < totalNeeded) {
        const extendAmount = totalNeeded - existingOrder.remainingAmount;
        const result = Game.market.extendOrder(existingOrder.id, extendAmount);
        this._handleOrderResult(result, "ExtendOrder", RESOURCE_ENERGY, room, "buyEnergyOrder");
      }
      return;
    }

    const result = Game.market.createOrder({
      type: ORDER_BUY,
      resourceType: RESOURCE_ENERGY,
      price: CONSTANTS.MARKET.ENERGY_PRICE,
      totalAmount: terminalThreshold,
      roomName: room.name,
    });
    this._handleOrderResult(result, "CreateOrder", RESOURCE_ENERGY, room, "buyEnergyOrder");
  }

  /**
   * Move surplus resources to allied rooms (and optionally sell compounds).
   * Energy: storage ≥ MAX_ENERGY_THRESHOLD and terminal above operating fill.
   * Minerals: room stock above storage fill level.
   * @returns {void}
   */
  internalTrade() {
    if (!this._isTerminalActive()) {
      return;
    }

    const {terminal} = this;
    const allyRooms = this._getRoomsWithActiveTerminal();
    const tradeState = this._getInternalTradeState();
    const sellableResources = this._getSellableResources();

    for (const resourceType of Object.keys(terminal.store)) {
      const terminalAmount = terminal.store[resourceType] || 0;
      if (terminalAmount <= 0) {
        continue;
      }

      let availableAmount = this._getInternalTradeAvailable(resourceType, terminalAmount);
      if (availableAmount <= 0) {
        continue;
      }

      if (this._tryInternalSend(resourceType, availableAmount, allyRooms, tradeState)) {
        return;
      }

      if (sellableResources.indexOf(resourceType) !== -1) {
        if (this._tryMarketSell(resourceType, availableAmount)) {
          return;
        }
      }
    }
  }

  /**
   * Maintain a sell order for this room's mined mineral when empire stock is high enough.
   * @returns {void|null}
   */
  sellRoomMineral() {
    if (!this._isTerminalValid()) {
      return null;
    }

    const mineralType = this._getRoomMineralType();
    if (!mineralType) {
      return null;
    }

    const {terminal} = this;
    const globalAmount = global.globalResourcesAmount(mineralType);
    const threshold = global.numberOfTerminals() * global.getRoomThreshold(mineralType, "all");
    if (globalAmount < threshold) {
      return null;
    }

    const existingOrder = this._findExistingOrder(ORDER_SELL, mineralType, terminal.room.name);
    const stock = terminal.store[mineralType] || 0;

    if (existingOrder) {
      const newPrice = this.calcHighestSellingPrice(mineralType, stock);
      if (Math.abs(existingOrder.price - newPrice) > 0.01) {
        Log.info(
          `${terminal.room} changed sell price from ${existingOrder.price} to ${newPrice} for ${global.resourceImg(mineralType)}`,
          "sellRoomMineral",
        );
        Game.market.changeOrderPrice(existingOrder.id, newPrice);
      }

      if (existingOrder.remainingAmount < CONSTANTS.MARKET.MIN_ORDER_AMOUNT) {
        const extendAmount = CONSTANTS.MARKET.MAX_ORDER_AMOUNT - existingOrder.remainingAmount;
        const result = Game.market.extendOrder(existingOrder.id, extendAmount);
        this._handleOrderResult(result, "ExtendOrder", mineralType, terminal.room, "sellRoomMineral");
      }
      return;
    }

    const result = Game.market.createOrder({
      type: ORDER_SELL,
      resourceType: mineralType,
      price: this.calcHighestSellingPrice(mineralType, stock),
      totalAmount: CONSTANTS.MARKET.MAX_ORDER_AMOUNT,
      roomName: terminal.room.name,
    });
    this._handleOrderResult(result, "CreateOrder", mineralType, terminal.room, "sellRoomMineral");
  }

  /**
   * Instant-sell overflow of the room mineral above MAX_ORDER_AMOUNT.
   * @returns {void|null}
   */
  sellRoomMineralOverflow() {
    if (!this._isTerminalActive()) {
      return null;
    }

    const mineralType = this._getRoomMineralType();
    if (!mineralType) {
      return null;
    }

    const {terminal} = this;
    const stock = terminal.store[mineralType] || 0;
    if (stock <= CONSTANTS.MARKET.MAX_ORDER_AMOUNT) {
      return null;
    }

    const bestOrder = this.findBestBuyOrder(
      mineralType,
      CONSTANTS.MARKET.ENERGY_PRICE,
      CONSTANTS.MARKET.PROFIT_THRESHOLD,
    );
    if (!bestOrder) {
      Log.info(
        `No deals for ${global.resourceImg(mineralType)} overflow found for room ${terminal.room}`,
        "sellRoomMineralOverflow",
      );
      return null;
    }

    const dealAmount = Math.min(bestOrder.amount || bestOrder.remainingAmount, stock);
    if (dealAmount <= 0) {
      return null;
    }

    const result = Game.market.deal(bestOrder.id, dealAmount, terminal.room.name);
    if (result === OK) {
      const revenue = (dealAmount * bestOrder.price).toFixed(2);
      const energyCost = ((bestOrder.fee || 0) * CONSTANTS.MARKET.ENERGY_PRICE).toFixed(2);
      Log.success(
        `${dealAmount} of ${global.resourceImg(mineralType)} sold to market. 💲: ${revenue} - EnergyCost: ${energyCost}`,
        "sellRoomMineralOverflow",
      );
    } else {
      Log.info(`No deal because: ${global.getErrorString(result)}`, "sellRoomMineralOverflow");
    }
  }

  /**
   * Buy empire-short minerals from the market (currently unused from run()).
   * @returns {void|null}
   */
  buyMissingMinerals() {
    if (!this._isTerminalValid()) {
      return null;
    }

    const {terminal} = this;
    const minerals = _.shuffle(BASE_MINERALS_WITHOUT_ENERGY);

    for (const mineralType of minerals) {
      const globalAmount = global.globalResourcesAmount(mineralType);
      const threshold = global.numberOfTerminals() * global.getRoomThreshold(mineralType, "all");
      if (globalAmount >= threshold) {
        continue;
      }

      const bestOrder = this.findBestSellOrder(mineralType);
      if (!bestOrder) {
        continue;
      }

      const amount = Math.min(bestOrder.amount, threshold - globalAmount);
      const result = Game.market.deal(bestOrder.id, amount, terminal.room.name);
      this._handleOrderResult(result, "BuyOrder", mineralType, terminal.room, "buyMissingMinerals");
      break;
    }
  }

  /**
   * @param {string} resourceType
   * @param {number} [amount=0]
   * @returns {number|null}
   */
  calcHighestSellingPrice(resourceType, amount = 0) {
    if (!resourceType) {
      return null;
    }

    const {MARKET} = CONSTANTS;
    let modify = MARKET.MOD_SELL_MULTIPLIER_4;
    if (amount < MARKET.MOD_SELL_AMOUNT_1) {
      modify = MARKET.MOD_SELL_MULTIPLIER_1;
    } else if (amount < MARKET.MOD_SELL_AMOUNT_2) {
      modify = MARKET.MOD_SELL_MULTIPLIER_2;
    } else if (amount < MARKET.MOD_SELL_AMOUNT_3) {
      modify = MARKET.MOD_SELL_MULTIPLIER_3;
    }

    const avg = this.getAvgPrice(resourceType, 2, 1) * modify;
    return Math.max(avg, MARKET.MIN_SELL_PRICE);
  }

  /**
   * Average market price from history.
   * @param {string} resourceType
   * @param {number} [days=2] - Number of history entries to average
   * @param {number} [skipToday=0] - History index offset
   * @returns {number}
   */
  getAvgPrice(resourceType, days = 2, skipToday = 0) {
    const history = Game.market.getHistory(resourceType);
    if (!history || history.length === 0) {
      return 0;
    }

    const countWanted = Math.max(1, days);
    let totalPrice = 0;
    let count = 0;
    for (let i = skipToday; i < history.length && count < countWanted; i += 1) {
      if (history[i] && typeof history[i].avgPrice === "number") {
        totalPrice += history[i].avgPrice;
        count += 1;
      }
    }
    return count > 0 ? totalPrice / count : 0;
  }

  /**
   * @param {string} resourceType
   * @returns {Order|null}
   */
  findBestSellOrder(resourceType) {
    const orders = Game.market.getAllOrders({
      type: ORDER_SELL,
      resourceType,
    });
    if (!orders || orders.length === 0) {
      return null;
    }
    return _.min(orders, "price");
  }

  /**
   * @param {string} resourceType
   * @param {number} [energyPrice] - When set with minProfit, scores by net profit
   * @param {number} [minProfit]
   * @returns {Object|null}
   */
  findBestBuyOrder(resourceType, energyPrice, minProfit) {
    const orders = Game.market.getAllOrders({
      type: ORDER_BUY,
      resourceType,
    });

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

    if (!this.terminal) {
      return null;
    }

    const fromRoom = this.terminal.room.name;
    const scored = [];
    for (const order of orders) {
      if (order.remainingAmount <= 0) {
        continue;
      }
      const amount = order.remainingAmount;
      let fee = 0;
      let profit = order.price;
      if (order.roomName) {
        fee = Game.market.calcTransactionCost(amount, fromRoom, order.roomName);
        profit = order.price - (fee * energyPrice) / amount;
      }
      if (profit > minProfit) {
        scored.push({
          id: order.id,
          resourceType: order.resourceType,
          price: order.price,
          remainingAmount: order.remainingAmount,
          roomName: order.roomName,
          fee,
          profit,
          amount,
        });
      }
    }

    if (scored.length === 0) {
      return null;
    }
    return _.max(scored, "profit");
  }

  // ---------------------------------------------------------------------------
  // Internal trade helpers
  // ---------------------------------------------------------------------------

  /**
   * @param {string} resourceType
   * @param {number} availableAmount
   * @param {Room[]} allyRooms
   * @param {{ reserved: Object<string, number> }} tradeState
   * @returns {boolean} True if a send was attempted (success or fail ends the tick op)
   */
  _tryInternalSend(resourceType, availableAmount, allyRooms, tradeState) {
    const {terminal} = this;

    for (const targetRoom of allyRooms) {
      if (targetRoom.terminal === terminal) {
        continue;
      }

      const reserveKey = `${targetRoom.name}:${resourceType}`;
      const alreadyReserved = tradeState.reserved[reserveKey] || 0;
      const needed = this._getInternalTradeNeeded(targetRoom, resourceType, alreadyReserved);
      if (needed <= 0) {
        continue;
      }

      let sendAmount = Math.min(availableAmount, needed);
      sendAmount = this._clampSendForEnergyFee(resourceType, sendAmount, targetRoom.name);
      if (sendAmount <= 0) {
        continue;
      }

      const result = terminal.send(resourceType, sendAmount, targetRoom.name, "internal");
      if (result === OK) {
        tradeState.reserved[reserveKey] = alreadyReserved + sendAmount;
        Log.success(
          `${terminal.room} transfers ${sendAmount} of ${global.resourceImg(resourceType)} to ${targetRoom}`,
          "internalTrade",
        );
      } else {
        Log.warn(
          `${terminal.room} failed to transfer ${sendAmount} of ${global.resourceImg(resourceType)} to ${targetRoom}: ${global.getErrorString(result)}`,
          "internalTrade",
        );
      }
      return true;
    }
    return false;
  }

  /**
   * @param {string} resourceType
   * @param {number} availableAmount
   * @returns {boolean}
   */
  _tryMarketSell(resourceType, availableAmount) {
    const order = this.findBestBuyOrder(resourceType);
    if (!order) {
      return false;
    }

    const dealAmount = Math.min(order.remainingAmount || order.amount || 0, availableAmount);
    if (dealAmount <= 0) {
      return false;
    }

    const result = Game.market.deal(order.id, dealAmount, this.terminal.room.name);
    if (result === OK) {
      Log.success(
        `${this.terminal.room} sells ${dealAmount} of ${global.resourceImg(resourceType)} for ${order.price}`,
        "internalTrade",
      );
      return true;
    }

    Log.warn(
      `${this.terminal.room} failed to sell ${dealAmount} of ${global.resourceImg(resourceType)} to market: ${global.getErrorString(result)}`,
      "internalTrade",
    );
    return true;
  }

  /**
   * @returns {{ reserved: Object<string, number> }}
   */
  _getInternalTradeState() {
    if (!global._internalTradeState || global._internalTradeTick !== Game.time) {
      global._internalTradeTick = Game.time;
      global._internalTradeState = { reserved: {} };
    }
    return global._internalTradeState;
  }

  /**
   * Energy: storage full (≥ MAX) and terminal above operating fill → send terminal surplus.
   * Minerals: room stock above storage fill → send terminal share of surplus.
   * @param {string} resourceType
   * @param {number} terminalAmount
   * @returns {number}
   */
  _getInternalTradeAvailable(resourceType, terminalAmount) {
    const {room} = this.terminal;

    if (resourceType === RESOURCE_ENERGY) {
      const storageEnergy = ResourceManager.getResourceAmount(room, RESOURCE_ENERGY, "storage");
      if (storageEnergy < CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD) {
        return 0;
      }
      const terminalKeep = room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
      if (terminalAmount <= terminalKeep) {
        return 0;
      }
      return terminalAmount - terminalKeep;
    }

    const totalAmount = room.getResourceAmount(resourceType, "all");
    const threshold = room.getRoomThreshold(resourceType, "storage");
    if (totalAmount <= threshold) {
      return 0;
    }
    return Math.min(totalAmount - threshold, terminalAmount);
  }

  /**
   * @param {Room} targetRoom
   * @param {string} resourceType
   * @param {number} alreadyReserved
   * @returns {number}
   */
  _getInternalTradeNeeded(targetRoom, resourceType, alreadyReserved) {
    if (resourceType === RESOURCE_ENERGY) {
      const storageEnergy = ResourceManager.getResourceAmount(targetRoom, RESOURCE_ENERGY, "storage");
      return CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD - storageEnergy - alreadyReserved;
    }

    const inRoom = targetRoom.getResourceAmount(resourceType, "all");
    const threshold = targetRoom.getRoomThreshold(resourceType, "storage");
    return threshold - inRoom - alreadyReserved;
  }

  /**
   * @param {string} resourceType
   * @param {number} sendAmount
   * @param {string} toRoomName
   * @returns {number}
   */
  _clampSendForEnergyFee(resourceType, sendAmount, toRoomName) {
    if (sendAmount <= 0) {
      return 0;
    }

    const energyInTerminal = this.terminal.store[RESOURCE_ENERGY] || 0;
    const from = this.terminal.room.name;
    let amount = sendAmount;

    while (amount > 0) {
      const fee = Game.market.calcTransactionCost(amount, from, toRoomName);
      if (resourceType === RESOURCE_ENERGY) {
        if (energyInTerminal >= amount + fee) {
          return amount;
        }
      } else if (energyInTerminal >= fee) {
        return amount;
      }
      amount = Math.floor(amount * 0.9);
    }
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  /**
   * @returns {boolean}
   */
  _isTerminalValid() {
    return !!(this.terminal && this.terminal.my);
  }

  /**
   * @returns {boolean}
   */
  _isTerminalActive() {
    return !!(this.terminal && this.terminal.my && this.terminal.isActive() && this.terminal.cooldown === 0);
  }

  /**
   * @returns {string|null}
   */
  _getRoomMineralType() {
    const mineral = this.terminal && this.terminal.room && this.terminal.room.mineral;
    return mineral ? mineral.mineralType : null;
  }

  /**
   * @returns {Room[]}
   */
  _getRoomsWithActiveTerminal() {
    const rooms = [];
    for (const name in Game.rooms) {
      const room = Game.rooms[name];
      if (room.terminal && room.terminal.my && room.terminal.isActive()) {
        rooms.push(room);
      }
    }
    return rooms;
  }

  /**
   * @returns {string[]}
   */
  _getSellableResources() {
    if (typeof global.MarketCal === "undefined") {
      return [];
    }
    const {MarketCal} = global;
    return MarketCal.TIER_1_COMPOUNDS.concat(
      MarketCal.TIER_2_COMPOUNDS,
      MarketCal.TIER_3_COMPOUNDS,
      MarketCal.BASE_COMPOUNDS,
      MarketCal.COMPRESSED_RESOURCES,
    );
  }

  /**
   * @param {string} type
   * @param {string} resourceType
   * @param {string} roomName
   * @returns {Order|null}
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

  /**
   * @param {number} result
   * @param {string} action
   * @param {string} resourceType
   * @param {Room} room
   * @param {string} context
   * @returns {boolean}
   */
  _handleOrderResult(result, action, resourceType, room, context) {
    if (result === OK) {
      Log.success(`${action} in room ${room} for ${global.resourceImg(resourceType)} was successful`, context);
      return true;
    }
    Log.warn(
      `Result for ${action} ${global.resourceImg(resourceType)} in room ${room}: ${global.getErrorString(result)}`,
      context,
    );
    return false;
  }
}

module.exports = ControllerTerminal;
