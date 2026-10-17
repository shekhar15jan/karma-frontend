export type CatalogueFrameStatus = 'live' | 'proposed';
export type CatalogueFrameKind = 'builtin' | 'custom';

export interface CatalogueSlot {
  id: string;
  label: string;
  accepts: string[];
  acceptsWidgets?: string[];
  min: number;
  max: number;
  droppable?: boolean;
}

export interface CatalogueFrame {
  id: string;
  title: string;
  family: string;
  status: CatalogueFrameStatus;
  kind: CatalogueFrameKind;
  intent: string[];
  slots: CatalogueSlot[];
  fallback: string | null;
  motion: string[];
  use: string;
  defect?: string;
  /** True once the frame has a registered React component (src/video/frames/) —
   *  computed by the renderer at request time, not stored in the catalogue itself. */
  migrated: boolean;
}

export interface CatalogueWidget {
  id: string;
  atom: string;
  title: string;
  requires: string[];
  optional: string[];
  aliases?: string[];
  status: CatalogueFrameStatus;
  use?: string;
}

export interface CatalogueIcon {
  slug: string;
  title: string;
  category: string;
  hex: string;
  source: 'override' | 'simple-icons';
}

export interface Catalogue {
  version: number;
  atoms: string[];
  frames: CatalogueFrame[];
  widgets: CatalogueWidget[];
  icons: CatalogueIcon[];
}
