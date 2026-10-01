export type LibraryView = 'outside' | 'entrance' | 'reading' | 'gallery' | 'upper';
export type MoveDirection = 'forward' | 'backward' | 'left' | 'right';
export interface LibraryState {
  mode: 'outside' | 'inside';
  floor: 0 | 1 | 2;
  position: [number, number, number];
  yaw: number;
  pitch: number;
  cutaway: boolean;
  night: boolean;
  transitioning: boolean;
  paused: boolean;
  voxels: number;
  books: number;
  drawCalls: number;
}
export interface Voxel {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  c: string;
  type: 'normal' | 'metal' | 'glass' | 'glow';
  layer: 'roof' | 'shell' | 'interior';
  rot: number;
}
export interface Architecture {
  root: any; roof: any; shell: any; inside: any;
  voxelData: Voxel[];
  floorHeights: number[];
  stats: { voxels: number; books: number; drawCalls: number };
  sampleFloor(x: number, z: number, previousY: number): { y: number; level: number; stairs: boolean } | null;
  setCutaway(value: boolean): void;
  update(dt: number): void;
  dispose(): void;
}
export interface LibraryOptions {
  onStateChange?: (state: LibraryState) => void;
  keyboard?: 'focus' | 'global' | 'off';
  maxPixelRatio?: number;
  shadows?: boolean;
  frameOffset?: number;
}
export interface LibraryInstance {
  enter(view?: Exclude<LibraryView, 'outside'>): void;
  exterior(): void;
  setCutaway(value: boolean): void;
  setNight(value: boolean): void;
  setMove(direction: MoveDirection, active: boolean): void;
  turn(deltaYaw: number, deltaPitch?: number): void;
  getState(): LibraryState;
  pause(): void;
  resume(): void;
  dispose(): void;
  scene: any;
  camera: any;
  building: Architecture;
}
export function mountLibrary(host: HTMLElement, options?: LibraryOptions): LibraryInstance;
export function buildArchitecture(scene: any): Architecture;
export class TisuLibraryElement extends HTMLElement {
  readonly api: LibraryInstance | null;
  getState(): LibraryState | null;
  setView(view: LibraryView): void;
  enter(view?: Exclude<LibraryView, 'outside'>): void;
  exterior(): void;
  setNight(value: boolean): void;
  setCutaway(value: boolean): void;
  pause(): void;
  resume(): void;
}
export function defineLibraryElement(tagName?: string): boolean;
declare global {
  interface HTMLElementTagNameMap { 'tisu-library': TisuLibraryElement; }
  interface HTMLElementEventMap {
    'library-state-change': CustomEvent<LibraryState>;
    'library-error': CustomEvent<{ message: string }>;
  }
}
