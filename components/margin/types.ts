import type React from "react";

export type NoteColor =
  | "paper"
  | "butter"
  | "peach"
  | "mint"
  | "sky"
  | "lilac"
  | "blush"
  | "kraft";

export type Item = {
  id: string;
  text: string;
  done: boolean;
};

export type NoteImage = {
  src?: string;
  ph?: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  type: "text" | "list";
  items: Item[];
  color: NoteColor;
  labels: string[];
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  reminder: string | null;
  image: NoteImage | null;
  wide: boolean;
  x: number;
  y: number;
  z: number;
  edited: number;
};

export type View = "notes" | "reminders" | "archive" | "trash" | `label:${string}`;

export type TypeFilter = "all" | "list" | "image" | "reminder";

export type Layout = "grid" | "board";

export type Theme = "light" | "dark";

export type PopoverKind = "color" | "reminder" | "label";

export type Popover = { id: string; kind: PopoverKind } | null;

export type Toast = { text: string; undo?: () => void } | null;

export type AppState = {
  notes: Note[];
  labels: string[];
  layout: Layout;
  theme: Theme;
  view: View;
  query: string;
  typeFilter: TypeFilter;
  colorFilter: NoteColor | null;
  expandedId: string | null;
  popover: Popover;
  hoverId: string | null;
  dragId: string | null;
  dropTarget: string | null;
  toast: Toast;
  labelQuery: string;
  addingLabel: boolean;
  newLabel: string;
  editLabels: boolean;
  vw: number;
  touch: boolean;
};

export type PersistedState = {
  notes: Note[];
  labels: string[];
  layout: Layout;
  theme: Theme;
};

export type Actions = {
  upd: (id: string, patch: Partial<Note> | ((n: Note) => Partial<Note>), touch?: boolean) => void;
  updItems: (id: string, fn: (items: Item[]) => Item[]) => void;
  maxZ: () => number;
  open: (id: string) => void;
  close: () => void;
  setView: (view: View) => void;
  toast: (text: string, undo?: () => void) => void;
  trash: (id: string) => void;
  archive: (id: string) => void;
  restore: (id: string) => void;
  deleteForever: (id: string) => void;
  toggleLabel: (id: string, name: string) => void;
  createLabel: (name: string, noteId?: string) => void;
  pickImage: (id: string) => void;
  readImage: (file: File, id: string) => void;
  reorder: (dragId: string, targetId: string) => void;
  setPopover: (p: Popover) => void;
  setHoverId: (id: string | null) => void;
  setDragId: (id: string | null) => void;
  setDropTarget: (k: string | null) => void;
  setLabelQuery: (q: string) => void;
  moveNote: (id: string, x: number, y: number, z: number) => void;
  itemKey: (e: React.KeyboardEvent<HTMLInputElement>, nid: string, iid: string) => void;
  requestFocus: (selector: string) => void;
  isSuppressed: () => boolean;
  setSuppressed: (v: boolean) => void;
  getLastOver: () => string | null;
  setLastOver: (id: string | null) => void;
};

