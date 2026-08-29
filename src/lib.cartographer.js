'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const config = {
    DEFAULT_MOVE_OPTS: {
        avoidCreeps: false,
        avoidObstacleStructures: true,
        avoidSourceKeepers: true,
        keepTargetInRoom: true,
        repathIfStuck: 3,
        roadCost: 1,
        plainCost: 2,
        swampCost: 10,
        priority: 1,
        defaultRoomCost: 2,
        highwayRoomCost: 1,
        sourceKeeperRoomCost: 2,
        maxRooms: 64,
        maxOps: 100000,
        maxOpsPerRoom: 2000
    },
    DEFAULT_VISUALIZE_OPTS: {
        fill: 'transparent',
        stroke: '#fff',
        lineStyle: 'dashed',
        strokeWidth: 0.15,
        opacity: 0.1
    },
    MEMORY_ROOT: 'cartographer',
    MEMORY_CACHE_PATH: '_cg',
    MEMORY_CACHE_EXPIRATION_PATH: '_cge',
    MEMORY_PORTAL_PATH: '_cgp'
};

/**
 * Nest cartographer keys under Memory.cartographer and migrate legacy top-level keys.
 */
function cartographerMemory() {
    Memory[config.MEMORY_ROOT] ??= {};
    const root = Memory[config.MEMORY_ROOT];
    for (const key of [config.MEMORY_CACHE_PATH, config.MEMORY_CACHE_EXPIRATION_PATH, config.MEMORY_PORTAL_PATH]) {
        if (Memory[key] !== undefined) {
            if (root[key] === undefined) {
                root[key] = Memory[key];
            }
            delete Memory[key];
        }
    }
    return root;
}

const cache = new Map();
const expirationCache = new Map();
const HeapCache = {
    set(key, value, expiration) {
        cache.set(key, value);
        if (expiration !== undefined) {
            expirationCache.set(key, expiration);
        }
    },
    get(key) {
        return cache.get(key);
    },
    expires(key) {
        return expirationCache.get(key);
    },
    delete(key) {
        cache.delete(key);
    },
    with() {
        return HeapCache; // HeapCache never uses serializers
    },
    clean() {
        for (const [key, expires] of expirationCache) {
            if (Game.time >= expires) {
                HeapCache.delete(key);
                expirationCache.delete(key);
            }
        }
    }
};

var utf15;
var hasRequiredUtf15;

function requireUtf15 () {
	if (hasRequiredUtf15) return utf15;
	hasRequiredUtf15 = 1;

	const Impl = (()=>{
	    
	    const // #define
	        MAX_DEPTH           = 53,       // Number.MAX_SAFE_INTEGER === (2^53 - 1)
	        SAFE_BITS           = 15,       // 15 of 16 UTF-16 bits
	        UNPRINTABLE_OFFSET  = 48,       // ASCII '0'
	        UPPER_BOUND         = 0xFFFF,   // Max 16 bit value
	        POWERS_OF_2 = [1,
	            2,                      4,                      8,                      16,
	            32,                     64,                     128,                    256,
	            512,                    1024,                   2048,                   4096,
	            8192,                   16384,                  32768,                  65536,
	            131072,                 262144,                 524288,                 1048576,
	            2097152,                4194304,                8388608,                16777216,
	            33554432,               67108864,               134217728,              268435456,
	            536870912,              1073741824,             2147483648,             4294967296,
	            8589934592,             17179869184,            34359738368,            68719476736,
	            137438953472,           274877906944,           549755813888,           1099511627776,
	            2199023255552,          4398046511104,          8796093022208,          17592186044416,
	            35184372088832,         70368744177664,         140737488355328,        281474976710656,
	            562949953421312,        1125899906842624,       2251799813685248,       4503599627370496,
	            9007199254740992        // 2^53 max
	        ];
	    
	    /// Maximum representable by SAFE_BITS number + 1 
	    const UPPER_LIMIT = POWERS_OF_2[SAFE_BITS];

	    /// Set of lib errors
	    class RangeCodecError extends RangeError { constructor(msg) { super("[utf15][RangeError]: " + msg); } }
	    class TypeCodecError  extends TypeError  { constructor(msg) { super("[utf15][TypeError]: "  + msg); } }

	    
	    /// Throws runtime exception in case of failed condition
	    const assert = (condition, Err, ...str) => {
	        if(!condition) throw new Err(str.reduce((o,s) => (o+s+' '), '')); };
	    
	    /// @returns normalized UTF CodePoint
	    const num_to_code_point = (x) => {
	        x = +x;
	        assert(x >= 0 && x < UPPER_LIMIT, RangeCodecError, 'x out of bounds:', x);
	        x += UNPRINTABLE_OFFSET;
	        return x;
	    };

	    /// @returns extracted unsigned value from CodePoint
	    const code_point_to_num = (x) => {
	        x = +x;
	        assert(x >= 0 && x <= UPPER_BOUND, RangeCodecError, 'x out of bounds:', x);
	        x -= UNPRINTABLE_OFFSET;
	        return x;
	    };
	    
	    const check_cfg = (cfg) => {
	        let fail = false;
	        fail = fail || isNaN(cfg.meta)  || (cfg.meta  !== 0 && cfg.meta  !== 1);
	        fail = fail || isNaN(cfg.array) || (cfg.array !== 0 && cfg.array !== 1);
	        if(!fail) (()=>{
	            const depth_is_array = Array.isArray(cfg.depth);
	            fail = fail || (depth_is_array && !cfg.array);
	            if(fail) return;
	            
	            const fail_depth = (x) => (isNaN(x) || x <= 0 || x > MAX_DEPTH);
	            if(depth_is_array) {
	                cfg.depth.forEach((d, idx) => {
	                    cfg.depth[idx] = +cfg.depth[idx];
	                    fail = fail || fail_depth(d);
	                });
	            } else {
	                cfg.depth = +cfg.depth;
	                fail = fail || fail_depth(cfg.depth);
	            }
	        })();
	        
	        if(fail) {
	            let str = '[JSON.stringify() ERROR]';
	            try { str = JSON.stringify(cfg); } finally {}
	            assert(0, TypeCodecError, 'Codec config is invalid:', str);
	        }
	    };
	    
	    const serialize_meta = (str, meta) => {
	        const depth = Array.isArray(meta.depth) ? 0 : meta.depth;
	        return str + String.fromCodePoint(
	            num_to_code_point(meta.array),
	            num_to_code_point(depth));
	    };
	    
	    const deserialize_meta = (str, meta, offset) => {
	        offset = offset || 0;
	        meta.array = code_point_to_num(str.codePointAt(offset    ));
	        meta.depth = code_point_to_num(str.codePointAt(offset + 1));
	        return [str.slice(offset + 2), 2];
	    };
	    
	    function encode_array(res, values) {
	        const depth_is_array = Array.isArray(this.depth);
	        
	        const fixed_depth = depth_is_array ? 0 : this.depth;
	        const depths = depth_is_array ? this.depth : [];

	        assert(fixed_depth || depths.length === values.length, TypeCodecError,
	            'Wrong depths array length:', depths, values);

	        if(!depth_is_array) // Save array length as meta
	            res += String.fromCodePoint(num_to_code_point(values.length));

	        let symbol_done = 0, symbol_acc = 0;

	        // Cycle over values
	        for(let i = 0, len = values.length; i < len; ++i) {

	            // Current value and its bit depth
	            const value = values[i], depth = fixed_depth || depths[i];

	            // Cycle over value bits
	            for(let value_done = 0; value_done < depth;) {

	                const symbol_left   = SAFE_BITS - symbol_done;
	                const value_left    = depth - value_done;
	                const bits_to_write = Math.min(symbol_left, value_left);

	                let mask = Math.floor(value / POWERS_OF_2[value_done]);
	                mask %= POWERS_OF_2[bits_to_write];
	                mask *= POWERS_OF_2[symbol_done];

	                symbol_acc  += mask;
	                value_done  += bits_to_write;
	                symbol_done += bits_to_write;

	                // Output symbol ready, push it
	                if(symbol_done === SAFE_BITS) {
	                    res += String.fromCodePoint(num_to_code_point(symbol_acc));
	                    symbol_done = symbol_acc = 0;
	                }
	            }
	        }

	        if(symbol_done !== 0) // Last symbol left
	            res += String.fromCodePoint(num_to_code_point(symbol_acc));
	        
	        return res;
	    }
	    
	    function decode_array(str, meta) {
	        assert(!this.meta || meta.depth > 0 || (meta.depth === 0 && Array.isArray(this.depth)),
	            TypeCodecError, 'Array decoding error (check inputs and codec config)');

	        meta.depth = meta.depth || this.depth;
	        const depth_is_array = Array.isArray(meta.depth);

	        let it = 0, i = 0;
	        const length = depth_is_array ? meta.depth.length : code_point_to_num(str.codePointAt(it++));
	        const fixed_depth = depth_is_array ? 0 : meta.depth;
	        const depths = depth_is_array ? meta.depth : [];
	        const values = new Array(length);
	        
	        let symbol_done = 0;
	        let chunk = code_point_to_num(str.codePointAt(it++));

	        // Cycle over values
	        while(i < length) {

	            const depth = fixed_depth || depths[i];
	            let value_acc = 0, value_done = 0;

	            // Cycle over value bits
	            while(value_done < depth) {
	                const symbol_left   = SAFE_BITS - symbol_done;
	                const value_left    = depth - value_done;
	                const bits_to_read  = Math.min(symbol_left, value_left);

	                let data = Math.floor(chunk / POWERS_OF_2[symbol_done]);
	                data %= POWERS_OF_2[bits_to_read];
	                data *= POWERS_OF_2[value_done];

	                value_acc   += data;
	                value_done  += bits_to_read;
	                symbol_done += bits_to_read;

	                // The whole symbol has been processed, move to next
	                if(symbol_done === SAFE_BITS) {
	                    // It was the last code unit, break without iterators changing
	                    if((i + 1) === length && value_done === depth) break;
	                    chunk = code_point_to_num(str.codePointAt(it++));
	                    symbol_done = 0;
	                }
	            }

	            if(value_done > 0)
	                values[i++] = value_acc;
	        }

	        return [values, it];
	    }
	    
	    class Codec {
	        
	        /// Constructs codec by config or another serialized codec (this <=> cfg)
	        constructor(cfg) {
	            cfg = cfg || {};
	            this.meta   = +(!!cfg.meta);
	            this.array  = +(!!cfg.array);
	            this.depth  = cfg.depth || MAX_DEPTH;
	            check_cfg(this);
	        }
	        
	        /// @param arg -- single value or array of values to be encoded
	        /// @returns encoded string
	        encode(arg) {
	            assert((+Array.isArray(arg) | +(!!(arg).BYTES_PER_ELEMENT)) ^ !this.array, TypeCodecError,
	                'Incompatible codec (array <=> single value), arg =', arg);
	            
	            let res = '';

	            if(this.meta) // Save meta info
	                res = serialize_meta(res, this);
	            
	            if(this.array) {
	                // Effectively packs array of numbers
	                res = encode_array.call(this, res, arg);
	            } else {
	                // Packs single value, inline
	                let x = +arg % POWERS_OF_2[this.depth];
	                const len = Math.ceil(this.depth / SAFE_BITS);
	                for(let i = 0; i < len; ++i) {
	                    const cp = num_to_code_point(x % UPPER_LIMIT);
	                    res += String.fromCodePoint(cp);
	                    x = Math.floor(x / UPPER_LIMIT);
	                }
	            }
	            
	            return res;
	        }

	        /// @param str -- string to be decoded
	        /// @param length_out -- output, read length will be saved as "length_out.length" (optional)
	        /// @returns decoded single value or array of values
	        decode(str, length_out) {
	            let meta = null;    // codec config
	            let length = 0;     // number of read code units
	            
	            if(this.meta) {
	                // Meta has been saved to str, restore
	                [str, length] = deserialize_meta(str, (meta = {}));
	            } else {
	                // Otherwise, use this config
	                meta = this;
	            }

	            assert(meta.array ^ !this.array, TypeCodecError,
	                'Incompatible codec (array <=> single value), str =', str);
	            
	            if(this.array) { // output is array of integers
	                const res = decode_array.call(this, str, meta);
	                !!length_out && (length_out.length = length + res[1]);
	                return res[0];
	            }

	            let acc = 0, pow = 0;
	            const len = Math.ceil(meta.depth / SAFE_BITS);
	            for(let i = 0; i < len; ++i) {
	                const x = code_point_to_num(str.codePointAt(i));
	                acc += x * POWERS_OF_2[pow];
	                pow += SAFE_BITS;
	            }

	            !!length_out && (length_out.length = length + len);
	            return acc;
	        }
	    }
	    
	    return { Codec, MAX_DEPTH };
	})();

	utf15 = Impl;
	return utf15;
}

var utf15Exports = requireUtf15();

const numberCodec = new utf15Exports.Codec({ array: false });
const NumberSerializer = {
    key: 'ns',
    serialize(target) {
        if (target === undefined)
            return undefined;
        return numberCodec.encode(target);
    },
    deserialize(target) {
        if (target === undefined)
            return undefined;
        return numberCodec.decode(target);
    }
};

const cacheKey = (serializer, key) => `cg_${serializer.key}_${key}`;
/**
 * Wraps the caching method with a serializer to read/write objects from the cache.
 * Assumes serializers are idempotent - same input will produce the same deserialized
 * output. Caches the deserialized output so it can be looked up quickly instead of
 * running the (more expensive) deserialization each tick. These caches are cleaned
 * up after CREEP_LIFE_TIME ticks or when the target item is deleted.
 */
const withSerializer = (strategy, serializer) => ({
    // default most methods from strategy
    ...strategy,
    // override certain methods for serialization
    get(key) {
        const serializedValue = strategy.get(key);
        if (!serializedValue)
            return undefined;
        try {
            const value = HeapCache.get(cacheKey(serializer, serializedValue)) ?? serializer.deserialize(serializedValue);
            if (value !== undefined)
                HeapCache.set(cacheKey(serializer, serializedValue), value, Game.time + CREEP_LIFE_TIME);
            return value;
        }
        catch (e) {
            // error deserializing value, discard cache
            strategy.delete(key);
            HeapCache.delete(cacheKey(serializer, serializedValue));
            return undefined;
        }
    },
    set(key, value, expiration) {
        // free previously cached deserialized value
        const previous = strategy.get(key);
        if (previous)
            HeapCache.delete(cacheKey(serializer, previous));
        const v = serializer.serialize(value);
        if (v) {
            strategy.set(key, v, expiration);
            HeapCache.set(cacheKey(serializer, v), value, Game.time + CREEP_LIFE_TIME);
        }
        else {
            strategy.delete(key);
        }
    },
    delete(key) {
        const previous = strategy.get(key);
        if (previous)
            HeapCache.delete(cacheKey(serializer, previous));
        strategy.delete(key);
    },
    with(serializer) {
        return withSerializer(strategy, serializer);
    }
});

function memoryCache() {
    const root = cartographerMemory();
    root[config.MEMORY_CACHE_PATH] ??= {};
    return root[config.MEMORY_CACHE_PATH];
}
function memoryExpirationCache() {
    const root = cartographerMemory();
    root[config.MEMORY_CACHE_EXPIRATION_PATH] ??= {};
    return root[config.MEMORY_CACHE_EXPIRATION_PATH];
}
function memoryPortalCache() {
    const root = cartographerMemory();
    root[config.MEMORY_PORTAL_PATH] ??= [];
    return root[config.MEMORY_PORTAL_PATH];
}
function setMemoryPortalCache(value) {
    cartographerMemory()[config.MEMORY_PORTAL_PATH] = value;
}
const MemoryCache = {
    set(key, value, expiration) {
        memoryCache()[key] = value;
        if (expiration !== undefined) {
            const expires = NumberSerializer.serialize(expiration);
            if (expires)
                memoryExpirationCache()[key] = expires;
        }
    },
    get(key) {
        return memoryCache()[key];
    },
    expires(key) {
        return NumberSerializer.deserialize(memoryExpirationCache()[key]);
    },
    delete(key) {
        delete memoryCache()[key];
    },
    with(serializer) {
        return withSerializer(MemoryCache, serializer);
    },
    clean() {
        const expirationCache = memoryExpirationCache();
        for (const key in expirationCache) {
            const expires = NumberSerializer.deserialize(expirationCache[key]);
            if (expires !== undefined && Game.time >= expires) {
                MemoryCache.delete(key);
                delete expirationCache[key];
            }
        }
    }
};

/**
 * Generic memoizer. Given a function and a way to derive a key from its parameters, cache the
 * results of the function for each combination of parameters for a given number of ticks.
 *
 * Example:
 * ```
 * export const getRoomPathDistance = memoize(
 *   (room1: string, room2: string) => [room1, room2].sort().join(''),
 *   (room1: string, room2: string) => {
 *     const newRoute = Game.map.findRoute(room1, room2, {
 *       routeCallback: room => (getTerritoryIntent(room) === TerritoryIntent.AVOID ? Infinity : 0)
 *     });
 *     if (newRoute === -2) return undefined;
 *     return newRoute.length;
 *   }
 * );
 * ```
 *
 * Note that the returned value, if not a primitive, is a reference - so if you mutate the
 * returned value elsewhere in your code, that change will be reflected next time you call
 * this function.
 *
 * Example:
 * ```
 * // resets the set automatically every 10 ticks
 * export const creepsThatNeedEnergy = memoize(
 *   (room: string) => room,
 *   (room: string) => new Set<string>(),
 *   10
 * )
 *
 * creepsThatNeedEnergy().add(creep.name);
 *
 * for (const creepName of creepsThatNeedEnergy()) {
 *   // get energy to creep
 * }
 * ```
 *
 * @param indexer Return a unique string as a key for the given combination of `fn`'s parameters
 * @param fn Generates some value to cache
 * @param resetAfterTicks Resets all cached values every `n` ticks
 * @returns The cached return value from `fn`
 */
const memoize = (indexer, fn, resetAfterTicks = Infinity) => {
    let resultsMap = new Map();
    let lastTick = Game.time;
    return (...args) => {
        if (Game.time >= lastTick + resetAfterTicks) {
            lastTick = Game.time;
            resultsMap = new Map();
        }
        const key = indexer(...args);
        if (!resultsMap.has(key)) {
            resultsMap.set(key, fn(...args));
        }
        return resultsMap.get(key);
    };
};
/**
 * A shorthand invocation of `memoize` where the results should reset every tick
 *
 * Example:
 * ```
 * export const buyMarketPrice = memoizeByTick(
 *   (resourceType: MarketResourceConstant) => resourceType,
 *   (resourceType: MarketResourceConstant) =>
 *     Math.min(...Game.market.getAllOrders({ type: ORDER_SELL, resourceType }).map(o => o.price), Infinity)
 * );
 * ```
 */
const memoizeByTick = (indexer, fn) => memoize(indexer, fn, 1);

const MAX_WORLD_SIZE = 256 >> 1;
const roomToPacked = memoize((room) => room, (room) => {
    for (let i = 2; i < room.length; i++) {
        if (room[i] === 'N' || room[i] === 'S') {
            const xQuadrant = room[0];
            const yQuadrant = room[i];
            let x = parseInt(room.slice(1, i));
            let y = parseInt(room.slice(i + 1));
            if (xQuadrant === 'W')
                x = -x - 1;
            if (yQuadrant === 'N')
                y = -y - 1;
            x += MAX_WORLD_SIZE;
            y += MAX_WORLD_SIZE;
            return (x << 8) | y;
        }
    }
    throw new Error(`Invalid room name ${room}`);
});
const fastRoomPosition = (x, y, room) => {
    const pos = Object.create(RoomPosition.prototype);
    pos.__packedPos = (roomToPacked(room) << 16) | (x << 8) | y;
    return pos;
};
const sameRoomPosition = (pos, newX, newY) => {
    const newPos = Object.create(RoomPosition.prototype);
    newPos.__packedPos = (pos.__packedPos & 0xffff0000) | (newX << 8) | newY;
    return newPos;
};
const offsetRoomPosition = (pos, xOffset, yOffset) => {
    const x = (pos.__packedPos >> 8) & 0xff;
    const y = pos.__packedPos & 0xff;
    const newPos = Object.create(RoomPosition.prototype);
    newPos.__packedPos = (pos.__packedPos & 0xffff0000) | ((x + xOffset) << 8) | (y + yOffset);
    return newPos;
};

const roomPositionCodec = new utf15Exports.Codec({ array: false, depth: 28 });
const coordCodec = new utf15Exports.Codec({ array: true, depth: 12 });
const directionsCodec = new utf15Exports.Codec({ depth: 3, array: true });
const roomNameCodec = new utf15Exports.Codec({ array: true, depth: 16 });
const cardinals = ['WN', 'EN', 'WS', 'ES'];
/**
 * Pack RoomPosition to two Unicode characters with screeps-utf15
 */
const packPos = (pos) => {
    // adjust the packedPos
    const xx = (pos.__packedPos & 0xff00) >> 8;
    const yy = pos.__packedPos & 0xff;
    const packedPos = ((pos.__packedPos >>> 4) & 0xfffff000) | (xx << 6) | yy;
    // encode the room position
    return roomPositionCodec.encode(packedPos);
};
/**
 * Unpack a single packed RoomPosition from two Unicode characters
 */
const unpackPos = function (str) {
    // decode the room position
    const packedPos = roomPositionCodec.decode(str);
    // adjust the packedPos
    const xx = (packedPos & 0xfc0) >> 6;
    const yy = packedPos & 0x3f;
    const newPackedPos = ((packedPos << 4) & 0xffff0000) | (xx << 8) | yy;
    // return a new RoomPosition object
    const pos = Object.create(RoomPosition.prototype);
    pos.__packedPos = newPackedPos;
    if (pos.x > 49 || pos.y > 49) {
        throw new Error('Invalid room position');
    }
    return pos;
};
/**
 * Pack a Coord to 12 bits with utf15
 */
const packCoord = (coord) => {
    return packCoordList([coord]);
};
/**
 * Unpack a coord with utf15
 */
const unpackCoord = (str) => {
    return unpackCoordList(str)[0];
};
/**
 * Pack a list of Coords as compactly as possible with utf15
 */
const packCoordList = (coords) => {
    return coordCodec.encode(coords.map(c => (c.x << 6) | c.y));
};
/**
 * Unpack a list of Coords as compactly as possible with utf15
 */
const unpackCoordList = (str) => {
    return coordCodec.decode(str).map(n => {
        const coord = {
            x: (n & 0xfc0) >> 6,
            y: n & 0x03f
        };
        if (coord.x > 49 || coord.y > 49)
            throw new Error('Invalid packed coord');
        return coord;
    });
};
/**
 * Pack a list of RoomPositions to two Unicode characters each with screeps-utf15
 */
const packPosList = (posList) => {
    return posList.map(p => packPos(p)).join('');
};
/**
 * Unpack a list of RoomPositions from two Unicode characters each
 */
const unpackPosList = (str) => {
    return str.match(/.{1,2}/g)?.map(s => unpackPos(s));
};
const roomNameToCoords = (roomName) => {
    let match = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
    if (!match)
        throw new Error('Invalid room name');
    let [, h, wx, v, wy] = match;
    return {
        wx: h == 'W' ? ~Number(wx) : Number(wx),
        wy: v == 'N' ? ~Number(wy) : Number(wy)
    };
};
const roomNameFromCoords = (x, y) => {
    let h = x < 0 ? 'W' : 'E';
    let v = y < 0 ? 'N' : 'S';
    x = x < 0 ? ~x : x;
    y = y < 0 ? ~y : y;
    return `${h}${x}${v}${y}`;
};
const globalPosition = (pos) => {
    let { x, y, roomName } = pos;
    if (x < 0 || x >= 50)
        throw new RangeError('x value ' + x + ' not in range');
    if (y < 0 || y >= 50)
        throw new RangeError('y value ' + y + ' not in range');
    if (roomName == 'sim')
        throw new RangeError('Sim room does not have world position');
    let { wx, wy } = roomNameToCoords(roomName);
    return {
        x: 50 * Number(wx) + x,
        y: 50 * Number(wy) + y
    };
};
const fromGlobalPosition = (pos) => {
    let [wx, x] = [Math.floor(pos.x / 50), pos.x % 50];
    let [wy, y] = [Math.floor(pos.y / 50), pos.y % 50];
    if (wx < 0 && x < 0)
        x = 49 - ~x;
    if (wy < 0 && y < 0)
        y = 49 - ~y;
    let roomName = roomNameFromCoords(wx, wy);
    return fastRoomPosition(x, y, roomName);
};
const getRangeTo = (from, to) => {
    if (from.roomName === to.roomName)
        return from.getRangeTo(to);
    // Calculate global positions
    let fromGlobal = globalPosition(from);
    let toGlobal = globalPosition(to);
    return Math.max(Math.abs(fromGlobal.x - toGlobal.x), Math.abs(fromGlobal.y - toGlobal.y));
};
function posAtDirection(origin, direction) {
    const offset = [
        { x: 0, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: -1, y: 1 },
        { x: -1, y: 0 },
        { x: -1, y: -1 }
    ][direction - 1];
    let newX = origin.x + offset.x;
    let newY = origin.y + offset.y;
    let newRoomName = origin.roomName;
    if (newX < 0) {
        // out of the room to the left
        const { wx, wy } = roomNameToCoords(origin.roomName);
        newRoomName = roomNameFromCoords(wx - 1, wy);
        newX = 49;
    }
    else if (newX > 49) {
        // out of the room to the right
        const { wx, wy } = roomNameToCoords(origin.roomName);
        newRoomName = roomNameFromCoords(wx + 1, wy);
        newX = 0;
    }
    else if (newY < 0) {
        // out of the room to the top
        const { wx, wy } = roomNameToCoords(origin.roomName);
        newRoomName = roomNameFromCoords(wx, wy - 1);
        newY = 49;
    }
    else if (newY > 49) {
        // out of the room to the top
        const { wx, wy } = roomNameToCoords(origin.roomName);
        newRoomName = roomNameFromCoords(wx, wy + 1);
        newY = 0;
    }
    if (newRoomName === origin.roomName) {
        return sameRoomPosition(origin, newX, newY);
    }
    return fastRoomPosition(newX, newY, newRoomName);
}
/**
 * Compress a path of adjacent RoomPositions to an origin and a list of directions
 */
const compressPath = (path) => {
    const directions = [];
    const origin = path[0];
    if (!origin)
        return '';
    let previous = origin;
    for (const next of path.slice(1)) {
        if (getRangeTo(previous, next) !== 1) {
            throw new Error('Cannot compress path unless each RoomPosition is adjacent to the previous one');
        }
        directions.push(previous.getDirectionTo(next));
        previous = next;
    }
    return packPos(origin) + directionsCodec.encode(directions);
};
/**
 * Decompress a path from an origin and list of directions
 */
const decompressPath = (str) => {
    let previous = unpackPos(str.slice(0, 2));
    const path = [previous];
    const directions = directionsCodec.decode(str.slice(2));
    for (const d of directions) {
        previous = posAtDirection(previous, d);
        path.push(previous);
    }
    return path;
};
/**
 * Pack a list of room names as compactly as possible
 */
const packRoomNames = (roomNames) => {
    // encode the room position
    return roomNameCodec.encode(roomNames.map(roomName => {
        // split the room name
        const [_, d1, x, d2, y] = roomName.split(/([A-Z])([0-9]+)([A-Z])([0-9]+)/);
        return (cardinals.indexOf(d1 + d2) << 14) | (parseInt(x) << 7) | parseInt(y);
    }));
};
/**
 * Unpack a list of room names as compactly as possible
 */
const unpackRoomNames = (str) => {
    // decode the room position
    return roomNameCodec.decode(str).map(packed => {
        const d1d2 = packed >> 14;
        const x = (packed >> 7) & 0x7f;
        const y = packed & 0x7f;
        // join the room name
        const [d1, d2] = cardinals[d1d2].split('');
        return `${d1}${x}${d2}${y}`;
    });
};
/**
 * Pack a single room name into two UTF-15 characters
 */
const packRoomName = (roomName) => packRoomNames([roomName]);
/**
 * Unpack a single room name from two UTF-15 characters
 */
const unpackRoomName = (str) => unpackRoomNames(str)[0];

/**
 * Note: this binds range at 32768, which should be plenty for MoveTarget purposes
 */
const rangeCodec = new utf15Exports.Codec({ array: false, depth: 15 });
const MoveTargetSerializer = {
    key: 'mts',
    serialize(target) {
        if (target === undefined)
            return undefined;
        return `${packPos(target.pos)}${rangeCodec.encode(target.range)}`;
    },
    deserialize(target) {
        if (target === undefined)
            return undefined;
        return {
            pos: unpackPos(target.slice(0, 2)),
            range: rangeCodec.decode(target.slice(2))
        };
    }
};
/**
 * Move target serializes into three characters: two for position and one for range
 */
const MoveTargetListSerializer = {
    key: 'mtls',
    serialize(target) {
        if (target === undefined)
            return undefined;
        return target.map(t => MoveTargetSerializer.serialize(t)).join('');
    },
    deserialize(target) {
        if (target === undefined)
            return undefined;
        const targets = [];
        for (let i = 0; i < target.length; i += 3) {
            const t = MoveTargetSerializer.deserialize(target.slice(i, i + 3));
            if (t)
                targets.push(t);
        }
        return targets;
    }
};

const PositionSerializer = {
    key: 'ps',
    serialize(pos) {
        if (pos === undefined)
            return undefined;
        return packPos(pos);
    },
    deserialize(pos) {
        if (pos === undefined)
            return undefined;
        return unpackPos(pos);
    }
};
const PositionListSerializer = {
    key: 'pls',
    serialize(pos) {
        if (pos === undefined)
            return undefined;
        return packPosList(pos);
    },
    deserialize(pos) {
        if (pos === undefined)
            return undefined;
        return unpackPosList(pos);
    }
};
const CoordSerializer = {
    key: 'cs',
    serialize(pos) {
        if (pos === undefined)
            return undefined;
        return packCoord(pos);
    },
    deserialize(pos) {
        if (pos === undefined)
            return undefined;
        return unpackCoord(pos);
    }
};
const CoordListSerializer = {
    key: 'cls',
    serialize(pos) {
        if (pos === undefined)
            return undefined;
        return packCoordList(pos);
    },
    deserialize(pos) {
        if (pos === undefined)
            return undefined;
        return unpackCoordList(pos);
    }
};

function cleanAllCaches() {
    MemoryCache.clean();
    HeapCache.clean();
}
const CachingStrategies = {
    HeapCache,
    MemoryCache
};

class RoomPositionSet extends Set {
    map = new Map();
    add(pos) {
        this.map.set(pos.__packedPos, pos);
        return this;
    }
    delete(pos) {
        return this.map.delete(pos.__packedPos);
    }
    has(pos) {
        return this.map.has(pos.__packedPos);
    }
    clear() {
        this.map.clear();
    }
    *entries() {
        for (const v of this.map.values()) {
            yield [v, v];
        }
        return undefined;
    }
    values() {
        return this.map.values();
    }
    keys() {
        return this.map.values();
    }
    [Symbol.iterator]() {
        return this.map.values();
    }
    get size() {
        return this.map.size;
    }
}

/**
 * Position is an edge tile
 */
const isExit = (pos) => pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
/**
 * Takes a target or list of targets in a few different possible formats and
 * normalizes to a list of MoveTarget[]
 */
const normalizeTargets = memoize((targets, keepTargetInRoom = true, flee = false) => {
    let key = `${keepTargetInRoom}${flee}`;
    if (Array.isArray(targets)) {
        if (targets.length && 'pos' in targets[0]) {
            key += targets.map(t => `${t.pos.__packedPos}_${t.range}`).join(',');
        }
        else {
            key += targets.map(t => t.__packedPos).join(',');
        }
    }
    else if ('pos' in targets) {
        if ('range' in targets) {
            key += `${targets.pos.__packedPos}_${targets.range}`;
        }
        else {
            key += `${targets.pos.__packedPos}_1`;
        }
    }
    else {
        key += `${targets.__packedPos}_1`;
    }
    return key;
}, (targets, keepTargetInRoom = true, flee = false) => {
    let normalizedTargets = [];
    if (Array.isArray(targets)) {
        if (targets.length && 'pos' in targets[0]) {
            normalizedTargets.push(...targets);
        }
        else {
            normalizedTargets.push(...targets.map(pos => ({ pos, range: 0 })));
        }
    }
    else if ('pos' in targets) {
        if ('range' in targets) {
            normalizedTargets.push(targets);
        }
        else {
            normalizedTargets.push({ pos: targets.pos, range: 1 });
        }
    }
    else {
        normalizedTargets.push({ pos: targets, range: 1 });
    }
    if (keepTargetInRoom)
        normalizedTargets = normalizedTargets.flatMap(fixEdgePosition);
    if (flee) {
        // map flee targets to MoveTarget[] around perimeter of target areas
        const borders = new RoomPositionSet();
        // visualize normalized targets
        for (const { pos, range } of normalizedTargets) {
            calculatePositionsAtRange(pos, range + 1)
                .filter(p => {
                if (!isPositionWalkable(p, true, false))
                    return false;
                if (keepTargetInRoom && (p.roomName !== pos.roomName || isExit(p)))
                    return false;
                return true;
            })
                .forEach(p => borders.add(p));
        }
        for (const pos of borders) {
            if (normalizedTargets.some(t => t.pos.inRangeTo(pos, t.range))) {
                borders.delete(pos);
            }
        }
        normalizedTargets = [...borders].map(pos => ({ pos, range: 0 }));
    }
    return normalizedTargets;
});
/**
 * If a MoveTarget's position and range overlaps a room edge, this will split
 * the MoveTarget into two or four MoveTargets to cover an equivalent area without
 * overlapping the edge. Useful for pathing in range of a target, but making sure it's
 * at least in the same room.
 */
function fixEdgePosition({ pos, range }) {
    if (range === 0 || (pos.x > range && 49 - pos.x > range && pos.y > range && 49 - pos.y > range)) {
        return [{ pos, range }]; // no action needed
    }
    // generate quadrants
    const rect = {
        x1: Math.max(1, pos.x - range),
        x2: Math.min(48, pos.x + range),
        y1: Math.max(1, pos.y - range),
        y2: Math.min(48, pos.y + range)
    };
    const xdiff = rect.x2 - rect.x1 + 1; // width of the rect (inclusive)
    const ydiff = rect.y2 - rect.y1 + 1; // height of the rect (inclusive)
    // each square will have a center pos and a range that yields bounds
    // as close as possible to the min dimension of the rect
    const subsetRange = Math.floor((Math.min(xdiff, ydiff) - 1) / 2);
    // lay out a grid of squares that fills the rect as efficiently as possible
    // the last square in the row and/or column, if it doesn't fill the space
    // completely, will be shifted back to avoid overlapping the edge of the rect
    const xIndexes = Math.floor(xdiff / (subsetRange + 1));
    const yIndexes = Math.floor(ydiff / (subsetRange + 1));
    const xCoords = new Set(Array(xIndexes)
        .fill(0)
        .map((_, i) => Math.min(rect.x2 - subsetRange, rect.x1 + subsetRange + i * (subsetRange * 2 + 1))));
    const yCoords = new Set(Array(yIndexes)
        .fill(0)
        .map((_, i) => Math.min(rect.y2 - subsetRange, rect.y1 + subsetRange + i * (subsetRange * 2 + 1))));
    const squares = [];
    for (const x of xCoords) {
        for (const y of yCoords) {
            squares.push({ pos: sameRoomPosition(pos, x, y), range: subsetRange });
        }
    }
    return squares;
}
/**
 * Helper for calculating adjacent tiles
 */
const calculateAdjacencyMatrix = (proximity = 1) => {
    let adjacencies = new Array(proximity * 2 + 1).fill(0).map((v, i) => i - proximity);
    return adjacencies
        .flatMap(x => adjacencies.map(y => ({ x, y })))
        .filter((a) => !(a.x === 0 && a.y === 0));
};
/**
 * Positions in range 1 of `pos` (not includeing `pos`)
 */
const calculateAdjacentPositions = (pos) => {
    return calculateNearbyPositions(pos, 1);
};
/**
 * Positions within `proximity` of `pos`, optionally including `pos`
 */
const calculateNearbyPositions = (pos, proximity, includeCenter = false) => {
    if (proximity === 0)
        return [pos];
    let adjacent = [];
    adjacent = calculateAdjacencyMatrix(proximity)
        .map(offset => {
        if (pos.x + offset.x < 0 || pos.x + offset.x > 49 || pos.y + offset.y < 0 || pos.y + offset.y > 49)
            return null;
        return offsetRoomPosition(pos, offset.x, offset.y);
    })
        .filter(roomPos => roomPos !== null);
    if (includeCenter)
        adjacent.push(pos);
    return adjacent;
};
/**
 * Positions at `proximity` of `pos`
 */
const calculatePositionsAtRange = (pos, proximity) => {
    const globalPos = globalPosition(pos);
    let positions = [];
    for (let x = globalPos.x - proximity; x <= globalPos.x + proximity; x++) {
        positions.push(fromGlobalPosition({ x, y: globalPos.y - proximity }));
        positions.push(fromGlobalPosition({ x, y: globalPos.y + proximity }));
    }
    for (let y = globalPos.y - proximity + 1; y <= globalPos.y + proximity - 1; y++) {
        positions.push(fromGlobalPosition({ x: globalPos.x - proximity, y }));
        positions.push(fromGlobalPosition({ x: globalPos.x + proximity, y }));
    }
    return positions;
};
/**
 * Adjacent positions that are pathable (optionally ignoring creeps)
 */
const adjacentWalkablePositions = (pos, ignoreCreeps = false) => calculateAdjacentPositions(pos).filter(p => isPositionWalkable(p, ignoreCreeps));
/**
 * Check if a position is walkable, accounting for terrain, creeps, and structures
 */
const isPositionWalkable = (pos, ignoreCreeps = false, ignoreStructures = false) => {
    let terrain;
    try {
        terrain = Game.map.getRoomTerrain(pos.roomName);
    }
    catch {
        // Invalid room
        return false;
    }
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
        return false;
    }
    if (Game.rooms[pos.roomName] &&
        pos.look().some(obj => {
            if (!ignoreCreeps && (obj.type === LOOK_CREEPS || obj.type === LOOK_POWER_CREEPS))
                return true;
            if (!ignoreStructures &&
                obj.constructionSite &&
                obj.constructionSite.my &&
                OBSTACLE_OBJECT_TYPES.includes(obj.constructionSite.structureType))
                return true;
            if (!ignoreStructures &&
                obj.structure &&
                (OBSTACLE_OBJECT_TYPES.includes(obj.structure.structureType) ||
                    (obj.structure instanceof StructureRampart && !obj.structure.my)))
                return true;
            return false;
        })) {
        return false;
    }
    return true;
};

const isHighway = (roomName) => {
    let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (!parsed)
        throw new Error('Invalid room name');
    return Number(parsed[1]) % 10 === 0 || Number(parsed[2]) % 10 === 0;
};
const isCenterRoom = (roomName) => {
    let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (!parsed)
        throw new Error('Invalid room name');
    return Number(parsed[1]) % 10 === 5 && Number(parsed[2]) % 10 === 5;
};
const isSourceKeeperRoom = (roomName) => {
    let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (!parsed)
        throw new Error('Invalid room name');
    let fmod = Number(parsed[1]) % 10;
    let smod = Number(parsed[2]) % 10;
    return !(fmod === 5 && smod === 5) && (fmod >= 4 && fmod <= 6) && (smod >= 4 && smod <= 6);
};
/**
 * Returns the remaining slice of the path (not including start)
 */
const slicedPath = (path, start, reverse) => {
    if (reverse)
        return path.slice(0, start);
    return path.slice(start + 1);
};

const keys$5 = {
    SOURCE_KEEPER_POS_LIST: '_ck'
};
const skKey = (room) => keys$5.SOURCE_KEEPER_POS_LIST + room;
function scanSourceKeepers(room) {
    if (isSourceKeeperRoom(room) && !MemoryCache.get(skKey(room))) {
        MemoryCache.with(PositionListSerializer).set(skKey(room), [...Game.rooms[room].find(FIND_SOURCES), ...Game.rooms[room].find(FIND_MINERALS)].map(s => s.pos));
    }
}
function avoidSourceKeepers(room, cm) {
    const skPositions = MemoryCache.with(PositionListSerializer).get(skKey(room)) ?? [];
    for (const pos of skPositions) {
        calculateNearbyPositions(pos, 5, true).forEach(p => cm.set(p.x, p.y, 0xff));
    }
    return cm;
}

class OneDirectionalCoordMap extends Map {
    get(key) {
        return super.get((key.x << 6) | key.y);
    }
    set(key, value) {
        super.set((key.x << 6) | key.y, value);
        return this;
    }
    delete(coord) {
        return super.delete((coord.x << 6) | coord.y);
    }
    has(coord) {
        return super.has((coord.x << 6) | coord.y);
    }
    *entries() {
        for (const [k, v] of super.entries()) {
            const kCoord = { x: k >> 6, y: k & 0b111111 };
            yield [kCoord, v];
        }
    }
    values() {
        return super.values();
    }
    *keys() {
        for (const k of super.keys()) {
            const kCoord = { x: k >> 6, y: k & 0b111111 };
            yield kCoord;
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
}
class CoordMap extends OneDirectionalCoordMap {
    reversed = new OneDirectionalCoordMap();
    set(key, value) {
        this.reversed.set(value, key);
        return super.set(key, value);
    }
    delete(coord) {
        const value = this.get(coord);
        if (value)
            this.reversed.delete(value);
        return super.delete(coord);
    }
    clear() {
        this.reversed.clear();
        super.clear();
    }
}

const timeCodec = new utf15Exports.Codec({ array: false, depth: 30 });
const portalSets = new Map();
// deserialize portal sets after a global reset
for (const serializedPortalSet of memoryPortalCache()) {
    const portalSet = deserializePortalSet(serializedPortalSet);
    const originMap = portalSets.get(portalSet.room1) ?? new Map();
    originMap.set(portalSet.room2, portalSet);
    portalSets.set(portalSet.room1, originMap);
    const destinationMap = portalSets.get(portalSet.room2) ?? new Map();
    destinationMap.set(portalSet.room1, portalSet);
    portalSets.set(portalSet.room2, destinationMap);
}
/**
 * Portal sets are linked both ways, so
 * .get(origin).get(destination) === .get(destination).get(origin)
 * (but the `room1` and `room2` don't necessarily correspond to the lookup order)
 */
function scanPortals(room) {
    // only scan highways and center rooms to save CPU
    if (!isHighway(room) && !isCenterRoom(room))
        return;
    const observedTargets = new Set();
    for (const portalSet of collectIntrashardPortals(room)) {
        const originMap = portalSets.get(portalSet.room1) ?? new Map();
        originMap.set(portalSet.room2, portalSet);
        const destinationMap = portalSets.get(portalSet.room2) ?? new Map();
        destinationMap.set(portalSet.room1, portalSet);
        observedTargets.add(portalSet.room2);
    }
    // cleanup old portal sets
    const portalSetMap = portalSets.get(room);
    for (const to of portalSetMap?.keys() ?? []) {
        if (!observedTargets.has(to)) {
            // this connection has disappeared
            portalSets.get(room)?.delete(to);
            portalSets.get(to)?.delete(room);
        }
    }
}
function cachePortals() {
    // serialize portal sets
    const allPortalSets = new Set();
    const portals = [];
    for (const portalSetMap of portalSets.values()) {
        for (const portalSet of portalSetMap.values()) {
            if (allPortalSets.has(portalSet))
                continue;
            allPortalSets.add(portalSet);
            // check if portalSet is expired
            if (portalSet.expires && portalSet.expires < Game.time) {
                portalSets.get(portalSet.room1)?.delete(portalSet.room2);
                portalSets.get(portalSet.room2)?.delete(portalSet.room1);
                continue;
            }
            // otherwise, cache the portalSet
            portals.push(serializePortalSet(portalSet));
        }
    }
    setMemoryPortalCache(portals);
}
/**
 * A room may have many portals, but these will generally link to only
 * a few other rooms. This function will serialize the origin room,
 * target room, and source and destination coords for each portal pair.
 *
 * This assumes:
 * 1. A portal's destination square always has a reverse portal on the
 *    other side
 * 2. All portals to a given target room have the same expiration
 */
function collectIntrashardPortals(room) {
    if (!Game.rooms[room])
        return [];
    // collect portal links by room target
    const portalSets = new Map();
    for (const portal of Game.rooms[room].find(FIND_STRUCTURES, {
        filter: { structureType: STRUCTURE_PORTAL }
    })) {
        if (!(portal.destination instanceof RoomPosition))
            continue; // ignore intershard portals
        const mapping = portalSets.get(portal.destination.roomName) ?? {
            room1: room,
            room2: portal.destination.roomName,
            portalMap: new CoordMap()
        };
        portalSets.set(portal.destination.roomName, mapping);
        mapping.portalMap.set(portal.pos, portal.destination);
        if (portal.ticksToDecay) {
            mapping.expires = Game.time + portal.ticksToDecay;
        }
        else {
            delete mapping.expires;
        }
    }
    return [...portalSets.values()];
}
/**
 * Format:
 *
 * 1. Origin room (2 chars, packed)
 * 2. Target room (2 chars, packed)
 * 3. Expiration ()
 */
function serializePortalSet(portalSet) {
    let serialized = '';
    // serialize rooms
    serialized += packRoomName(portalSet.room1);
    serialized += packRoomName(portalSet.room2);
    serialized += timeCodec.encode(portalSet.expires ?? 0);
    serialized += packCoordList([...portalSet.portalMap.entries()].flat());
    return serialized;
}
function deserializePortalSet(serialized) {
    const origin = unpackRoomName(serialized.slice(0, 3));
    const target = unpackRoomName(serialized.slice(3, 6));
    const expires = timeCodec.decode(serialized.slice(6, 8));
    const portalMap = new CoordMap();
    const unpackedCoords = unpackCoordList(serialized.slice(8));
    for (let i = 0; i < unpackedCoords.length; i += 2) {
        portalMap.set(unpackedCoords[i], unpackedCoords[i + 1]);
    }
    return {
        room1: origin,
        room2: target,
        expires: expires !== 0 ? expires : undefined,
        portalMap
    };
}
function describeExitsWithPortals(room) {
    // initial set with normal room exits
    const exits = new Set(Object.values(Game.map.describeExits(room) ?? {}));
    // add portals to set
    const portalSetMap = portalSets.get(room);
    if (!portalSetMap)
        return [...exits];
    for (const portalSet of portalSetMap.values()) {
        exits.add(portalSet.room2);
    }
    return [...exits];
}

function updateIntel() {
    for (const room in Game.rooms) {
        scanSourceKeepers(room);
        scanPortals(room);
    }
    cachePortals();
}

/**
 * 15 bits will be enough for three hex characters
 */
const codec = new utf15Exports.Codec({ array: false, depth: 15 });
/**
 * Derives a cache key namespaced to a particular object. `id` should be a hex string
 */
const objectIdKey = (id, key) => {
    if (!id || !id.length)
        throw new Error('Empty id');
    let paddedId = id;
    // pad id if needed
    if (paddedId.length % 3 !== 0) {
        paddedId = paddedId.padStart(Math.ceil(paddedId.length / 3) * 3, '0');
    }
    // split and compress id
    let compressed = '';
    for (let i = 0; i < paddedId.length; i += 3) {
        compressed += codec.encode(parseInt(paddedId.slice(i, i + 3), 16));
    }
    return compressed + (key ?? '');
};

/**
 * Derives a cache key namespaced to a particular creep
 */
const creepKey = (creep, key) => objectIdKey(creep.id, key);

/**
 * Derives a cache key namespaced to a particular room
 */
const roomKey = (room, key) => packRoomName(room) + (key ?? '');

var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    creepKey: creepKey,
    objectIdKey: objectIdKey,
    roomKey: roomKey
});

/**
 * Mutates a cost matrix based on a set of options, and returns the mutated cost matrix.
 */
const mutateCostMatrix = (cm, room, opts) => {
    if (opts.avoidCreeps) {
        Game.rooms[room]?.find(FIND_CREEPS).forEach(c => cm.set(c.pos.x, c.pos.y, 255));
        Game.rooms[room]?.find(FIND_POWER_CREEPS).forEach(c => cm.set(c.pos.x, c.pos.y, 255));
    }
    if (opts.avoidSourceKeepers) {
        avoidSourceKeepers(room, cm);
    }
    if (opts.avoidObstacleStructures || opts.roadCost) {
        if (opts.avoidObstacleStructures) {
            Game.rooms[room]?.find(FIND_MY_CONSTRUCTION_SITES).forEach(s => {
                if (OBSTACLE_OBJECT_TYPES.includes(s.structureType)) {
                    cm.set(s.pos.x, s.pos.y, 255);
                }
            });
        }
        Game.rooms[room]?.find(FIND_STRUCTURES).forEach(s => {
            if (opts.avoidObstacleStructures) {
                if (OBSTACLE_OBJECT_TYPES.includes(s.structureType) ||
                    (s.structureType === STRUCTURE_RAMPART && !s.my && !s.isPublic)) {
                    cm.set(s.pos.x, s.pos.y, 255);
                }
            }
            if (opts.roadCost) {
                if (s instanceof StructureRoad && cm.get(s.pos.x, s.pos.y) === 0) {
                    cm.set(s.pos.x, s.pos.y, opts.roadCost);
                }
            }
        });
    }
    if (opts.avoidTargets) {
        const terrain = Game.map.getRoomTerrain(room);
        for (const t of opts.avoidTargets(room))
            for (const p of calculateNearbyPositions(t.pos, t.range, true))
                if (terrain.get(p.x, p.y) !== TERRAIN_MASK_WALL) {
                    const avoidWeight = 254 - p.getRangeTo(t.pos) * (opts.avoidTargetGradient ?? 0);
                    cm.set(p.x, p.y, Math.max(cm.get(p.x, p.y), avoidWeight));
                }
    }
    if (!opts.ignorePortals) {
        const portalCoords = [...(portalSets.get(room)?.values() ?? [])].flatMap(p => {
            if (room === p.room1)
                return [...p.portalMap.keys()];
            return [...p.portalMap.reversed.keys()];
        });
        portalCoords.forEach(c => cm.set(c.x, c.y, 255));
    }
    return cm;
};
const configureRoomCallback = (actualOpts, targetRooms) => (room) => {
    if (targetRooms && !targetRooms.includes(room))
        return false; // outside route search space
    let cm = actualOpts.roomCallback?.(room);
    if (cm === false)
        return cm;
    const cloned = cm instanceof PathFinder.CostMatrix ? cm.clone() : new PathFinder.CostMatrix();
    return mutateCostMatrix(cloned, room, actualOpts);
};

/**
 * Uses findRoute to create a base route, then enhances
 * it by adding rooms (up to maxRooms) to improve pathfinding
 */
function findRoute(room1, targetRooms, opts) {
    const actualOpts = {
        ...config.DEFAULT_MOVE_OPTS,
        ...opts
    };
    // prepare routeCallback
    const memoizedRouteCallback = memoize((roomName, fromRoomName) => roomName + fromRoomName, (roomName, fromRoomName) => {
        const result = actualOpts.routeCallback?.(roomName, fromRoomName);
        if (result !== undefined)
            return result;
        if (isHighway(roomName))
            return actualOpts.highwayRoomCost;
        if (isSourceKeeperRoom(roomName))
            return actualOpts.sourceKeeperRoomCost;
        return actualOpts.defaultRoomCost;
    });
    // Generate base route, taking portals into account
    const generatedRoutes = findRouteWithPortals(room1, targetRooms, {
        routeCallback: memoizedRouteCallback
    }, actualOpts.avoidPortals);
    if (generatedRoutes === ERR_NO_PATH)
        return undefined;
    // enhance the route with extra rooms to improve pathfinding
    return generatedRoutes.map(route => {
        const rooms = enhanceRoute(route, memoizedRouteCallback, actualOpts);
        return {
            rooms,
            portalSet: route[route.length - 1]?.portalSet
        };
    });
}
/**
 * Adds extra rooms to a given route to improve pathfinding (e.g. routing through
 * an inside corner when the route turns)
 */
function enhanceRoute(route, memoizedRouteCallback, actualOpts) {
    let rooms = new Set(route.map(({ room }) => room));
    const maxRooms = actualOpts.maxRooms;
    for (let i = 0; i < route.length - 1; i++) {
        // check if we've met our limit
        if (rooms.size >= maxRooms)
            break;
        if (!route[i].exit)
            break;
        // check for areas PathFinder might be able to optimize
        // Route turns a corner: add the room inside the corner
        if (route[i].exit !== route[i + 1].exit) {
            const detour = Game.map.describeExits(route[i].room)[route[i + 1].exit];
            if (detour &&
                Game.map.findExit(detour, route[i + 1].room) > 0 &&
                memoizedRouteCallback(detour, route[i].room) !== Infinity) {
                // detour room is connected
                rooms.add(detour);
            }
        }
        // Route is straight, but exit tiles are all to one side of the border
        // Might be faster to detour through neighboring rooms
        if ((route[i].exit === route[i + 1].exit || !route[i + 1].exit) &&
            (!route[i + 2]?.exit || route[i].exit === route[i + 2].exit)) {
            if (rooms.size >= actualOpts.maxRooms - 1)
                continue; // detour will take two rooms, ignore
            // Straight line for the next three rooms (or until route ends)
            // Check if there are exit tiles on both halves of the border
            const regions = exitTileRegions(route[i].room, route[i].exit);
            if (regions.every(r => r)) {
                continue;
            }
            // one half does not have an exit tile.
            let detour = undefined;
            if (!regions[0] && (route[i].exit === FIND_EXIT_TOP || route[i].exit === FIND_EXIT_BOTTOM)) {
                detour = FIND_EXIT_LEFT;
            }
            else if (!regions[1] && (route[i].exit === FIND_EXIT_TOP || route[i].exit === FIND_EXIT_BOTTOM)) {
                detour = FIND_EXIT_RIGHT;
            }
            else if (!regions[0] && (route[i].exit === FIND_EXIT_LEFT || route[i].exit === FIND_EXIT_RIGHT)) {
                detour = FIND_EXIT_TOP;
            }
            else if (!regions[1] && (route[i].exit === FIND_EXIT_LEFT || route[i].exit === FIND_EXIT_RIGHT)) {
                detour = FIND_EXIT_BOTTOM;
            }
            if (!detour)
                throw new Error('Invalid exit tile state: ' + route[i].exit + JSON.stringify(regions));
            // check detour rooms for continuity
            const detour1 = Game.map.describeExits(route[i].room)[detour];
            const detour2 = Game.map.describeExits(route[i + 1].room)[detour];
            if (detour1 &&
                detour2 &&
                Game.map.findExit(detour1, detour2) > 0 &&
                memoizedRouteCallback(detour1, route[i].room) !== Infinity &&
                memoizedRouteCallback(detour2, route[i + 1].room) !== Infinity) {
                // detour rooms are connected
                rooms.add(detour1);
                rooms.add(detour2);
            }
        }
    }
    // now floodfill adjoining rooms, up to maxRooms
    const frontier = [...rooms];
    while (rooms.size < maxRooms) {
        const room = frontier.shift();
        if (!room)
            break;
        const exits = Game.map.describeExits(room);
        if (!exits)
            continue;
        for (const adjacentRoom of Object.values(exits)) {
            if (rooms.has(adjacentRoom))
                continue;
            if (memoizedRouteCallback(adjacentRoom, room) !== Infinity) {
                rooms.add(adjacentRoom);
                frontier.push(adjacentRoom);
            }
        }
    }
    return [...rooms];
}
function exitTileRegions(room, exit) {
    const terrain = Game.map.getRoomTerrain(room);
    let region1 = false;
    for (let i = 0; i < 25; i++) {
        const { x, y } = exitTileByIndex(exit, i);
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
            region1 = true;
            break;
        }
    }
    let region2 = false;
    for (let i = 25; i < 49; i++) {
        const { x, y } = exitTileByIndex(exit, i);
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
            region2 = true;
            break;
        }
    }
    return [region1, region2];
}
function exitTileByIndex(exit, index) {
    if (exit === FIND_EXIT_TOP)
        return { x: index, y: 0 };
    if (exit === FIND_EXIT_BOTTOM)
        return { x: index, y: 49 };
    if (exit === FIND_EXIT_LEFT)
        return { x: 0, y: index };
    return { x: 49, y: index }; // FIND_EXIT_RIGHT
}
class PriorityQueue {
    queue = [];
    put(item, priority) {
        let insertIndex = this.queue.findIndex(([p]) => p > priority);
        if (insertIndex === -1)
            insertIndex = this.queue.length;
        this.queue.splice(insertIndex, 0, [priority, item]);
    }
    take() {
        return this.queue.shift()?.[1];
    }
    *[Symbol.iterator]() {
        for (const [_, item] of this.queue) {
            yield item;
        }
    }
}
const manhattanDistance = memoizeByTick((fromRoom, toRoom) => fromRoom + toRoom, (fromRoom, toRoom) => {
    const { wx: fromX, wy: fromY } = roomNameToCoords(fromRoom);
    const { wx: toX, wy: toY } = roomNameToCoords(toRoom);
    // Manhattan distance
    return Math.abs(fromX - toX) + Math.abs(fromY - toY);
});
const manhattanDistanceToClosestPortal = memoizeByTick(room => room, (room) => {
    let minDistance = Infinity;
    for (const portal of portalSets.keys()) {
        minDistance = Math.min(minDistance, manhattanDistance(room, portal));
    }
    return minDistance;
});
/**
 * Normal A* heuristic would just be the manhattan distance - here we
 * must include distance to the nearest portals as well. This is still
 * an admissible heuristic: https://stackoverflow.com/a/14428389
 */
function findRouteHeuristic(fromRoom, toRoom) {
    return Math.min(manhattanDistance(fromRoom, toRoom), manhattanDistanceToClosestPortal(fromRoom) + manhattanDistanceToClosestPortal(toRoom));
}
/**
 * Returns a sequence of rooms. Exits between rooms may be normal room exits or a portal set.
 */
function findRouteWithPortals(fromRoom, toRooms, opts, avoidPortals) {
    if (toRooms.includes(fromRoom))
        return [];
    const routeCallback = opts?.routeCallback ?? (() => 1);
    // A* search, using describeExits to map the grid
    const frontier = new PriorityQueue();
    frontier.put(fromRoom, 0);
    const cameFrom = new Map();
    const costSoFar = new Map();
    cameFrom.set(fromRoom, fromRoom);
    costSoFar.set(fromRoom, 0);
    let current = frontier.take();
    while (current) {
        if (toRooms.includes(current))
            break;
        for (const next of describeExitsWithPortals(current)) {
            const cost = costSoFar.get(current) + routeCallback(current, next);
            if (cost !== Infinity && (!costSoFar.has(next) || cost < costSoFar.get(next))) {
                costSoFar.set(next, cost);
                const priority = cost + Math.min(...toRooms.map(toRoom => findRouteHeuristic(next, toRoom)));
                frontier.put(next, priority);
                cameFrom.set(next, current);
            }
        }
        current = frontier.take();
    }
    if (current && toRooms.includes(current)) {
        // reconstruct path
        const paths = [];
        let path = [{ room: current }];
        while (current !== fromRoom) {
            const previous = cameFrom.get(current);
            const portalSet = portalSets.get(previous)?.get(current);
            if (portalSet && !avoidPortals) {
                // there's a portal between these two rooms - use it
                paths.unshift(path);
                path = [{ room: previous, portalSet }];
            }
            else {
                // no portal - must be a regular exit
                const exit = Game.map.findExit(previous, current);
                path.unshift({
                    room: previous,
                    exit: exit === ERR_NO_PATH ? undefined : exit
                });
            }
            current = previous;
        }
        paths.unshift(path);
        return paths;
    }
    return ERR_NO_PATH;
}

/**
 * Generates a path with PathFinder.
 */
function generatePath(origin, targets, opts) {
    // Generate full opts object
    let actualOpts = {
        ...config.DEFAULT_MOVE_OPTS,
        ...opts
    };
    // Dynamic choose weight for roads, plains and swamps depending on body.
    if (opts?.creepMovementInfo) {
        actualOpts = { ...actualOpts, ...defaultTerrainCosts(opts.creepMovementInfo) };
    }
    // generate a route to limit search space
    const targetRooms = targets.reduce((rooms, { pos }) => (rooms.includes(pos.roomName) ? rooms : [pos.roomName, ...rooms]), []);
    let routes = findRoute(origin.roomName, targetRooms, actualOpts);
    // generate path for each route segment
    if (!routes?.length || routes.length === 1) {
        const rooms = routes?.[0]?.rooms;
        // No portals - just generate a single path
        const result = PathFinder.search(origin, targets, {
            ...actualOpts,
            maxOps: Math.min(actualOpts.maxOps ?? 100000, (actualOpts.maxOpsPerRoom ?? 2000) * (rooms?.length ?? 1)),
            roomCallback: configureRoomCallback(actualOpts, rooms)
        });
        if (!result.path.length || result.incomplete)
            return undefined;
        return result.path;
    }
    else {
        // Generate paths to each portalSet and then merge into a single path
        let workingOrigin = origin;
        const path = [];
        for (const route of routes) {
            if (!route.portalSet) {
                // no portal set - this is the last segment of the path, go to the actual targets
                const result = PathFinder.search(workingOrigin, targets, {
                    ...actualOpts,
                    maxOps: Math.min(actualOpts.maxOps ?? 100000, (actualOpts.maxOpsPerRoom ?? 2000) * route.rooms.length),
                    roomCallback: configureRoomCallback(actualOpts, route.rooms)
                });
                if (!result.path.length || result.incomplete)
                    return undefined;
                path.push(...result.path);
            }
            else {
                // portal set - pathfind to the closest portal in the portalset
                const lastRoom = route.rooms.includes(route.portalSet.room1) ? route.portalSet.room1 : route.portalSet.room2;
                const portalTargets = (lastRoom === route.portalSet.room1
                    ? [...route.portalSet.portalMap.keys()]
                    : [...route.portalSet.portalMap.values()]).map(coord => ({ pos: new RoomPosition(coord.x, coord.y, lastRoom), range: 1 }));
                const result = PathFinder.search(workingOrigin, portalTargets, {
                    ...actualOpts,
                    maxOps: Math.min(actualOpts.maxOps ?? 100000, (actualOpts.maxOpsPerRoom ?? 2000) * route.rooms.length),
                    roomCallback: configureRoomCallback(actualOpts, route.rooms)
                });
                if (!result.path.length || result.incomplete)
                    return undefined;
                // paths to range 1 of portal - select a portal at the end of the path
                const portal = portalTargets.find(t => t.pos.isNearTo(result.path[result.path.length - 1])).pos;
                path.push(...result.path, portal);
                // The next path begins at the destination of the target portal
                if (route.portalSet.room1 === lastRoom) {
                    const destination = route.portalSet.portalMap.get(portal);
                    if (!destination)
                        throw new Error(`Portal ${portal} not found in portalSet ${JSON.stringify(route.portalSet)}`);
                    workingOrigin = new RoomPosition(destination.x, destination.y, route.portalSet.room2);
                }
                else {
                    const destination = route.portalSet.portalMap.reversed.get(portal);
                    if (!destination)
                        throw new Error(`Portal ${portal} not found in portalSet ${JSON.stringify(route.portalSet)}`);
                    workingOrigin = new RoomPosition(destination.x, destination.y, route.portalSet.room1);
                }
            }
        }
        return path;
    }
}
function defaultTerrainCosts(creepInfo) {
    const result = {
        roadCost: config.DEFAULT_MOVE_OPTS.roadCost || 1,
        plainCost: config.DEFAULT_MOVE_OPTS.plainCost || 2,
        swampCost: config.DEFAULT_MOVE_OPTS.swampCost || 10
    };
    let totalCarry = creepInfo.usedCapacity;
    let moveParts = 0;
    let usedCarryParts = 0;
    let otherBodyParts = 0;
    // Iterating right to left because carry parts are filled in that order.
    for (let i = creepInfo.body.length - 1; i >= 0; i--) {
        const bodyPart = creepInfo.body[i];
        if (bodyPart.type !== MOVE && bodyPart.type !== CARRY) {
            otherBodyParts++;
        }
        else if (bodyPart.hits <= 0) {
            continue;
        }
        else if (bodyPart.type === MOVE) {
            let boost = 1;
            if (bodyPart.boost) {
                boost = BOOSTS[MOVE][bodyPart.boost].fatigue;
            }
            moveParts += 1 * boost;
        }
        else if (totalCarry > 0 && bodyPart.type === CARRY) {
            let boost = 1;
            if (bodyPart.boost) {
                boost = BOOSTS[CARRY][bodyPart.boost].capacity;
            }
            // We count carry parts used by removing the capacity used by them from the total that the creep is carrying.
            // When total is empty, resting carry parts doesn't generate fatigue (even if they have no hits).
            totalCarry -= CARRY_CAPACITY * boost;
            usedCarryParts++;
        }
    }
    // If no move parts it can't move, skip and apply defaults to speed this up.
    if (moveParts > 0) {
        const fatigueFactor = usedCarryParts + otherBodyParts;
        const recoverFactor = moveParts * 2;
        // In case cost is 0 (only move parts), all terrains will cost 1.
        // Hardcoding 0.1 as minimum cost to obtain this result.
        const cost = Math.max(fatigueFactor / recoverFactor, 0.1);
        // Number of ticks that it takes move over each terrain.
        // Having this as a separated function could be interesting for obtaining how many ticks
        // it will take a creep to walk over a route with determined terrains.
        const roadCost = Math.ceil(cost);
        const plainCost = Math.ceil(cost * 2);
        const swampCost = Math.ceil(cost * 10);
        // Greatest common divisor.
        // https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/gcd.md
        const gcd = (...arr) => {
            const _gcd = (x, y) => (!y ? x : gcd(y, x % y));
            return [...arr].reduce((a, b) => _gcd(a, b));
        };
        // Calculate the greatest common divisor so we can reduce the costs to the smallest numbers possible.
        const norm = gcd(roadCost, plainCost, swampCost);
        // Normalize and set the default costs. This costs are going to be always under the 255 limit.
        // Worst scenario is with 49 not move body parts and only 1 move part. This means a cost of 24.5,
        // implying 25 / 49 / 245 costs for each terrain.
        result.roadCost = roadCost / norm;
        result.plainCost = plainCost / norm;
        result.swampCost = swampCost / norm;
    }
    return result;
}

const generateIndexes = () => ({
    creep: new Map(),
    priority: new Map(),
    targets: new Map(),
    pullers: new Set(),
    pullees: new Set(),
    prefersToStay: new Set(),
    blockedSquares: new Set()
});
let _indexes = new Map();
let tick = 0;
/**
 * Gets the current tick's move intents, recreating the indexes
 * if the data is stale from the previous tick
 *
 * Returns:
 *  - creep: Index of intents by creep
 *  - priority: Index of intents by priority, then by number of viable target squares, then by creep
 *  - targets: Index of intents by position, then by creep
 *  - pullers: Index of puller creeps
 */
function getMoveIntents(room) {
    if (Game.time !== tick) {
        tick = Game.time;
        _indexes = new Map();
    }
    _indexes.set(room, _indexes.get(room) ?? generateIndexes());
    return _indexes.get(room);
}
/**
 * Lists the rooms with move intents to handle
 */
function getMoveIntentRooms() {
    return [..._indexes.keys()];
}
/**
 * Register a pull intent (used to avoid breaking trains of
 * pulled creeps)
 */
function registerPull(puller, pullee) {
    const intents = getMoveIntents(puller.pos.roomName);
    intents.pullers.add(puller.id);
    intents.pullees.add(pullee.id);
}
/**
 * Register a move intent (adds to a couple indexes for quick lookups)
 */
function registerMove(intent, pulled = false) {
    if ('fatigue' in intent.creep && intent.creep.fatigue && !pulled) {
        intent.targets = [intent.creep.pos];
    }
    intent.targetCount ??= intent.targets.length;
    const indexes = getMoveIntents(intent.creep.pos.roomName);
    // cancel old intent, if needed
    cancelMove(indexes.creep.get(intent.creep.id));
    // register new one
    indexes.creep.set(intent.creep.id, intent);
    const byPriority = indexes.priority.get(intent.priority) ?? new Map();
    indexes.priority.set(intent.priority, byPriority);
    const byTargetCount = byPriority.get(intent.targets.length) ?? new Map();
    byPriority.set(intent.targets.length, byTargetCount);
    byTargetCount.set(intent.creep.id, intent);
    for (const target of intent.targets) {
        const key = packPos(target);
        const targets = indexes.targets.get(key) ?? new Map();
        indexes.targets.set(key, targets);
        targets.set(intent.creep.id, intent);
    }
    if (intent.targets.length && intent.targets[0].isEqualTo(intent.creep.pos)) {
        indexes.prefersToStay.add(packPos(intent.creep.pos));
    }
}
/**
 * Register a move intent (adds to a couple indexes for quick lookups)
 */
function cancelMove(intent) {
    if (!intent)
        return;
    intent.targetCount ??= intent.targets.length;
    const indexes = getMoveIntents(intent.creep.pos.roomName);
    indexes.creep.delete(intent.creep.id);
    indexes.priority.get(intent.priority)?.get(intent.targets.length)?.delete(intent.creep.id);
    for (const target of intent.targets) {
        const key = packPos(target);
        indexes.targets.get(key)?.delete(intent.creep.id);
    }
}
/**
 * Updates an intent's indexes when its target count changes
 */
function updateIntentTargetCount(intent, oldCount, newCount) {
    const indexes = getMoveIntents(intent.creep.pos.roomName);
    const byPriority = indexes.priority.get(intent.priority) ?? new Map();
    byPriority.get(oldCount)?.delete(intent.creep.id);
    indexes.priority.set(intent.priority, byPriority);
    const byTargetCount = byPriority.get(newCount) ?? new Map();
    byPriority.set(newCount, byTargetCount);
    byTargetCount.set(intent.creep.id, intent);
}
/**
 * Blocks a specific square, to vacate a space for e.g. creating a construction site or spawning
 */
function blockSquare(pos) {
    getMoveIntents(pos.roomName).blockedSquares.add(packPos(pos));
}

const measure = (callback) => {
    const start = Game.cpu.getUsed();
    callback();
    return Math.max(0, Game.cpu.getUsed() - start);
};

// import { logCpu, logCpuStart } from '../../utils/logCpu';
const keys$4 = {
    RECONCILE_TRAFFIC_RAN: '_crr'
};
/**
 * Checks if the reconcile function has run recently. If not, creeps will
 * fall back to unmanaged movement to preserve some functionality.
 */
function reconciledRecently() {
    const lastReconciled = MemoryCache.with(NumberSerializer).get(keys$4.RECONCILE_TRAFFIC_RAN);
    return Boolean(lastReconciled && Game.time - 2 <= lastReconciled);
}
let efficiency = [];
/**
 * Include this function in your main loop after all creep movement to enable traffic
 * management.
 *
 * Warning: if your bucket overflows and this doesn't run, your creeps will not move.
 * Creeps will fall back to unmanaged movement if the reconcileTraffic is not executed
 * after two ticks.
 */
function reconcileTraffic(opts) {
    for (const room of getMoveIntentRooms()) {
        if (!Game.rooms[room])
            continue;
        reconcileTrafficByRoom(room, opts);
    }
    // log that traffic management is active
    MemoryCache.with(NumberSerializer).set(keys$4.RECONCILE_TRAFFIC_RAN, Game.time);
}
function reconcileTrafficByRoom(room, opts) {
    const start = Game.cpu.getUsed();
    let moveTime = 0;
    const moveIntents = getMoveIntents(room);
    const used = moveIntents.blockedSquares;
    // visualize
    if (opts?.visualize) {
        for (const { creep, targets, priority } of moveIntents.creep.values()) {
            targets.forEach(t => {
                if (t.isEqualTo(creep.pos)) {
                    Game.rooms[creep.pos.roomName].visual.circle(creep.pos, {
                        radius: 0.5,
                        stroke: 'orange',
                        fill: 'transparent'
                    });
                }
                else {
                    Game.rooms[creep.pos.roomName].visual.line(creep.pos, t, { color: 'orange' });
                }
            });
        }
    }
    // Set move intents for shove targets
    for (const creep of Game.rooms[room].find(FIND_MY_CREEPS).concat(Game.rooms[room].find(FIND_MY_POWER_CREEPS))) {
        if (moveIntents.creep.has(creep.id) || moveIntents.pullees.has(creep.id) || moveIntents.pullers.has(creep.id))
            continue;
        registerMove({
            creep,
            priority: 0,
            targets: [creep.pos, ...adjacentWalkablePositions(creep.pos, true)]
        });
        if (opts?.visualize) {
            Game.rooms[creep.pos.roomName].visual.circle(creep.pos, { radius: 1, stroke: 'red', fill: 'transparent ' });
        }
    }
    // remove pullers as move targets
    for (const puller of moveIntents.pullers) {
        const creep = Game.getObjectById(puller);
        if (!creep)
            continue;
        const posKey = packPos(creep.pos);
        used.add(posKey);
        for (const intent of moveIntents.targets.get(posKey)?.values() ?? []) {
            if (intent.creep.id === puller)
                continue;
            intent.targetCount ??= intent.targets.length;
            const oldCount = intent.targetCount;
            intent.targetCount -= 1;
            // update priority/count index
            updateIntentTargetCount(intent, oldCount, intent.targetCount);
        }
    }
    // logCpuStart();
    const priorities = [...moveIntents.priority.entries()].sort((a, b) => b[0] - a[0]);
    // logCpu('sorting priorities');
    for (const [_, priority] of priorities) {
        while (priority.size) {
            const minPositionCount = Math.min(...priority.keys());
            const intents = priority.get(minPositionCount);
            if (!intents)
                break;
            if (!intents.size)
                priority.delete(minPositionCount);
            // logCpu('getting prioritized intents');
            const intentStack = [...intents.values()];
            while (intentStack.length) {
                const intent = intentStack.shift();
                if (!intent)
                    break;
                if (intent.resolved) {
                    // a swapping creep will sometimes end up on the stack twice.
                    // if its move has already been resolved, ignore it
                    intents.delete(intent.creep.id);
                    continue;
                }
                // for (const intent of [...intents.values()]) {
                if (opts?.visualize) {
                    intent.targets.forEach(t => {
                        if (t.isEqualTo(intent.creep.pos)) {
                            Game.rooms[intent.creep.pos.roomName].visual.circle(intent.creep.pos, {
                                radius: 0.5,
                                stroke: 'yellow',
                                strokeWidth: 0.2,
                                fill: 'transparent',
                                opacity: 0.2
                            });
                        }
                        else {
                            Game.rooms[intent.creep.pos.roomName].visual.line(intent.creep.pos, t, { color: 'yellow', width: 0.2 });
                        }
                    });
                }
                // get the first position with no conflicts, or else the position with
                // fewest conflicts
                let targetPos = undefined;
                for (const target of intent.targets) {
                    const p = packPos(target);
                    if (used.has(p) && !(intent.creep.pos.isEqualTo(target) && moveIntents.pullers.has(intent.creep.id)))
                        continue; // a creep is already moving here
                    if (intent.creep.pos.isEqualTo(target) || !moveIntents.prefersToStay.has(p)) {
                        // best case - no other creep prefers to stay here
                        targetPos = target;
                        break;
                    }
                    targetPos ??= target;
                }
                // handling intent, remove from queue
                intents.delete(intent.creep.id);
                // logCpu('handling intent');
                if (!targetPos) {
                    // no movement options
                    if (opts?.visualize) {
                        Game.rooms[intent.creep.pos.roomName].visual
                            .line(intent.creep.pos.x - 0.5, intent.creep.pos.y - 0.5, intent.creep.pos.x + 0.5, intent.creep.pos.y + 0.5, { color: 'red' })
                            .line(intent.creep.pos.x - 0.5, intent.creep.pos.y + 0.5, intent.creep.pos.x + 0.5, intent.creep.pos.y - 0.5, { color: 'red' });
                    }
                    continue;
                }
                // resolve intent
                moveTime += measure(() => intent.creep.move(intent.creep.pos.getDirectionTo(targetPos)));
                intent.resolved = true;
                // logCpu('resolving intent');
                if (opts?.visualize)
                    Game.rooms[intent.creep.pos.roomName].visual.line(intent.creep.pos, targetPos, {
                        color: 'green',
                        width: 0.5
                    });
                // remove pos from other intents targeting the same position
                const posKey = packPos(targetPos);
                used.add(posKey);
                for (const sameTargetIntent of moveIntents.targets.get(posKey)?.values() ?? []) {
                    if (sameTargetIntent.resolved)
                        continue;
                    sameTargetIntent.targetCount ??= sameTargetIntent.targets.length;
                    const oldCount = sameTargetIntent.targetCount;
                    sameTargetIntent.targetCount -= 1;
                    // update priority/count index
                    updateIntentTargetCount(sameTargetIntent, oldCount, sameTargetIntent.targetCount);
                }
                // logCpu('removing move position from other intents');
                // if a creep in the destination position is moving to this position, override
                // any other intents moving to this position
                if (!targetPos.isEqualTo(intent.creep.pos) && !moveIntents.pullers.has(intent.creep.id)) {
                    const swapPos = packPos(intent.creep.pos);
                    const movingHereIntents = [...(moveIntents.targets.get(swapPos)?.values() ?? [])].filter(i => i !== intent && i.targets.length < 2);
                    const swapCreep = movingHereIntents.find(i => !i.resolved && targetPos?.isEqualTo(i.creep.pos) && !moveIntents.pullers.has(i.creep.id));
                    if (swapCreep) {
                        if (opts?.visualize)
                            Game.rooms[swapCreep.creep.pos.roomName].visual.circle(swapCreep.creep.pos, {
                                radius: 0.2,
                                fill: 'green'
                            });
                        // override previously resolved intents
                        movingHereIntents
                            .filter(i => i.resolved)
                            .forEach(i => {
                            if (opts?.visualize)
                                Game.rooms[i.creep.pos.roomName].visual.circle(i.creep.pos, { radius: 0.2, fill: 'red' });
                        });
                        used.delete(swapPos);
                        // handle swapCreep next
                        intentStack.unshift(swapCreep);
                    }
                }
            }
        }
    }
    const totalTime = Math.max(0, Game.cpu.getUsed() - start);
    efficiency.push(moveTime / totalTime);
    if (efficiency.length > 1500)
        efficiency = efficiency.slice(-1500);
    // console.log(
    //   `reconcileTraffic: total(${totalTime.toFixed(3)} cpu), efficiency(${(
    //     (100 * efficiency.reduce((a, b) => a + b)) /
    //     efficiency.length
    //   ).toFixed(2)}%)`
    // );
}

/**
 * Registers a move intent with the Traffic Manager, if reconcileTraffic has
 * run recently, or else falls back to a regular move
 */
function move(creep, targets, priority = 1) {
    if (!creep.pos)
        return ERR_INVALID_ARGS;
    if (reconciledRecently()) {
        // Traffic manager is running
        registerMove({
            creep,
            targets,
            priority
        });
        return OK;
    }
    else {
        // fall back to regular movement
        if (targets[0].isEqualTo(creep.pos))
            return OK;
        return creep.move(creep.pos.getDirectionTo(targets[0]));
    }
}

const cachedPathKey = (key) => `_poi_${key}`;
const keys$3 = {
    MOVE_BY_PATH_INDEX: '_cpi'
};
/**
 * Generate a path from `origin` to `destination`, based on the passed `opts`. Caches
 * the path in the configured cache (or MemoryCache by default) with the provided key.
 * Returns the generated path (or the cached version, if it exists).
 */
function cachePath(key, origin, targets, opts) {
    const actualOpts = {
        ...config.DEFAULT_MOVE_OPTS,
        ...opts
    };
    const cache = actualOpts.cache ?? MemoryCache;
    const normalizedTargets = normalizeTargets(targets, opts?.keepTargetInRoom, opts?.flee);
    if (opts?.visualizePathStyle) {
        const style = {
            ...config.DEFAULT_VISUALIZE_OPTS,
            ...opts.visualizePathStyle
        };
        for (const t of normalizedTargets) {
            new RoomVisual(t.pos.roomName).rect(t.pos.x - t.range - 0.5, t.pos.y - t.range - 0.5, t.range * 2 + 1, t.range * 2 + 1, style);
        }
    }
    // check if cached POI already exists
    const cached = cache.with(PositionListSerializer).get(cachedPathKey(key));
    if (cached) {
        return cached;
    }
    // create paths
    const path = generatePath(origin, normalizedTargets, {
        ...actualOpts,
        flee: false // flee is taken into account in normalizeTargets
    });
    if (path) {
        const expiration = actualOpts.reusePath ? Game.time + actualOpts.reusePath + 1 : undefined;
        cache.with(PositionListSerializer).set(cachedPathKey(key), path, expiration);
    }
    return path;
}
/**
 * Gets a cached path for a given key
 */
function getCachedPath(key, opts) {
    const cache = opts?.cache ?? MemoryCache;
    return cache.with(PositionListSerializer).get(cachedPathKey(key));
}
/**
 * Clears a cached path for a given key
 */
function resetCachedPath(key, opts) {
    const cache = opts?.cache ?? MemoryCache;
    cache.delete(cachedPathKey(key));
}
/**
 * Moves a creep along a cached path. If `opts.reverse`, moves it backwards.
 * Returns ERR_NO_PATH if the cached path doesn't exist, and ERR_NOT_FOUND if
 * the creep is not on the path. In most cases, you'll want to use `moveByPath`
 * instead; this is used internally by `moveTo`.
 */
function followPath(creep, key, opts) {
    const cache = opts?.cache ?? MemoryCache;
    const path = cache.with(PositionListSerializer).get(cachedPathKey(key));
    // unspawned power creeps have undefined pos
    if (!creep.pos)
        return ERR_INVALID_ARGS;
    if (!path)
        return ERR_NO_PATH;
    // check if move is done
    if ((opts?.reverse && creep.pos.isEqualTo(path[0])) ||
        (!opts?.reverse && creep.pos.isEqualTo(path[path.length - 1]))) {
        return OK;
    }
    // check if creep's position is up to date
    let currentIndex = HeapCache.get(creepKey(creep, keys$3.MOVE_BY_PATH_INDEX));
    if (currentIndex !== undefined) {
        let nextIndex = Math.max(0, Math.min(path.length - 1, opts?.reverse ? currentIndex - 1 : currentIndex + 1));
        if (path[nextIndex]?.isEqualTo(creep.pos)) {
            currentIndex = nextIndex;
        }
        else if (!path[currentIndex]?.isEqualTo(creep.pos)) {
            currentIndex = undefined; // not at the next position, not at the cached position - reorient
        }
    }
    if (currentIndex === undefined) {
        // don't know where creep is; check if it's on the path
        const index = path.findIndex(p => p.isEqualTo(creep.pos));
        if (index !== -1) {
            currentIndex = index;
        }
    }
    // otherwise, check if it's adjacent to one end of the path
    if (currentIndex === undefined && !opts?.reverse && getRangeTo(path[0], creep.pos) <= 1) {
        currentIndex = -1;
    }
    if (currentIndex === undefined && opts?.reverse && getRangeTo(path[path.length - 1], creep.pos) <= 1) {
        currentIndex = path.length;
    }
    if (currentIndex === undefined) {
        // Unable to find our location relative to the path
        return ERR_NOT_FOUND;
    }
    HeapCache.set(creepKey(creep, keys$3.MOVE_BY_PATH_INDEX), currentIndex);
    // creep is on the path and index is valid
    let nextIndex = Math.max(0, Math.min(path.length - 1, opts?.reverse ? currentIndex - 1 : currentIndex + 1));
    // visualize path
    if (opts?.visualizePathStyle) {
        const style = {
            ...config.DEFAULT_VISUALIZE_OPTS,
            ...opts.visualizePathStyle
        };
        const pathSegment = slicedPath(path, currentIndex, opts?.reverse);
        // TODO - Should power creep's room prop be optional?
        creep.room?.visual.poly(pathSegment.filter(pos => pos.roomName === creep.room?.name), style);
    }
    const result = move(creep, [path[nextIndex]], opts?.priority);
    return result;
}

const pathHasAvoidTargets = (path, avoidTargets) => {
    if (path.length === 0 || avoidTargets.length === 0)
        return false; // no path or no avoid targets
    return path.some((pos) => {
        return avoidTargets.some((target) => {
            return pos.inRangeTo(target.pos, target.range);
        });
    });
};

const keys$2 = {
    LAST_POSITION: '_csp',
    LAST_POSITION_TIME: '_cst'
};
/**
 * Tracks a creep's position and returns true if it has no fatigue
 * but has not moved in `stuckLimit` ticks
 */
const creepIsStuck = (creep, stuckLimit) => {
    // unspawned power creeps have undefined pos
    if (!creep.pos)
        return false;
    if ('fatigue' in creep && creep.fatigue > 0)
        return false;
    // get last position
    const lastPos = HeapCache.get(creepKey(creep, keys$2.LAST_POSITION));
    const lastTime = HeapCache.get(creepKey(creep, keys$2.LAST_POSITION_TIME));
    // go ahead and update pos in the cache
    HeapCache.set(creepKey(creep, keys$2.LAST_POSITION), creep.pos);
    if (!lastPos || !lastTime || !creep.pos.isEqualTo(lastPos)) {
        // start counting
        HeapCache.set(creepKey(creep, keys$2.LAST_POSITION_TIME), Game.time);
        return false;
    }
    // true if creep has been here (with no fatigue) for longer than stuckLimit
    return lastTime + stuckLimit < Game.time;
};

const JsonSerializer = {
    key: 'js',
    serialize(target) {
        if (target === undefined)
            return undefined;
        return JSON.stringify(target);
    },
    deserialize(target) {
        if (target === undefined)
            return undefined;
        return JSON.parse(target);
    }
};

const keys$1 = {
    CACHED_PATH: '_cp',
    CACHED_PATH_EXPIRES: '_ce',
    CACHED_PATH_TARGETS: '_ct',
    CACHED_PATH_OPTS: '_co',
    MOVE_BY_PATH_INDEX: '_cpi'
};
const optCacheFields = [
    'avoidCreeps',
    'avoidObstacleStructures',
    'flee',
    'plainCost',
    'swampCost',
    'roadCost'
];
/**
 * Clears all data for a cached path (useful to force a repath)
 */
function clearCachedPath(creep, cache = CachingStrategies.HeapCache) {
    resetCachedPath(creepKey(creep, keys$1.CACHED_PATH), { cache });
    cache.delete(creepKey(creep, keys$1.CACHED_PATH_TARGETS));
    cache.delete(creepKey(creep, keys$1.CACHED_PATH_OPTS));
}
/**
 * Replacement for the builtin moveTo, but passes through options to PathFinder. Supports
 * multiple targets, flee, etc. See `MoveOpts`.
 *
 * If fallbackOpts is specified, the options will override `opts` *only* if `repathIfStuck`
 * triggers a repath. This lets you ignore creeps until a creep gets stuck, then repath around
 * them, for example.
 */
const moveTo = (creep, targets, opts, fallbackOpts = { avoidCreeps: true }) => {
    // unspawned power creeps have undefined pos
    if (!creep.pos)
        return ERR_INVALID_ARGS;
    // map defaults onto opts
    let actualOpts = {
        ...config.DEFAULT_MOVE_OPTS,
        ...opts
    };
    // select cache for path
    const cache = opts?.cache ?? CachingStrategies.HeapCache;
    // convert target from whatever format to MoveTarget[]
    let normalizedTargets = normalizeTargets(targets, actualOpts.keepTargetInRoom, actualOpts.flee);
    let needToFlee = false;
    let cachedTargets = cache.with(MoveTargetListSerializer).get(creepKey(creep, keys$1.CACHED_PATH_TARGETS));
    for (const { pos, range } of normalizedTargets) {
        // check if movement is complete
        if (!needToFlee && pos.inRangeTo(creep.pos, range) && creep.pos.roomName === pos.roomName) {
            if (!opts?.flee) {
                // no need to move, path complete
                clearCachedPath(creep, cache);
                // register move intent to stay here or in an adjacent viable position
                const cm = configureRoomCallback(actualOpts)(creep.pos.roomName);
                move(creep, [
                    creep.pos,
                    ...adjacentWalkablePositions(creep.pos, true).filter(p => normalizedTargets.some(t => t.pos.inRangeTo(p, t.range)) && (!cm || cm.get(p.x, p.y) !== 255) // exclude squares that are blocked by a cost matrix
                    )
                ], actualOpts.priority);
                return OK;
            }
            else {
                needToFlee = true; // need to move, still in range of flee targets
            }
        }
        // check if cached targets are the same
        if (cachedTargets && !cachedTargets.some(t => t && pos.isEqualTo(t.pos) && range === t.range)) {
            // cached path had different targets
            clearCachedPath(creep, cache);
            cachedTargets = undefined;
        }
    }
    // if relevant opts have changed, clear cached path
    const cachedOpts = cache.with(JsonSerializer).get(creepKey(creep, keys$1.CACHED_PATH_OPTS));
    if (!cachedOpts || optCacheFields.some(f => actualOpts[f] !== cachedOpts[f])) {
        clearCachedPath(creep, cache);
    }
    const manuallyDefinedCosts = [opts?.roadCost, opts?.plainCost, opts?.swampCost].some(cost => cost !== undefined);
    if ('body' in creep && !manuallyDefinedCosts) {
        actualOpts = {
            creepMovementInfo: { usedCapacity: creep.store.getUsedCapacity(), body: creep.body },
            ...actualOpts
        };
    }
    // cache opts
    const expiration = actualOpts.reusePath ? Game.time + actualOpts.reusePath + 1 : undefined;
    cache.with(MoveTargetListSerializer).set(creepKey(creep, keys$1.CACHED_PATH_TARGETS), normalizedTargets, expiration);
    cache.with(JsonSerializer).set(creepKey(creep, keys$1.CACHED_PATH_OPTS), optCacheFields.reduce((sum, f) => {
        sum[f] = actualOpts[f];
        return sum;
    }, {}), expiration);
    // If creep is stuck, we need to repath
    const cachedPath = getCachedPath(creepKey(creep, keys$1.CACHED_PATH), { cache });
    const cachedMoveIndex = HeapCache.get(creepKey(creep, keys$1.MOVE_BY_PATH_INDEX));
    const slicedCachedPath = cachedPath && slicedPath(cachedPath, cachedMoveIndex ?? 0);
    const avoidTargets = actualOpts.avoidTargets?.(creep.pos.roomName) ?? [];
    if (actualOpts.repathIfStuck && cachedPath && creepIsStuck(creep, actualOpts.repathIfStuck)) {
        resetCachedPath(creepKey(creep, keys$1.CACHED_PATH), { cache });
        actualOpts = {
            ...actualOpts,
            ...fallbackOpts
        };
    }
    else if (slicedCachedPath?.length && pathHasAvoidTargets(slicedCachedPath, avoidTargets)) {
        // If cached path has avoid targets, we need to repath
        // find the last segment of the path after all avoid targets in this room
        let lastAvoidIndex = 0;
        slicedCachedPath.forEach((pos, i) => {
            if (avoidTargets.some(t => t.pos.inRangeTo(pos, t.range))) {
                lastAvoidIndex = i;
            }
        });
        const remainingPath = slicedCachedPath.slice(lastAvoidIndex);
        const reroute = generatePath(creep.pos, remainingPath.map(pos => ({ pos, range: 0 })), {
            ...actualOpts,
            cache,
            flee: false
        });
        if (!reroute) {
            // reroute failed - reset path and try again
            resetCachedPath(creepKey(creep, keys$1.CACHED_PATH), { cache });
        }
        else {
            // reroute succeeded - update cached path
            let joinIndex = undefined; // furthest point on remainingPath that is in range of reroute
            for (let i = 0; i < remainingPath.length; i++) {
                if (reroute[reroute.length - 1].inRangeTo(remainingPath[i], 1)) {
                    joinIndex = i;
                    continue;
                }
                if (joinIndex !== undefined)
                    break;
            }
            if (joinIndex === undefined) {
                // reroute failed - reset path and try again
                resetCachedPath(creepKey(creep, keys$1.CACHED_PATH), { cache });
            }
            else {
                cache
                    .with(PositionListSerializer)
                    .set(cachedPathKey(creepKey(creep, keys$1.CACHED_PATH)), reroute.concat(remainingPath.slice(joinIndex)), expiration);
            }
        }
    }
    // generate cached path, if needed - cachePath will also normalize targets
    const path = cachePath(creepKey(creep, keys$1.CACHED_PATH), creep.pos, targets, { ...actualOpts, cache });
    if (!path)
        return ERR_NO_PATH;
    // move to any viable target square, if path is nearly done
    if (path && path[path.length - 2]?.isEqualTo(creep.pos)) {
        // Nearly at end of path
        let cm = configureRoomCallback(actualOpts)(creep.pos.roomName);
        const notBlockedOnCostMatrix = cm instanceof PathFinder.CostMatrix
            ? (p) => cm.get(p.x, p.y) < 254 // 254 is used to "soft block" travel
            : () => true;
        const matchesTargetRange = !opts?.flee
            ? (p) => normalizedTargets.some(t => t.pos.inRangeTo(p, t.range))
            : (p) => normalizedTargets.every(t => t.pos.getRangeTo(p) >= t.range);
        const targets = adjacentWalkablePositions(creep.pos, true).filter((p) => matchesTargetRange(p) && notBlockedOnCostMatrix(p));
        if (targets.length) {
            move(creep, targets, actualOpts.priority);
            return OK;
        }
        // otherwise, just follow the path
    }
    // move by path
    let result = followPath(creep, creepKey(creep, keys$1.CACHED_PATH), {
        ...actualOpts,
        reverse: false,
        cache
    });
    if (result === ERR_NOT_FOUND) {
        // creep has fallen off path: repath and try again
        clearCachedPath(creep, cache);
        cachePath(creepKey(creep, keys$1.CACHED_PATH), creep.pos, normalizedTargets, { ...actualOpts, cache });
        result = followPath(creep, creepKey(creep, keys$1.CACHED_PATH), {
            ...actualOpts,
            reverse: false,
            cache
        });
    }
    return result;
};

// using the packed representation to improve cpu usage, also uses skip-list logic on the path
function quickPathSearch(search, path, reverse = false) {
    const searchPacked = search.__packedPos;
    const searchRoom = searchPacked >>> 16;
    const startIdx = reverse ? path.length - 1 : 0;
    for (let i = startIdx; reverse ? i > -1 : i < path.length; reverse ? i-- : i++) {
        const currentPos = path[i];
        if (currentPos.isEqualTo(search)) {
            return i;
        }
        const currentRoomPacked = path[i].__packedPos >>> 16;
        // Optimization: if in the same room, we can skip ahead based on distance.
        // Since we move at most 1 tile per index, we can't reach the target sooner than the distance.
        if (currentRoomPacked === searchRoom) {
            const dist = currentPos.getRangeTo(search);
            if (dist > 1) {
                if (reverse)
                    i += -dist + 1; // +1 because the loop decreases i
                else
                    i += dist - 1; // -1 because the loop increments i
            }
        }
    }
    return -1;
}

const keys = {
    MOVE_BY_PATH_INDEX: '_cpi',
    REROUTE_PATH_INDEX: '_rsi'
};
/**
 * Moves a creep along a cached path. If `opts.reverse`, moves it backwards.
 * If the creep isn't already on the path, it moves to the path first. Returns
 * ERR_NO_PATH if the cached path doesn't exist.
 */
function moveByPath(creep, key, opts) {
    const repath = opts?.repathIfStuck ?? config.DEFAULT_MOVE_OPTS.repathIfStuck;
    const avoidTargets = (opts?.avoidTargets ?? config.DEFAULT_MOVE_OPTS.avoidTargets)?.(creep.pos.roomName) ?? [];
    let rerouteIndex = HeapCache.get(creepKey(creep, keys.REROUTE_PATH_INDEX));
    const cachedPath = getCachedPath(key, opts);
    // check if creep has made it back to the path
    if ((repath || avoidTargets.length) && rerouteIndex !== undefined) {
        let currentIndex = cachedPath ? quickPathSearch(creep.pos, cachedPath, opts?.reverse || false) : undefined;
        if (currentIndex === -1)
            currentIndex = undefined;
        if (currentIndex !== undefined && (opts?.reverse ? currentIndex <= rerouteIndex : currentIndex >= rerouteIndex)) {
            // creep is no longer stuck
            HeapCache.delete(creepKey(creep, keys.REROUTE_PATH_INDEX));
            rerouteIndex = undefined;
        }
    }
    // Try to follow path, if not stuck
    let result = ERR_NOT_FOUND;
    if (rerouteIndex === undefined) {
        result = followPath(creep, key, opts);
    }
    if (result !== ERR_NOT_FOUND) {
        const creepIndex = HeapCache.get(creepKey(creep, keys.MOVE_BY_PATH_INDEX));
        // check if creep has gotten stuck or path ahead is dangerous
        if ((repath && creepIsStuck(creep, repath)) || cachedPath && pathHasAvoidTargets(slicedPath(cachedPath, creepIndex ?? 0, opts?.reverse), avoidTargets)) {
            // creep is stuck on the path
            if (creepIndex !== undefined) {
                if (opts?.reverse) {
                    rerouteIndex = creepIndex - 1;
                }
                else {
                    rerouteIndex = creepIndex + 2;
                }
                HeapCache.set(creepKey(creep, keys.REROUTE_PATH_INDEX), rerouteIndex);
            }
        }
        else {
            // on the path, not stuck: success!
            return result;
        }
    }
    // off the path or stuck - use moveTo instead
    let path = getCachedPath(key, opts);
    if (!path)
        return ERR_NO_PATH;
    if (rerouteIndex !== undefined) {
        // creep is stuck, so move to the next stretch of the path
        path = slicedPath(path, rerouteIndex, opts?.reverse);
    }
    if (path.length === 0)
        return ERR_NO_PATH;
    // need to move to the path
    return moveTo(creep, path, opts);
}

/**
 * Cause `puller` to pull `pulled`, registering the pull so traffic management
 * can avoid breaking the chain
 */
function follow(pullee, puller) {
    pullee.move(puller);
    puller.pull(pullee);
    registerPull(puller, pullee);
}

function preTick() {
    cleanAllCaches();
    updateIntel();
}

exports.CachingStrategies = CachingStrategies;
exports.CoordListSerializer = CoordListSerializer;
exports.CoordSerializer = CoordSerializer;
exports.Keys = index;
exports.MoveTargetListSerializer = MoveTargetListSerializer;
exports.MoveTargetSerializer = MoveTargetSerializer;
exports.NumberSerializer = NumberSerializer;
exports.PositionListSerializer = PositionListSerializer;
exports.PositionSerializer = PositionSerializer;
exports.adjacentWalkablePositions = adjacentWalkablePositions;
exports.blockSquare = blockSquare;
exports.cachePath = cachePath;
exports.cachedPathKey = cachedPathKey;
exports.calculateAdjacencyMatrix = calculateAdjacencyMatrix;
exports.calculateAdjacentPositions = calculateAdjacentPositions;
exports.calculateNearbyPositions = calculateNearbyPositions;
exports.calculatePositionsAtRange = calculatePositionsAtRange;
exports.cleanAllCaches = cleanAllCaches;
exports.clearCachedPath = clearCachedPath;
exports.compressPath = compressPath;
exports.config = config;
exports.decompressPath = decompressPath;
exports.fastRoomPosition = fastRoomPosition;
exports.fixEdgePosition = fixEdgePosition;
exports.follow = follow;
exports.followPath = followPath;
exports.fromGlobalPosition = fromGlobalPosition;
exports.generatePath = generatePath;
exports.getCachedPath = getCachedPath;
exports.getMoveIntents = getMoveIntents;
exports.getRangeTo = getRangeTo;
exports.globalPosition = globalPosition;
exports.isExit = isExit;
exports.isPositionWalkable = isPositionWalkable;
exports.move = move;
exports.moveByPath = moveByPath;
exports.moveTo = moveTo;
exports.normalizeTargets = normalizeTargets;
exports.offsetRoomPosition = offsetRoomPosition;
exports.packCoord = packCoord;
exports.packCoordList = packCoordList;
exports.packPos = packPos;
exports.packPosList = packPosList;
exports.packRoomName = packRoomName;
exports.packRoomNames = packRoomNames;
exports.posAtDirection = posAtDirection;
exports.preTick = preTick;
exports.reconcileTraffic = reconcileTraffic;
exports.reconciledRecently = reconciledRecently;
exports.resetCachedPath = resetCachedPath;
exports.roomNameFromCoords = roomNameFromCoords;
exports.roomNameToCoords = roomNameToCoords;
exports.sameRoomPosition = sameRoomPosition;
exports.unpackCoord = unpackCoord;
exports.unpackCoordList = unpackCoordList;
exports.unpackPos = unpackPos;
exports.unpackPosList = unpackPosList;
exports.unpackRoomName = unpackRoomName;
exports.unpackRoomNames = unpackRoomNames;
//# sourceMappingURL=main.js.map