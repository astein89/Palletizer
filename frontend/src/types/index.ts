export interface User {
  id: number;
  username: string;
  email: string | null;
  role: 'admin' | 'user';
  must_change_password?: boolean;
  created_at?: string;
  last_login?: string | null;
}

export interface Pallet {
  id?: number;
  name: string;
  length: number;
  width: number;
  height: number;
  max_overhang?: number; // Overhang allowed on all sides (e.g., 1 inch = 1 inch on each side)
  max_length?: number; // Calculated: length + (2 * max_overhang) - for backward compatibility
  max_width?: number; // Calculated: width + (2 * max_overhang) - for backward compatibility
  max_height: number;
  max_weight?: number;
  pallet_weight?: number;
  created_by?: number;
  modified_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Item {
  item_id: string;
  uom: string;
  qty: number;
  name?: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  description?: string;
  allow_height_rotation?: boolean;
  allow_overhang?: boolean;
  created_by?: number;
  modified_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Box {
  length: number;
  width: number;
  height: number;
  weight: number;
  allowHeightRotation?: boolean;
  allowOverhang?: boolean;
  stackPattern?: 'auto' | 'block' | 'split-block' | 'brick' | 'pinwheel' | 'row' | 'split-row';
}

export interface BoxPlacement {
  x: number;
  y: number;
  z: number;
  orientation: 'l×w' | 'w×l' | 'l×h' | 'h×l' | 'w×h' | 'h×w';
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  boxWeight: number;
}

export interface Layer {
  layerNumber: number;
  rotation: 0 | 180;
  boxes: BoxPlacement[];
  hasMixedOrientations: boolean;
}

export interface Arrangement {
  totalBoxes: number;
  totalLayers: number;
  boxesPerLayer: number[];
  allowHeightRotation: boolean;
  totalWeight: number;
  weightUtilization: number;
  weightLimited: boolean;
  layers: Layer[];
  stackPattern?: 'auto' | 'block' | 'split-block' | 'brick' | 'pinwheel' | 'row' | 'split-row';
}

export interface ChangeHistory {
  id: number;
  table_name: string;
  record_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  user_id: number;
  username?: string;
  old_values: string | null;
  new_values: string | null;
  changed_fields: string | null;
  timestamp: string;
  ip_address: string | null;
}
