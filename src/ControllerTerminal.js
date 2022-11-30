const Log = require("./Log");
const { __esModule } = require("./Traveler");

function ControllerTerminal(rc) {
  this.room = rc;
  this.terminal = rc.room.terminal;
}
ControllerTerminal.prototype.calcHighestSellingPrice = function (theResourceType, theAmount = 0) {
  if (theResourceType == undefined || theResourceType == null) {
    return null;
  }

  let modify;

  if (theAmount < global.modSellAmount1) {
    modify = global.modSellMultiplier1;
  } else if (theAmount < global.modSellAmount2) {
    modify = global.modSellMultiplier2;
  } else if (theAmount < global.modSellAmount3) {
    modify = global.modSellMultiplier3;
  } else {
    modify = global.modSellMultiplier4;
  }

  let maxSellPrice = this.getAvgPrice(theResourceType, 2, 1);
  Log.info(`${this.terminal} returns ${maxSellPrice} * ${modify} = ${maxSellPrice * modify} for resource ${theResourceType}`, "calcHighestSellingPrice");
  maxSellPrice = (maxSellPrice * modify).toFixed(3);

  return Math.max(maxSellPrice, global.minSellPrice);
};
ControllerTerminal.prototype.getAvgPrice = function (resourceType, days = 2, skipToday = 0) {
  // Get the market history for the specified resourceType
  const history = Game.market.getHistory(resourceType);
  // Init the totalPrice
  let totalPrice = 0;
  // Iterate through each index less than days
  for (let index = skipToday; index <= days; index += 1) totalPrice += history[index].avgPrice;
  // Inform the totalPrice divided by the days
  return totalPrice / days;
};
ControllerTerminal.prototype.sellRoomMineral = function () {
  let terminal = this.terminal;
  if (!terminal) {
    return null;
  }
  let theMineralType = terminal.room.mineral.mineralType;
  let orderExists = false;

  /*
  removed because also inactive orders should change price
   
  if (terminal.store[theMineralType] === (0 || undefined)) {
    return null;
  }

  if (terminal.store[theMineralType] < 10000) {
    return null;
  }
*/
  if (global.globalResourcesAmount(theMineralType) < global.numberOfTerminals() * global.getRoomThreshold(theMineralType, "all")) {
    return null;
  }

  for (let id in Game.market.orders) {
    let order = Game.market.orders[id];
    if (order.type === "sell" && order.resourceType === theMineralType && order.roomName == terminal.room.name) {
      Log.debug(`${order.roomName} found an existing sell order for ${global.resourceImg(theMineralType)}`, "sellRoomMineral");
      orderExists = true;
      // Adjust Price
      let thePrice = this.calcHighestSellingPrice(theMineralType, terminal.store[theMineralType]);
      if (order.price !== thePrice && Math.abs(order.price - thePrice) > 0.01) {
        Log.info(`${order.roomName} changed sell price from ${order.price} to ${thePrice} for ${global.resourceImg(theMineralType)}`, "sellRoomMineral");
        Game.market.changeOrderPrice(order.id, thePrice);
      }
      // Extend Order
      if (order.remainingAmount < global.minOrderAmount) {
        let result = Game.market.extendOrder(order.id, global.maxOrderAmount - order.remainingAmount);
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
  if (orderExists === false) {
    let result2 = Game.market.createOrder(ORDER_SELL, theMineralType, this.calcHighestSellingPrice(theMineralType, terminal.store[theMineralType]), global.maxOrderAmount, terminal.room.name);
    switch (result2) {
      case OK:
        Log.success(`Created sell order in room ${terminal.room} for ${global.resourceImg(theMineralType)} was successful`, "sellRoomMineral");
        break;

      default:
        Log.warn(`Result for create sell Order for ${global.resourceImg(theMineralType)} in room ${terminal.room}: ${result2}`, "sellRoomMineral");
    }
  }
};
ControllerTerminal.prototype.sellRoomMineralOverflow = function () {
  let terminal = this.terminal;
  if (!terminal) {
    return null;
  }
  let theMineralType = terminal.room.mineral.mineralType;

  if (terminal && terminal.cooldown === 0 && terminal.store[theMineralType] > global.maxOrderAmount) {
    let bestOrder = this.findBestBuyOrder(theMineralType, global.energyPrice, global.theProfit);
    if (bestOrder !== null) {
      let result = Game.market.deal(bestOrder.id, bestOrder.amount, terminal.room.name);
      if (result == OK) {
        Log.success(
          `${bestOrder.amount} of ${global.resourceImg(bestOrder.resourceType)} sold to market. 💲: ${(bestOrder.amount * bestOrder.price).toFixed(2)} - EnergyCost: ${(
            bestOrder.fee * global.energyPrice
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
  let terminal = this.terminal;
  if (!terminal) {
    return null;
  }
  if (terminal.store[RESOURCE_ENERGY] > global.getRoomThreshold(RESOURCE_ENERGY, "terminal") + 20000) {
    Log.success(`Increased the wallHits in room ${terminal.room.name}`);
    terminal.room.memory.wallHits += 5000;
  }
};
ControllerTerminal.prototype.internalTrade = function () {
  let terminal = this.terminal;
  let cancelTrading = false;
  const self = this;

  if (!terminal || !terminal.isActive() || terminal.cooldown !== 0) return;

  _.each(terminal.store, function (amount, resourceType) {
    if (cancelTrading || amount === 0 || terminal.room.getResourceAmount(resourceType, "storage") < global.getRoomThreshold(resourceType, "storage")) return;

    let roomsWithTerminal = _.filter(Game.rooms, (r) => {
      return r.terminal && r.terminal.my && r.terminal.isActive();
    });

    for (let r in roomsWithTerminal) {
      let targetroom = roomsWithTerminal[r];
      // BUG internalTrade will send xxx Resources from every terminal at the same time

      if ((targetroom.terminal && terminal == targetroom.terminal) || cancelTrading) {
        continue;
      }
      let resourceAmountInRoom = targetroom.getResourceAmount(resourceType, "storage");
      // The desired amount of resource to reach the threshold
      let needed = global.getRoomThreshold(resourceType, "storage") - resourceAmountInRoom;
      if (needed > 0) {
        // Amount of resource that will be send
        if (resourceType == RESOURCE_ENERGY) {
          var sendAmount = Math.min(terminal.room.storage.store[RESOURCE_ENERGY] - global.getRoomThreshold(resourceType, "storage"), needed);
        } else {
          var sendAmount = Math.min(amount, needed);
        }

        if (sendAmount > 0) {
          let result = terminal.send(resourceType, sendAmount, targetroom.name, "internal");

          switch (result) {
            case OK:
              cancelTrading = true;
              Log.success(`${terminal.room} transfers ${sendAmount} of ${global.resourceImg(resourceType)} to ${targetroom}`, "internalTrade");
              break;

            default:
              Log.warn(`${terminal} has unknown result in ${terminal.room} tries to transfer to (${targetroom}): ${result}`, "internalTrade");
          }
        }
      }
    }
    let helperArray = MarketCal.TIER_1_COMPOUNDS.concat(MarketCal.TIER_2_COMPOUNDS, MarketCal.TIER_3_COMPOUNDS, MarketCal.BASE_COMPOUNDS, MarketCal.COMPRESSED_RESOURCES);
    if (!cancelTrading && _.includes(helperArray, resourceType)) {
      // BUG Mindestverkaufspreis setzen
      let order = self.findBestBuyOrder2(resourceType);
      if (order) {
        let result2 = Game.market.deal(order.id, _.min([order.amount, amount]), terminal.room.name);
        switch (result2) {
          case OK:
            cancelTrading = true;
            Log.success(`${terminal.room} sells ${order.amount} of ${global.resourceImg(resourceType)} for ${order.price}`, "internalTrade");
            break;
          default:
            Log.warn(`${terminal} has unknown result in ${terminal.room} tries to sell ${order.amount} ${global.resourceImg(resourceType)} to market: ${result2}`, "internalTrade");
        }
      }
    }
  });
};
ControllerTerminal.prototype.buyEnergyOrder = function () {
  let ter = this.terminal;
  if (!ter || !ter.isActive() || !ter.my) {
    return null;
  }
  let energyInTerminal = ter.store[RESOURCE_ENERGY];
  let orderExists = false;

  if (Game.market.credits < global.getRoomThreshold(RESOURCE_ENERGY, "terminal")) {
    Log.warn(`There are less than ${global.getRoomThreshold(RESOURCE_ENERGY, "terminal")} credits available. Skipping...`, "buyEnergyOrder");
    return false;
  }
  if (energyInTerminal < global.getRoomThreshold(RESOURCE_ENERGY, "storage") - 5000) {
    Log.debug(`Less than ${global.getRoomThreshold(RESOURCE_ENERGY, "terminal")} energy in Terminal. We should check orders for room ${ter.room.name}`, "buyEnergyOrder");

    for (let id in Game.market.orders) {
      let order = Game.market.orders[id];
      if (order.type === "buy" && order.resourceType === "energy" && order.roomName == ter.room.name) {
        Log.debug(`Found an existing buy energy order for room ${order.roomName}`, "buyEnergyOrder");
        orderExists = true;
        if (order.remainingAmount + energyInTerminal < global.getRoomThreshold(RESOURCE_ENERGY, "storage")) {
          Log.debug(
            `Found an existing buy energy order for room ${order.roomName} with remainingAmount ${order.remainingAmount} so I try to extend order by ${global.getRoomThreshold(
              RESOURCE_ENERGY,
              "terminal"
            )} - ${order.remainingAmount} - ${energyInTerminal}`,
            "buyEnergyOrder"
          );

          let result = Game.market.extendOrder(order.id, global.getRoomThreshold(RESOURCE_ENERGY, "storage") - order.remainingAmount - energyInTerminal);
          switch (result) {
            case OK:
              Log.success(`ExtendOrder in room ${ter.room} was successful`, "buyEnergyOrder");
              break;

            default:
              Log.warn(`Result for extendOrder in room ${ter.room}: ${result}`, "buyEnergyOrder");
          }
          break;
        }
      }
    }
    if (orderExists === false) {
      let result2 = Game.market.createOrder(ORDER_BUY, RESOURCE_ENERGY, global.energyPrice, global.getRoomThreshold(RESOURCE_ENERGY, "terminal"), ter.room.name);
      switch (result2) {
        case OK:
          Log.success(`Created order in room ${ter.room} for ${global.getRoomThreshold(RESOURCE_ENERGY, "terminal")} energy was successful`, "buyEnergyOrder");
          break;

        default:
          Log.warn(`Result for createOrder in room ${ter.room}: ${result2}`, "buyEnergyOrder");
      }
    }
  }
};
ControllerTerminal.prototype.findBestBuyOrder2 = function (theMineralType) {
  let orders = Game.market.getAllOrders({
    type: ORDER_BUY,
    resourceType: theMineralType,
  });

  let highestGain = 0;
  let bestOrder;
  for (let order of orders) {
    if (order.remainingAmount > 0) {
      // OPTIMIZE take transactionCost with actual Energy price in account
      let gain = order.price;
      if (gain > highestGain) {
        highestGain = gain;
        bestOrder = order;
      }
    }
  }
  return bestOrder;
};
ControllerTerminal.prototype.findBestBuyOrder = function (theMineralType, energyPrice, theProfit) {
  let terminal = this.terminal;
  let orders = Game.market.getAllOrders().filter(function (order) {
    return order.type === ORDER_BUY && order.resourceType === theMineralType;
  });

  orders = orders.map(function (order) {
    let amount = order.remainingAmount;
    let profit = 0;
    if (order.roomName) {
      var fee = Game.market.calcTransactionCost(amount, terminal.room.name, order.roomName);
      profit = order.price + (fee * energyPrice) / amount;
    }

    return _.merge(order, {
      fee: fee,
      profit: profit,
      amount: amount,
    });
  });
  orders = orders.filter(function (order) {
    return order.profit > theProfit;
  });
  if (orders.length === 0) return null;
  let bestOrder = _.max(orders, "profit");
  return bestOrder;
};

module.exports = ControllerTerminal;
