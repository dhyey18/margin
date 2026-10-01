import type { Item, Note, NoteColor } from "./types";

export const COLORS: NoteColor[] = [
  "paper",
  "butter",
  "peach",
  "mint",
  "sky",
  "lilac",
  "blush",
  "kraft",
];

export const CNAME: Record<NoteColor, string> = {
  paper: "Paper",
  butter: "Butter",
  peach: "Peach",
  mint: "Mint",
  sky: "Sky",
  lilac: "Lilac",
  blush: "Blush",
  kraft: "Kraft",
};

export const TAPES = ["#e2cd9c", "#f0b5a8", "#a8d0c1", "#f3d47a", "#c7bae4"];

export const FONT_SANS = "var(--font-figtree), system-ui, sans-serif";
export const FONT_SERIF = "var(--font-instrument-serif), serif";
export const FONT_HAND = "var(--font-caveat), cursive";
export const FONT_MONO = "var(--font-courier-prime), monospace";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const hash = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const at = (d: number, h: number, m: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
};

export const pad = (n: number) => String(n).padStart(2, "0");

export const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export const fmtRem = (iso: string) => {
  const d = new Date(iso),
    now = new Date();
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((b.getTime() - a.getTime()) / 864e5);
  const day =
    diff === 0
      ? "Today"
      : diff === 1
      ? "Tomorrow"
      : diff === -1
      ? "Yesterday"
      : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  return day + " " + t;
};

export const ago = (ts: number) => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return "edited just now";
  if (s < 3600) return "edited " + Math.floor(s / 60) + "m ago";
  if (s < 86400) return "edited " + Math.floor(s / 3600) + "h ago";
  return "edited " + new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short" });
};

export const rdate = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} · ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export function isEmptyNote(n: Note) {
  return !n.title.trim() && !n.body.trim() && !n.image && !n.items.some((i) => i.text.trim());
}

export function remPresets() {
  const now = new Date(),
    h = now.getHours(),
    dow = now.getDay();
  const sat = (6 - dow + 7) % 7 || 7,
    mon = (8 - dow) % 7 || 7;
  return [
    h < 17
      ? { label: "Later today", sub: "6:00 PM", iso: at(0, 18, 0) }
      : { label: "Tonight", sub: "9:00 PM", iso: at(0, 21, 0) },
    { label: "Tomorrow", sub: "9:00 AM", iso: at(1, 9, 0) },
    { label: "This weekend", sub: "SAT 10:00", iso: at(sat, 10, 0) },
    { label: "Next week", sub: "MON 9:00", iso: at(mon, 9, 0) },
  ];
}

export function seed(): Note[] {
  const now = Date.now();
  const I = (t: string, d?: boolean): Item => ({ id: uid(), text: t, done: !!d });
  let k = 0;
  const N = (o: Partial<Note>): Note =>
    Object.assign(
      {
        id: uid(),
        title: "",
        body: "",
        type: "text" as const,
        items: [],
        color: "paper" as NoteColor,
        labels: [],
        pinned: false,
        archived: false,
        trashed: false,
        reminder: null,
        image: null,
        wide: false,
        x: 40,
        y: 40,
        z: 1,
        edited: now - k++ * 3.7e6,
      },
      o
    );
  return [
    N({
      title: "Call Mom about Dad’s birthday",
      body: "She wants to do the lake house again. Ask about the date and whether Aunt Ruth is coming.",
      color: "blush",
      pinned: true,
      reminder: at(0, 18, 0),
      x: 40,
      y: 50,
    }),
    N({
      title: "Sunday market",
      type: "list",
      items: [
        I("Sourdough loaf"),
        I("Heirloom tomatoes"),
        I("Basil"),
        I("Eggs, a dozen"),
        I("Oat milk", true),
        I("Flowers for the table", true),
      ],
      labels: ["Home"],
      pinned: true,
      x: 330,
      y: 50,
    }),
    N({
      title: "Lisbon, late October",
      body: "Stay in Alfama. Tram 28 early, before the crowds. Dinner at the place with the blue tiles Marta mentioned.",
      labels: ["Travel"],
      wide: true,
      image: { ph: "photo · alfama rooftops" },
      reminder: at(9, 9, 0),
      x: 620,
      y: 50,
    }),
    N({
      body: "The best time to plant a tree was twenty years ago. The second best time is now.",
      color: "paper",
      wide: true,
      labels: ["Ideas"],
      x: 620,
      y: 560,
    }),
    N({
      title: "Books for the winter",
      type: "list",
      items: [I("Piranesi", true), I("The Overstory"), I("Braiding Sweetgrass"), I("A Swim in a Pond in the Rain")],
      color: "mint",
      labels: ["Reading"],
      x: 40,
      y: 360,
    }),
    N({
      title: "Balcony herbs",
      body: "Rosemary and thyme on the railing. Mint in its own pot so it doesn’t take over.",
      image: { ph: "sketch · balcony layout" },
      color: "paper",
      labels: ["Home", "Ideas"],
      x: 330,
      y: 470,
    }),
    N({
      title: "Morning routine",
      type: "list",
      items: [I("Glass of water"), I("Ten minutes of stretching"), I("One page in the journal"), I("No phone until 8")],
      color: "butter",
      x: 1070,
      y: 50,
    }),
    N({
      title: "Wi-Fi at the cabin",
      body: "PineHollow_5G\nPassword is on the fridge magnet",
      color: "kraft",
      x: 1070,
      y: 420,
    }),
    N({
      title: "Car service",
      body: "Booked for Thursday at 9:30. Ask about the rattle in the rear door.",
      color: "sky",
      labels: ["Errands"],
      reminder: at(1, 9, 30),
      x: 40,
      y: 700,
    }),
    N({
      title: "Dinner party",
      type: "list",
      items: [I("Burrata with peaches"), I("Lemon risotto"), I("Olive oil cake"), I("Something fizzy")],
      color: "peach",
      x: 1360,
      y: 50,
    }),
    N({
      title: "Return library books",
      body: "Due Saturday. Two are on the nightstand.",
      labels: ["Errands"],
      color: "lilac",
      reminder: at(-1, 10, 0),
      x: 1070,
      y: 660,
    }),
    N({
      title: "Old apartment move",
      type: "list",
      items: [I("Forward mail", true), I("Final meter reading", true), I("Return keys", true)],
      archived: true,
    }),
    N({ title: "Gym schedule draft", body: "Mon / Wed / Fri, 7am.", trashed: true, color: "sky" }),
  ];
}

export const DEFAULT_LABELS = ["Home", "Travel", "Reading", "Errands", "Ideas"];
