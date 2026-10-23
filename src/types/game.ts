export type TileType =
  | 'empty'
  | 'wall'
  | 'floor'
  | 'start'
  | 'exit'
  | 'key'
  | 'gate'
  | 'switch'
  | 'teleporter';

export type KeyColor = 'gold' | 'cyan' | 'magenta';

export interface Position {
  x: number;
  y: number;
}

export interface KeyItem {
  id: string;
  x: number;
  y: number;
  color: KeyColor;
  collected?: boolean;
}

export interface GateItem {
  id: string;
  x: number;
  y: number;
  color: KeyColor;
  isOpen: boolean;
}

export interface SwitchItem {
  id: string;
  x: number;
  y: number;
  label: string;
  toggleCoords: Position[];
  isActive: boolean;
}

export interface TeleporterItem {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  maxUses: number;
  remainingUses: number;
}

export interface LevelDef {
  id: string;
  name: string;
  subtitle: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert';
  width: number;
  height: number;
  rows: string[];
  switches?: SwitchItem[];
  teleporters?: TeleporterItem[];
  parMoves: number;
  mechanicsDescription: string;
  tacticalTip?: string;
}

export interface AstronautAbilities {
  quantumBlinks: number; // Ability to teleport anywhere on the map!
  phaseRestores: number; // Ability to instantly restore collapsed tile!
  speedBoostActive: boolean;
}

export interface GameInventory {
  keys: Record<KeyColor, number>;
  abilities: AstronautAbilities;
}

export interface GameSnapshot {
  playerPos: Position;
  prevPos: Position | null;
  moveCount: number;
  inventory: GameInventory;
  collectedKeys: string[];
  gateStates: Record<string, boolean>;
  switchStates: Record<string, boolean>;
  teleporterUses: Record<string, number>;
  toggledWalls: Record<string, boolean>;
}

export interface SolverResult {
  solvable: boolean;
  minMoves: number;
  path: Position[];
  exploredStates: number;
  timeMs: number;
  diagnostics: string;
}
