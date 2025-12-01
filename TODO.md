# TODOs

## General

- [ ] Create global help function that prints all possible calls on console. Especially the visualizations.
- [ ] Test and implement new logistic system
- [ ] Check if all Structure Prototypes are used in the code and replace finds()
- [x] There are many functions that calcualte the resources in a room. Consolidate!
- [ ] Activate Powercreeps and code autorenew (and ops if needed) (Line 58)
- [ ] Powercreeps - Auto set Factory Level (move away from ControllerFactory.js)

## ControllerRoom.js

- [ ] Calculate free spaces around source (Line 953)

## _initGlobal.js

- [x] `getRoomThreshold` belongs in `_init.js` (Line 628) / Make clear what is _initGlobal and _init
- [x] Refactor FILL_LEVEL
- [x] Object.defineProperty(Creep.prototype, "energy") entfernen

## config.creeps.js

- [ ] Builder/Supporter calculation is not dynamic enough. Supporters have a long way. Usually there are too many builders. Take FreeSpaces into account (Line 29)
- [x] Miner - if idle - repair container (Line 36)
- [x] Miner - if link empty + container filled -> transfer to link (Line 37)
- [x] Defender - only build if no tower or boosted creeps enter room (Line 296)
- [ ] Supporter help rooms with RCL <= 3 (Line 302)

## main.js

- [x] Put warning message (bucket) in function

## ControllerSpawn.js

- [ ] `createCreep` - Calculate Move parts dynamically (Line 15)

## behavior.harvest.js

- [x] Only choose source with enough space around (Line 22)

## behavior.find_near_energy.js

- [x] Add a check if withdraw/pickup is successful (and delete target if not) (Line 62)

## ControllerLink.js

- [ ] Link should transport to most empty link OR make a better system for distributing energy to Controller OR Store (Line 27)