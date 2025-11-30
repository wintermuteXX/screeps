# TODOs

## ControllerRoom.js

- [ ] `getCreeps` needs to be better. Should calculate if more amount is needed... (Line 146)
- [ ] Calculate free spaces around source (Line 953)
- [ ] `RESOURCES.LAB_REACTION_MIN` should be dynamic based on number of labs, or complete new system (Line 983)

## _initGlobal.js

- [ ] `getRoomThreshold` belongs in `_init.js` (Line 628)

## config.creeps.js

- [ ] Builder/Supporter calculation is not dynamic enough. Supporters have a long way. Usually there are too many builders. Take FreeSpaces into account (Line 29)
- [x] Miner - if idle - repair container (Line 36)
- [x] Miner - if link empty + container filled -> transfer to link (Line 37)
- [ ] Defender - only build if no tower or boosted creeps enter room (Line 296)
- [ ] Supporter help rooms with RCL <= 3 (Line 302)

## main.js

- [ ] (LONGTERM) Activate Powercreeps and code autorenew (and ops if needed) (Line 58)

## ControllerSpawn.js

- [ ] `createCreep` - Calculate Move parts dynamically (Line 15)

## behavior.harvest.js

- [ ] Only choose source with enough space around (Line 22)

## ControllerTower.js

- [ ] Create parameter to repair/upgrade even if `needsRepair` is not true (Line 16)

## behavior.find_near_energy.js

- [ ] Add a check if withdraw/pickup is successful (and delete target if not) (Line 62)

## ControllerLink.js

- [ ] Link should transport to most empty link OR make a better system for distributing energy to Controller OR Store (Line 27)

