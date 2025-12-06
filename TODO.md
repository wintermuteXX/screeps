# TODOs

## General

- [ ] Activate Powercreeps and code autorenew (and ops if needed) (Line 58)
- [ ] Powercreeps - Auto set Factory Level (move away from ControllerFactory.js)
- [ ] Consolidate Transport Behavior
- [ ] Wall/Rampart Building
- [ ] Roads to Sources/Controller
- [ ] Remote Mining

## New Room
- [ ] Check "Conquer new room behavior"
- [ ] Supporter help rooms with RCL <= 3 (Line 302)

## ControllerSpawn.js

- [ ] `createCreep` - Calculate Move parts dynamically (Line 15)
- [ ] Builder/Supporter calculation is not dynamic enough. Supporters have a long way. Usually there are too many builders. Take FreeSpaces into account (Line 29)

## Harvesting
- [x] Creep.prototype.getHarvestPowerPerTick - Calculate the real value of WORK parts even if they are boosted
- [x] Source.prototype.canHarvestSource. How many workparts are already harvesting, how many creeps/freeTiles, consider Boosted parts. How many energy will be available after I arrive. Is there a stationary miner with 5 work parts?
- [ ]  Move between Sources if possible
- [ ] Creep.spaw.harvester only if 1 miner can not mine whole room.
- [ ] Multiple harvester for low level RCL if enough space around
- [ ] Harvest Mulitiple Rooms 
- [ ] Boosting?

## Transport Logistic
