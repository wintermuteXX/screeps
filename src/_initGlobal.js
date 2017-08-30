function initGlobal(g) {

  g.killAll = function () {
    for (var c in Game.creeps) {
      Game.creeps[c].suicide();
    }
  };


  g.getBestOrder = function () {
    let minAmount = 1000;
    let orders = Game.market.getAllOrders().filter(order =>
      order.type === ORDER_BUY // Only check sell orders
      &&
      order.resourceType !== RESOURCE_ENERGY // Don't sell energy
      &&
      order.remainingAmount > minAmount // Only look at orders with 1000+ units
      &&
      this.store[order.resourceType] >= 1000); // terminal must have at least 1k of this resource
    // Compute, map and filter on profit
    orders = orders.map((order) => {
      let amount = Math.min(order.remainingAmount, this.store[order.resourceType]);
      let fee = Game.market.calcTransactionCost(amount, this.room.name, order.roomName);
      let profit = order.price + (fee * energyPrice / amount);
      return _.merge(order, {
        fee,
        profit,
        amount
      });
    });
    orders = orders.filter(order => order.profit > cfg.get(`market.minProfit.${order.resourceType}`));
    // Get best order and deal
    if (orders.length === 0) return notif.debug('Found no deal in buy orders.', this.room.name);
    let bestOrder = _.min(orders, 'profit');
    return this.deal(bestOrder);
  };

  /**
   * Intervals
   */

  g._intervals = {
    'checkPopulation': 10,
    'checkConstructions': 100,
    'checkLinks': 5,
    'checkDroppedEnergy': 10,
    'StoreLevel4': 2000,
    'StoreLevel5': 5000,
    'StoreLevel6': 15000,
    'StoreLevel7': 50000,
    'StoreLevel8': 100000,
    'repairTower': 8
  };

  g.getInterval = function (key) {
    if (key && this._intervals[key]) {
      return this._intervals[key];
    }
    return 0;
  };


  /**
   * Behaviors
   */

  g._behaviors = {};

  g.getBehavior = function (key) {
    return this._registerBehavior(key);
  };

  g._registerBehavior = function (n) {
    if (!n) return null;

    if (!g._behaviors[n]) {
      try {
        g._behaviors[n] = require("behavior." + n);
      } catch (e) {
        console.log("Error loading behavior '" + n + "'", e);
        g._behaviors[n] = null;
      }
    }

    return g._behaviors[n] || null;
  };

  /**
   * Creeps
   */
  g._creeps = require("config.creeps");

  g.getCreepConfig = function (role) {
    if (role && this._creeps[role]) {
      return this._creeps[role];
    }
    return null;
  };

  g.getCreepsConfig = function () {
    return this._creeps;
  };

  g.getCreepRoles = function () {
    var creepsConfig = this.creeps;
    return _.sortBy(Object.keys(this._creeps), function (r) {
      return global._creeps[r].priority || 999;
    });
  };

}

module.exports = initGlobal;