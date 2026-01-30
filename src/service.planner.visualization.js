const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

module.exports = function applyPlannerVisualization(RoomPlanner) {
  /**
   * Activates visualization for 15 ticks
   */
  RoomPlanner.prototype.visualize = function () {
    if (this.memory.layoutGenerated !== true) {
      Log.warn(`Cannot visualize: Layout not generated for ${this._getRoomLabel()}`, "RoomPlanner");
      return;
    }

    // Activate visualization
    this.memory.visualizeUntil = Game.time + CONSTANTS.PLANNER.VISUALIZATION_DURATION;
    this._drawVisualization();
    Log.info(
      `Visualization activated for ${this.roomName} (${CONSTANTS.PLANNER.VISUALIZATION_DURATION} ticks)`,
      "RoomPlanner",
    );
  };

  /**
   * Finds orphaned structures (built but no longer in the layout)
   * @returns {Array} Array of orphaned structures with their positions
   */
  RoomPlanner.prototype._findOrphanedStructures = function () {
    if (this.memory.layoutGenerated !== true || !this._hasCenter()) {
      return [];
    }

    const orphanedStructures = [];
    const { centerX, centerY } = this.memory;

    // Create a map of planned positions: "x,y" -> structureType
    const plannedPositions = new Map();
    const plannedExtensionPositions = new Set(); // Track extension positions separately

    // Add extensions from memory.plannedStructures.extensions
    if (this.memory.plannedStructures.extensions) {
      for (const ext of this.memory.plannedStructures.extensions) {
        const key = `${ext.x},${ext.y}`;
        plannedExtensionPositions.add(key);
      }
    }

    // Add other structures from plannedStructures.list
    for (const planned of this.memory.plannedStructures.list) {
      const key = `${planned.x},${planned.y}`;
      // Include all structures, even those with specialIdentifier (like links)
      // They are still planned structures and should not be marked as orphaned
      plannedPositions.set(key, planned.structureType);
    }

    // Find all structures in the room that could be planned by the planner
    // Exclude roads from orphaned structures check
    const plannerStructureTypes = [
      STRUCTURE_SPAWN,
      STRUCTURE_EXTENSION,
      STRUCTURE_TOWER,
      STRUCTURE_STORAGE,
      STRUCTURE_TERMINAL,
      STRUCTURE_FACTORY,
      STRUCTURE_LAB,
      STRUCTURE_LINK,
      STRUCTURE_OBSERVER,
      STRUCTURE_POWER_SPAWN,
      STRUCTURE_NUKER,
      // STRUCTURE_ROAD - excluded from orphaned check
    ];

    const structures = this.room.find(FIND_STRUCTURES, {
      filter: (s) => plannerStructureTypes.includes(s.structureType),
    });

    for (const structure of structures) {
      const key = `${structure.pos.x},${structure.pos.y}`;

      // For extensions, check if position is in the extension positions set
      if (structure.structureType === STRUCTURE_EXTENSION) {
        if (!plannedExtensionPositions.has(key)) {
          // Extension exists but not planned at this position
          const distanceFromCenter = Math.max(
            Math.abs(structure.pos.x - centerX),
            Math.abs(structure.pos.y - centerY),
          );
          if (distanceFromCenter <= 20) {
            orphanedStructures.push({
              structure: structure,
              x: structure.pos.x,
              y: structure.pos.y,
              structureType: structure.structureType,
            });
          }
        }
      } else {
        // For other structures, check the map
        const plannedType = plannedPositions.get(key);

        // Structure is orphaned if:
        // 1. No structure is planned at this position, OR
        // 2. A different structure type is planned at this position
        if (!plannedType || plannedType !== structure.structureType) {
          // Check if it's within reasonable range of the center (to avoid flagging structures far away)
          const distanceFromCenter = Math.max(
            Math.abs(structure.pos.x - centerX),
            Math.abs(structure.pos.y - centerY),
          );
          // Only flag structures within 20 tiles of center (reasonable bunker range)
          if (distanceFromCenter <= 20) {
            orphanedStructures.push({
              structure: structure,
              x: structure.pos.x,
              y: structure.pos.y,
              structureType: structure.structureType,
            });
          }
        }
      }
    }

    return orphanedStructures;
  };

  /**
   * Draws the visualization (internal method)
   */
  RoomPlanner.prototype._drawVisualization = function () {
    if (this.memory.layoutGenerated !== true) return;

    const { visual } = this.room;

    // Structure colors - each structure type has a unique color
    const structureColors = {
      [STRUCTURE_SPAWN]: "#ffff00",
      [STRUCTURE_EXTENSION]: "#888888",
      [STRUCTURE_TOWER]: "#ff0000",
      [STRUCTURE_STORAGE]: "#00ffff",
      [STRUCTURE_TERMINAL]: "#ff00ff",
      [STRUCTURE_LAB]: "#00ff00",
      [STRUCTURE_LINK]: "#0088ff",
      [STRUCTURE_FACTORY]: "#ffaa00",
      [STRUCTURE_OBSERVER]: "#ffffff",
      [STRUCTURE_POWER_SPAWN]: "#ff8800",
      [STRUCTURE_NUKER]: "#880000",
      [STRUCTURE_ROAD]: "#aaaaaa",
      [STRUCTURE_CONTAINER]: "#00aa00",
    };

    // Structure names for legend
    const structureNames = {
      [STRUCTURE_SPAWN]: "Spawn",
      [STRUCTURE_EXTENSION]: "Extension",
      [STRUCTURE_TOWER]: "Tower",
      [STRUCTURE_STORAGE]: "Storage",
      [STRUCTURE_TERMINAL]: "Terminal",
      [STRUCTURE_LAB]: "Lab",
      [STRUCTURE_LINK]: "Link",
      [STRUCTURE_FACTORY]: "Factory",
      [STRUCTURE_OBSERVER]: "Observer",
      [STRUCTURE_POWER_SPAWN]: "PowerSpawn",
      [STRUCTURE_NUKER]: "Nuker",
      [STRUCTURE_ROAD]: "Road",
      [STRUCTURE_CONTAINER]: "Container",
    };

    // Structure initial letters for visualization
    const structureLetters = {
      [STRUCTURE_SPAWN]: "S",
      [STRUCTURE_EXTENSION]: "E",
      [STRUCTURE_TOWER]: "T",
      [STRUCTURE_STORAGE]: "St",
      [STRUCTURE_TERMINAL]: "Te",
      [STRUCTURE_LAB]: "L",
      [STRUCTURE_LINK]: "Li",
      [STRUCTURE_FACTORY]: "F",
      [STRUCTURE_OBSERVER]: "O",
      [STRUCTURE_POWER_SPAWN]: "P",
      [STRUCTURE_NUKER]: "N",
      [STRUCTURE_ROAD]: "R",
      [STRUCTURE_CONTAINER]: "C",
    };

    // Draw center
    if (this._hasCenter()) {
      visual.circle(this.memory.centerX, this.memory.centerY, {
        fill: "transparent",
        stroke: "#00ff00",
        strokeWidth: 0.2,
        radius: 0.5,
      });
    }

    // Collect unique structure types for legend
    const usedStructures = new Set();
    for (const planned of this.memory.plannedStructures.list) {
      usedStructures.add(planned.structureType);
    }
    // Also include extensions
    if (this.memory.plannedStructures.extensions && this.memory.plannedStructures.extensions.length > 0) {
      usedStructures.add(STRUCTURE_EXTENSION);
    }

    // Draw legend in top-left corner (doubled size)
    let legendY = 1;
    const legendWidth = 8;
    const legendItemHeight = 1;
    visual.rect(0.5, 0.5, legendWidth, usedStructures.size * legendItemHeight + 1, {
      fill: "#000000",
      opacity: 0.7,
      stroke: "#ffffff",
      strokeWidth: 0.2,
    });

    for (const structureType of usedStructures) {
      const color = structureColors[structureType] || "#ffffff";
      const name = structureNames[structureType] || structureType;

      // Color square (doubled size)
      visual.rect(0.8, legendY, 0.6, 0.6, {
        fill: color,
        opacity: 1,
        stroke: color,
        strokeWidth: 0.2,
      });

      // Text label: "Farbe = Extension" format (doubled size)
      visual.text(`= ${name}`, 1.6, legendY + 0.4, {
        color: "#ffffff",
        font: "0.8 Arial",
        align: "left",
      });

      legendY += legendItemHeight;
    }

    // Draw planned structures
    for (const planned of this.memory.plannedStructures.list) {
      const color = structureColors[planned.structureType] || "#ffffff";
      visual.rect(planned.x - 0.4, planned.y - 0.4, 0.8, 0.8, {
        fill: color,
        opacity: 0.8,
        stroke: color,
        strokeWidth: 0.1,
      });

      // Draw structure initial letter
      const letter = structureLetters[planned.structureType] || "?";
      visual.text(letter, planned.x, planned.y + 0.3, {
        color: "#000000",
        font: "0.6 Arial",
        align: "center",
        stroke: "#ffffff",
        strokeWidth: 0.1,
      });
    }

    // Draw extensions from memory.plannedStructures.extensions
    if (this.memory.plannedStructures.extensions) {
      const extensionColor = structureColors[STRUCTURE_EXTENSION] || "#888888";
      for (const ext of this.memory.plannedStructures.extensions) {
        visual.rect(ext.x - 0.4, ext.y - 0.4, 0.8, 0.8, {
          fill: extensionColor,
          opacity: 0.8,
          stroke: extensionColor,
          strokeWidth: 0.1,
        });

        // Draw structure initial letter
        const letter = structureLetters[STRUCTURE_EXTENSION] || "E";
        visual.text(letter, ext.x, ext.y + 0.3, {
          color: "#000000",
          font: "0.6 Arial",
          align: "center",
          stroke: "#ffffff",
          strokeWidth: 0.1,
        });
      }
    }

    // Draw orphaned structures (structures that exist but are no longer in the layout)
    const orphanedStructures = this._findOrphanedStructures();
    if (orphanedStructures.length > 0) {
      // Draw orphaned structures with red X marker
      for (const orphaned of orphanedStructures) {
        // Draw red background
        visual.rect(orphaned.x - 0.4, orphaned.y - 0.4, 0.8, 0.8, {
          fill: "#ff0000",
          opacity: 0.6,
          stroke: "#ff0000",
          strokeWidth: 0.2,
        });

        // Draw X mark
        visual.line(orphaned.x - 0.3, orphaned.y - 0.3, orphaned.x + 0.3, orphaned.y + 0.3, {
          color: "#ffffff",
          width: 0.15,
          opacity: 1,
        });
        visual.line(orphaned.x - 0.3, orphaned.y + 0.3, orphaned.x + 0.3, orphaned.y - 0.3, {
          color: "#ffffff",
          width: 0.15,
          opacity: 1,
        });

        // Draw structure type letter
        const letter = structureLetters[orphaned.structureType] || "?";
        visual.text(letter, orphaned.x, orphaned.y + 0.3, {
          color: "#ffffff",
          font: "0.5 Arial",
          align: "center",
          stroke: "#000000",
          strokeWidth: 0.15,
        });
      }

      // Add orphaned structures info to legend
      const orphanedCount = orphanedStructures.length;
      const orphanedY = legendY;
      visual.rect(0.5, orphanedY, legendWidth, 1.5, {
        fill: "#ff0000",
        opacity: 0.7,
        stroke: "#ffffff",
        strokeWidth: 0.2,
      });
      visual.text(`⚠ ${orphanedCount} orphaned structures`, 1, orphanedY + 0.5, {
        color: "#ffffff",
        font: "0.7 Arial",
        align: "left",
        stroke: "#000000",
        strokeWidth: 0.1,
      });
      visual.text("(nicht mehr im Layout)", 1, orphanedY + 1, {
        color: "#ffffff",
        font: "0.5 Arial",
        align: "left",
        stroke: "#000000",
        strokeWidth: 0.1,
      });
    }
  };
};
