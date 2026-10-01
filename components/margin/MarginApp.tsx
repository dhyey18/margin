"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { AppState, Actions, Note, NoteColor, Popover, View } from "./types";
import { COLORS, CNAME, TAPES, FONT_SANS, FONT_SERIF, FONT_HAND, FONT_MONO, uid, isEmptyNote, pad } from "./lib";
import NoteCard from "./NoteCard";
import { useMasonry } from "./useMasonry";

const initialState: AppState = {
  notes: [],
  labels: [],
  layout: "grid",
  theme: "light",
  view: "notes",
  query: "",
  typeFilter: "all",
  colorFilter: null,
  expandedId: null,
  popover: null,
  hoverId: null,
  dragId: null,
  dropTarget: null,
  toast: null,
  labelQuery: "",
  addingLabel: false,
  newLabel: "",
  editLabels: false,
  vw: 1400,
  touch: false,
};

const pillChrome: CSSProperties = {
  background: "var(--chrome)",
  boxShadow: "inset 0 0 0 1px var(--chrome-line)",
};

export default function MarginApp() {
  const [state, setState] = useState<AppState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSelectorRef = useRef<string | null>(null);
  const suppressRef = useRef(false);
  const lastOverRef = useRef<string | null>(null);
  const imgTargetRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = (updater: Partial<AppState> | ((s: AppState) => Partial<AppState>)) =>
    setState((s) => ({ ...s, ...(typeof updater === "function" ? updater(s) : updater) }));

  // ---- initial load ----
  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((d: { notes: Note[]; labels: string[]; layout: AppState["layout"]; theme: AppState["theme"] }) => {
        patch({ notes: d.notes, labels: d.labels, layout: d.layout, theme: d.theme });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    const onResize = () => {
      patch((s) => (s.vw === window.innerWidth ? {} : { vw: window.innerWidth }));
    };
    onResize();
    patch({ touch: !!window.matchMedia && window.matchMedia("(hover: none)").matches });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---- persist to mongo (debounced) ----
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: state.notes, labels: state.labels, layout: state.layout, theme: state.theme }),
      }).catch(() => {});
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.notes, state.labels, state.layout, state.theme, loaded]);

  // ---- focus management ----
  useEffect(() => {
    if (!focusSelectorRef.current) return;
    const sel = focusSelectorRef.current;
    focusSelectorRef.current = null;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
      if (el) {
        el.focus();
        const val = el.value || "";
        try {
          el.setSelectionRange(val.length, val.length);
        } catch {}
      }
    });
  }, [state.notes, state.expandedId]);

  // ---- core helpers ----
  const cleanup = (notes: Note[], id: string | null) => {
    if (!id) return notes;
    const n = notes.find((x) => x.id === id);
    if (!n) return notes;
    if (isEmptyNote(n)) return notes.filter((x) => x.id !== id);
    if (n.items.some((i) => !i.text.trim())) return notes.map((x) => (x.id === id ? { ...x, items: x.items.filter((i) => i.text.trim()) } : x));
    return notes;
  };

  const upd: Actions["upd"] = (id, patchObj, touch = true) => {
    setState((s) => ({
      ...s,
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...(typeof patchObj === "function" ? patchObj(n) : patchObj), ...(touch ? { edited: Date.now() } : {}) } : n
      ),
    }));
  };
  const updItems: Actions["updItems"] = (id, fn) => upd(id, (n) => ({ items: fn(n.items) }));
  const maxZ = () => Math.max(1, ...stateRef.current.notes.map((n) => n.z || 1));

  const newNote = (type: "text" | "list" = "text", withImage = false) => {
    const s = stateRef.current;
    const id = uid();
    let x = 40,
      y = 40;
    if (s.layout === "board") {
      const sc = scrollRef.current,
        cv = document.querySelector<HTMLElement>('[data-canvas="1"]');
      if (sc && cv) {
        x = Math.max(24, sc.scrollLeft - cv.offsetLeft + 80);
        y = Math.max(24, sc.scrollTop - cv.offsetTop + 60);
      }
    }
    const labels = s.view.startsWith("label:") ? [s.view.slice(6)] : [];
    const color: NoteColor = type === "list" ? "paper" : withImage ? "paper" : "butter";
    const n: Note = {
      id,
      title: "",
      body: "",
      type,
      items: [],
      color,
      labels,
      pinned: false,
      archived: false,
      trashed: false,
      reminder: null,
      image: null,
      wide: false,
      x,
      y,
      z: maxZ() + 1,
      edited: Date.now(),
    };
    const view = s.view.startsWith("label:") || s.view === "notes" ? s.view : "notes";
    focusSelectorRef.current = type === "list" ? `[data-add-item="${id}"]` : `[data-title-input="${id}"]`;
    setState((st) => ({
      ...st,
      notes: [n, ...cleanup(st.notes, st.expandedId)],
      expandedId: id,
      popover: null,
      view,
      query: "",
      typeFilter: "all",
      colorFilter: null,
    }));
    if (s.layout === "grid" && scrollRef.current) scrollRef.current.scrollTop = 0;
    if (withImage) setTimeout(() => pickImage(id), 30);
  };

  const open = (id: string) =>
    setState((st) => ({ ...st, notes: cleanup(st.notes, st.expandedId !== id ? st.expandedId : null), expandedId: id, popover: null, labelQuery: "" }));
  const close = () => setState((st) => ({ ...st, notes: cleanup(st.notes, st.expandedId), expandedId: null, popover: null, labelQuery: "" }));
  const setView = (view: View) => {
    setState((st) => ({ ...st, view, notes: cleanup(st.notes, st.expandedId), expandedId: null, popover: null }));
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const showToast = (text: string, undo?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    patch({ toast: { text, undo } });
    toastTimerRef.current = setTimeout(() => patch({ toast: null }), 5000);
  };

  const trash = (id: string) => {
    const prev = stateRef.current.notes.find((n) => n.id === id);
    if (!prev) return;
    if (isEmptyNote(prev)) {
      setState((st) => ({ ...st, notes: st.notes.filter((n) => n.id !== id), expandedId: null, popover: null }));
      return;
    }
    setState((st) => ({
      ...st,
      notes: st.notes.map((n) => (n.id === id ? { ...n, trashed: true, pinned: false } : n)),
      expandedId: st.expandedId === id ? null : st.expandedId,
      popover: null,
    }));
    showToast("Tossed in the bin", () => upd(id, { trashed: false, pinned: prev.pinned }, false));
  };

  const archive = (id: string) => {
    const prev = stateRef.current.notes.find((n) => n.id === id);
    if (!prev) return;
    const to = !prev.archived;
    setState((st) => ({
      ...st,
      notes: st.notes.map((n) => (n.id === id ? { ...n, archived: to, pinned: to ? false : n.pinned, trashed: false } : n)),
      expandedId: st.expandedId === id ? null : st.expandedId,
      popover: null,
    }));
    showToast(to ? "Tucked into the archive" : "Back on the desk", () =>
      upd(id, { archived: prev.archived, pinned: prev.pinned, trashed: prev.trashed }, false)
    );
  };

  const restore = (id: string) => {
    upd(id, { trashed: false, archived: false }, false);
    showToast("Back on the desk");
  };

  const deleteForever = (id: string) => {
    const snapshot = stateRef.current.notes;
    setState((st) => ({ ...st, notes: st.notes.filter((n) => n.id !== id) }));
    showToast("Gone for good", () => patch({ notes: snapshot }));
  };

  const emptyTrash = () => {
    const snapshot = stateRef.current.notes;
    const c = snapshot.filter((n) => n.trashed).length;
    setState((st) => ({ ...st, notes: st.notes.filter((n) => !n.trashed) }));
    showToast(`${c} ${c === 1 ? "note" : "notes"} shredded`, () => patch({ notes: snapshot }));
  };

  const toggleLabel = (id: string, name: string) =>
    upd(id, (n) => ({ labels: n.labels.includes(name) ? n.labels.filter((l) => l !== name) : [...n.labels, name] }));

  const createLabel = (name: string, noteId?: string) => {
    const nm = name.trim();
    if (!nm) return;
    const s = stateRef.current;
    const exist = s.labels.find((l) => l.toLowerCase() === nm.toLowerCase());
    const label = exist || nm;
    setState((st) => ({ ...st, labels: exist ? st.labels : [...st.labels, nm], labelQuery: "" }));
    if (noteId) upd(noteId, (n) => ({ labels: n.labels.includes(label) ? n.labels : [...n.labels, label] }));
  };

  const removeLabel = (name: string) => {
    setState((st) => ({
      ...st,
      labels: st.labels.filter((l) => l !== name),
      notes: st.notes.map((n) => (n.labels.includes(name) ? { ...n, labels: n.labels.filter((l) => l !== name) } : n)),
      view: st.view === "label:" + name ? "notes" : st.view,
    }));
  };

  const pickImage = (id: string) => {
    imgTargetRef.current = id;
    const f = fileRef.current;
    if (f) {
      f.value = "";
      f.click();
    }
  };

  const readImage = (file: File, id: string) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const max = 1400,
          sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        upd(id, { image: { src: c.toDataURL("image/jpeg", 0.82) } });
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file && imgTargetRef.current) readImage(file, imgTargetRef.current);
  };

  const reorder = (dragId: string, targetId: string) => {
    setState((st) => {
      const arr = [...st.notes];
      const from = arr.findIndex((n) => n.id === dragId),
        to = arr.findIndex((n) => n.id === targetId);
      if (from < 0 || to < 0) return st;
      const [m] = arr.splice(from, 1);
      const target = st.notes[to];
      const ti = arr.findIndex((n) => n.id === targetId);
      arr.splice(from < to ? ti + 1 : ti, 0, { ...m, pinned: target.pinned });
      return { ...st, notes: arr };
    });
  };

  const moveNote = (id: string, x: number, y: number, z: number) => {
    setState((st) => ({ ...st, notes: st.notes.map((q) => (q.id === id ? { ...q, x, y, z } : q)) }));
  };

  const dropOn = (key: string) => {
    const id = stateRef.current.dragId;
    patch({ dropTarget: null, dragId: null });
    if (!id) return;
    const n = stateRef.current.notes.find((x) => x.id === id);
    if (!n) return;
    if (key === "trash") trash(id);
    else if (key === "archive") {
      if (!n.archived) archive(id);
    } else if (key === "notes") {
      if (n.trashed || n.archived) restore(id);
    } else if (key === "reminders") {
      upd(id, { reminder: new Date(Date.now() + 86400000).toISOString() });
      showToast("Reminder: tomorrow, 9 AM");
    } else if (key.startsWith("label:")) {
      const l = key.slice(6);
      if (!n.labels.includes(l)) {
        toggleLabel(id, l);
        showToast(`Taped to “${l}”`);
      }
    }
  };

  const itemKey = (e: React.KeyboardEvent<HTMLInputElement>, nid: string, iid: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nw = uid();
      updItems(nid, (items) => {
        const a = [...items];
        const i = a.findIndex((x) => x.id === iid);
        a.splice(i + 1, 0, { id: nw, text: "", done: false });
        return a;
      });
      focusSelectorRef.current = `[data-item="${nw}"]`;
    } else if (e.key === "Backspace" && !(e.target as HTMLInputElement).value) {
      e.preventDefault();
      const note = stateRef.current.notes.find((x) => x.id === nid);
      if (!note) return;
      const openItems = note.items.filter((x) => !x.done);
      const idx = openItems.findIndex((x) => x.id === iid);
      const prev = openItems[idx - 1];
      updItems(nid, (items) => items.filter((x) => x.id !== iid));
      focusSelectorRef.current = prev ? `[data-item="${prev.id}"]` : `[data-add-item="${nid}"]`;
    }
  };

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea";
      const s = stateRef.current;
      if (e.key === "Escape") {
        if (s.popover) patch({ popover: null });
        else if (s.expandedId) close();
        else if (typing) (e.target as HTMLElement).blur();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        newNote("text");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actions: Actions = {
    upd,
    updItems,
    maxZ,
    open,
    close,
    setView,
    toast: showToast,
    trash,
    archive,
    restore,
    deleteForever,
    toggleLabel,
    createLabel,
    pickImage,
    readImage,
    reorder,
    setPopover: (p: Popover) => patch({ popover: p }),
    setHoverId: (id) => patch({ hoverId: id }),
    setDragId: (id) => patch({ dragId: id }),
    setDropTarget: (k) => patch({ dropTarget: k }),
    setLabelQuery: (q) => patch({ labelQuery: q }),
    moveNote,
    itemKey,
    requestFocus: (sel) => {
      focusSelectorRef.current = sel;
    },
    isSuppressed: () => suppressRef.current,
    setSuppressed: (v) => {
      suppressRef.current = v;
    },
    getLastOver: () => lastOverRef.current,
    setLastOver: (id) => {
      lastOverRef.current = id;
    },
  };

  // ---- derived view ----
  const mob = state.vw < 760;
  const compact = state.vw < 1240;
  const effLayout = state.vw < 420 && state.layout === "board" ? "grid" : state.layout;

  const visible = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    let ns = state.notes.filter((n) => {
      if (n.id === state.expandedId) return true;
      if (state.view === "trash") {
        if (!n.trashed) return false;
      } else if (state.view === "archive") {
        if (!n.archived || n.trashed) return false;
      } else {
        if (n.trashed || n.archived) return false;
        if (state.view === "reminders" && !n.reminder) return false;
        if (state.view.startsWith("label:") && !n.labels.includes(state.view.slice(6))) return false;
      }
      if (state.typeFilter === "list" && n.type !== "list") return false;
      if (state.typeFilter === "image" && !n.image) return false;
      if (state.typeFilter === "reminder" && !n.reminder) return false;
      if (state.colorFilter && n.color !== state.colorFilter) return false;
      if (q) {
        const hay = [n.title, n.body, ...n.items.map((i) => i.text), ...n.labels].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (state.view === "reminders") ns = [...ns].sort((a, b) => new Date(a.reminder || 0).getTime() - new Date(b.reminder || 0).getTime());
    return ns;
  }, [state.notes, state.query, state.view, state.typeFilter, state.colorFilter, state.expandedId]);

  useMasonry(effLayout, state.vw, [visible.length, state.expandedId, state.vw, effLayout]);

  const grouped = state.view === "notes" || state.view === "reminders" || state.view.startsWith("label:");
  const active = state.notes.filter((n) => !n.trashed && !n.archived);
  const isLabel = state.view.startsWith("label:");
  const count = visible.length;
  const filtered = !!(state.query.trim() || state.typeFilter !== "all" || state.colorFilter);
  const titles: Record<string, string> = { notes: "Notes", reminders: "Reminders", archive: "Archive", trash: "Bin" };
  const ann = filtered
    ? `${count} found`
    : isLabel
    ? `${count} taped here`
    : (({
        notes: `${count} things on your mind`,
        reminders: `${count} to remember`,
        archive: "tucked away for later",
        trash: "cleared after 7 days",
      } as Record<string, string>)[state.view] ?? "");
  const empties: Record<string, [string, string]> = {
    notes: ["A clean page.", "Tear off a note from the pad above, or press N. Lists and photos live here too."],
    reminders: ["Nothing to remember.", "Set a reminder from any note’s bell, or drag a note onto Reminders for tomorrow morning."],
    archive: ["The drawer is empty.", "Archived notes stay searchable without crowding your desk."],
    trash: ["The bin is empty.", "Tossed notes wait here for 7 days before they’re gone."],
  };
  const em = filtered
    ? ["Nothing matches.", "Try another word, or clear the filters above."]
    : isLabel
    ? ["Nothing taped here yet.", "New notes written while this label is open get it automatically. You can also drag notes onto the tape."]
    : empties[state.view] ?? ["", ""];

  const now = new Date();
  const showComposer = state.view === "notes" || isLabel;

  type Section = { label: string; meta: string; notes: Note[]; isCanvas: boolean; height?: string };
  let sections: Section[] = [];
  if (effLayout === "board") {
    if (visible.length) {
      const maxY = Math.max(...visible.map((n) => n.y || 0)) + 600;
      sections = [{ label: "The desk", meta: "drag anywhere", notes: visible, isCanvas: true, height: Math.max(1100, maxY) + "px" }];
    }
  } else if (grouped) {
    const p = visible.filter((n) => n.pinned),
      o = visible.filter((n) => !n.pinned);
    if (p.length) sections.push({ label: "Pinned up", meta: String(p.length), notes: p, isCanvas: false });
    if (o.length)
      sections.push({
        label: p.length ? "Everything else" : state.view === "reminders" ? "Coming up" : "All notes",
        meta: String(o.length),
        notes: o,
        isCanvas: false,
      });
  } else if (visible.length) {
    sections.push({ label: state.view === "trash" ? "In the bin" : "Tucked away", meta: String(visible.length), notes: visible, isCanvas: false });
  }

  const gridCols = state.vw < 420 ? "minmax(0, 1fr)" : mob ? "repeat(2, minmax(0, 1fr))" : state.vw < 1000 ? "repeat(auto-fill, minmax(210px, 1fr))" : "repeat(auto-fill, minmax(244px, 1fr))";
  const gridGap = mob ? "16px 14px" : state.vw < 1000 ? "22px" : "26px";

  const dropHandlers = (key: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!stateRef.current.dragId) return;
      e.preventDefault();
      if (stateRef.current.dropTarget !== key) patch({ dropTarget: key });
    },
    onDragLeave: () => {
      if (stateRef.current.dropTarget === key) patch({ dropTarget: null });
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      dropOn(key);
    },
  });

  const navDef: { key: View; icon: string; name: string; count: number }[] = [
    { key: "notes", icon: "ph-note", name: "Notes", count: active.length },
    { key: "reminders", icon: "ph-bell-simple", name: "Reminders", count: active.filter((n) => n.reminder).length },
    { key: "archive", icon: "ph-archive", name: "Archive", count: state.notes.filter((n) => n.archived && !n.trashed).length },
    { key: "trash", icon: "ph-trash", name: "Bin", count: state.notes.filter((n) => n.trashed).length },
  ];

  const tapeRots = [-1.5, 1.2, -0.8, 1.5, -1.2];

  const rootClick = () => {
    if (state.popover) patch({ popover: null });
    else if (state.expandedId) close();
  };

  if (!loaded) {
    return (
      <div
        data-theme={state.theme}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          background: "var(--desk)",
          color: "var(--ink)",
          fontFamily: FONT_SANS,
        }}
      >
        <span style={{ fontFamily: FONT_HAND, fontSize: 26 }}>Setting the desk…</span>
      </div>
    );
  }

  return (
    <div
      data-theme={state.theme}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--desk)",
        color: "var(--ink)",
        fontFamily: FONT_SANS,
        overflow: "hidden",
        transition: "background-color 0.4s, color 0.4s",
      }}
      onClick={rootClick}
    >
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: mob ? "12px 14px" : state.vw < 1000 ? "14px 24px" : "18px 32px", position: "relative", zIndex: 100 }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", ...pillChrome, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 26, color: "var(--ink)" }}>M</div>
          {!mob && <span style={{ fontFamily: FONT_HAND, fontSize: 32, fontWeight: 600, lineHeight: 1, transform: "rotate(-3deg)" }}>Margin</span>}
        </div>

        <div style={{ flex: "1 1 0%", display: mob ? "none" : "flex", justifyContent: "center", minWidth: 0 }}>
          <nav style={{ display: "flex", gap: 2, padding: 6, borderRadius: 999, ...pillChrome, boxShadow: "inset 0 0 0 1px var(--chrome-line), 0 10px 30px -18px rgba(60,40,20,.35)", backdropFilter: "blur(10px)" }}>
            {navDef.map((it) => {
              const on = state.view === it.key;
              const drop = state.dropTarget === it.key;
              return (
                <button
                  key={it.key}
                  title={it.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    setView(it.key);
                  }}
                  {...dropHandlers(it.key)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    height: 44,
                    padding: "0 14px",
                    border: "none",
                    borderRadius: 999,
                    background: on ? "var(--chrome-on)" : drop ? "var(--hover)" : "transparent",
                    boxShadow: drop ? "inset 0 0 0 1.5px var(--stamp)" : on ? "0 1px 2px rgba(0,0,0,.08), inset 0 0 0 1px var(--chrome-line)" : "none",
                    color: on || drop ? "var(--ink)" : "var(--ink2)",
                    fontSize: 15,
                    fontWeight: on ? 600 : 500,
                    cursor: "pointer",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  <i className={(on ? "ph-fill " : "ph ") + it.icon} style={{ fontSize: 19 }} />
                  {!compact && <span>{it.name}</span>}
                  {!!it.count && !mob && (
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--ink3)", marginLeft: -3, transform: "translateY(-6px)" }}>{it.count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ flex: mob ? "1 1 0%" : "0 0 auto", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, minWidth: 0 }}>
          <div style={{ flex: mob ? "1 1 0%" : "0 0 auto", width: mob ? "auto" : 160, minWidth: 0, display: "flex", alignItems: "center", gap: 10, height: 46, padding: "0 8px 0 16px", borderRadius: 999, ...pillChrome, boxSizing: "border-box" }}>
            <i className="ph ph-magnifying-glass" style={{ fontSize: 17, color: "var(--ink3)" }} />
            <input
              ref={searchRef}
              placeholder="Search the desk"
              value={state.query}
              onChange={(e) => patch({ query: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              style={{ flex: "1 1 0%", minWidth: 0, border: "none", outline: "none", background: "none", fontSize: 14.5, color: "var(--ink)" }}
            />
            {state.query && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  patch({ query: "" });
                }}
                style={{ border: "none", background: "none", color: "var(--ink3)", cursor: "pointer", display: "flex" }}
              >
                <i className="ph ph-x" style={{ fontSize: 14 }} />
              </button>
            )}
          </div>
          <div style={{ flex: "0 0 auto", display: state.vw < 420 ? "none" : "flex", gap: 2, padding: 4, borderRadius: 999, ...pillChrome }}>
            <button
              title="Pinboard grid"
              onClick={(e) => {
                e.stopPropagation();
                patch({ layout: "grid", popover: null });
              }}
              style={{ width: 38, height: 38, border: "none", borderRadius: "50%", background: state.layout === "grid" ? "var(--chrome-on)" : "transparent", boxShadow: state.layout === "grid" ? "0 1px 2px rgba(0,0,0,.1), inset 0 0 0 1px var(--chrome-line)" : "none", color: state.layout === "grid" ? "var(--ink)" : "var(--ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <i className="ph ph-squares-four" style={{ fontSize: 18 }} />
            </button>
            <button
              title="Free desk"
              onClick={(e) => {
                e.stopPropagation();
                patch({ layout: "board", popover: null });
              }}
              style={{ width: 38, height: 38, border: "none", borderRadius: "50%", background: state.layout === "board" ? "var(--chrome-on)" : "transparent", boxShadow: state.layout === "board" ? "0 1px 2px rgba(0,0,0,.1), inset 0 0 0 1px var(--chrome-line)" : "none", color: state.layout === "board" ? "var(--ink)" : "var(--ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <i className="ph ph-hand-grabbing" style={{ fontSize: 18 }} />
            </button>
          </div>
          <button
            title={state.theme === "light" ? "Lights off" : "Lights on"}
            className="scp1"
            onClick={(e) => {
              e.stopPropagation();
              patch({ theme: state.theme === "light" ? "dark" : "light" });
            }}
            style={{ flex: "0 0 auto", width: 46, height: 46, border: "none", borderRadius: "50%", ...pillChrome, color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <i className={state.theme === "light" ? "ph ph-lamp" : "ph-fill ph-lamp"} style={{ fontSize: 20 }} />
          </button>
        </div>
      </div>

      {/* scroll area */}
      <div
        ref={scrollRef}
        data-canvas-scroll="1"
        style={{
          flex: "1 1 0%",
          overflow: "hidden auto",
          position: "relative",
          backgroundImage: "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          backgroundAttachment: "local",
        }}
      >
        <div style={{ maxWidth: 1480, margin: "0 auto", padding: state.vw < 420 ? "16px 14px 180px" : mob ? "18px 18px 180px" : state.vw < 1000 ? "22px 28px 140px" : "26px 40px 140px" }}>
          {/* header */}
          <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 28, flexWrap: "wrap", marginBottom: 34 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24, minWidth: 0 }}>
              <div style={{ flex: "0 0 auto", padding: 6, background: "radial-gradient(circle, transparent 3.5px, rgb(255,253,246) 4px) -5px -5px / 10px 10px", transform: "rotate(-5deg)", filter: "var(--sh1)" }}>
                <div style={{ background: "rgb(255,253,246)", padding: 6 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 12px", border: "1.5px solid rgb(31,90,69)", color: "rgb(31,90,69)" }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em" }}>{now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</span>
                    <span style={{ fontFamily: FONT_SERIF, fontSize: 40, lineHeight: 0.9 }}>{pad(now.getDate())}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em", color: "rgb(200,67,47)" }}>
                      {now.toLocaleDateString("en-US", { month: "short" }).toUpperCase()} {now.getFullYear()}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <h1 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 400, fontSize: state.vw < 420 ? 42 : mob ? 52 : state.vw < 1000 ? 64 : 78, lineHeight: 0.95, letterSpacing: "-0.02em" }}>
                  {isLabel ? state.view.slice(6) : titles[state.view as keyof typeof titles]}
                </h1>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, marginLeft: 6 }}>
                  <span style={{ fontFamily: FONT_HAND, fontSize: 25, color: "var(--stamp)", transform: "rotate(-1.5deg)", transformOrigin: "left center" }}>{ann}</span>
                  <svg width="170" height="10" viewBox="0 0 170 10" style={{ marginTop: -4 }}>
                    <path d="M2 7 C 30 2, 52 10, 84 5 S 138 2, 168 6" stroke="var(--stamp)" strokeWidth={2} fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {showComposer && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 22, zoom: state.vw < 420 ? 0.62 : mob ? 0.74 : state.vw < 1000 ? 0.86 : 1 }}>
                <button
                  title="New note (N)"
                  className="scp2"
                  onClick={(e) => {
                    e.stopPropagation();
                    newNote("text");
                  }}
                  style={{ position: "relative", width: 200, height: 132, padding: 0, border: "none", background: "none", cursor: "pointer", transform: "rotate(-2deg)", transition: "transform 0.3s cubic-bezier(0.2,0.9,0.3,1.3)" }}
                >
                  <span style={{ position: "absolute", inset: 0, background: "rgb(239,217,135)", transform: "rotate(5deg) translate(6px,4px)", boxShadow: "var(--bs1)" }} />
                  <span style={{ position: "absolute", inset: 0, background: "rgb(246,226,152)", transform: "rotate(2deg) translate(3px,2px)" }} />
                  <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px 18px", background: "rgb(251,233,166)", textAlign: "left", color: "rgb(42,37,32)" }}>
                    <span style={{ fontFamily: FONT_HAND, fontSize: 28, lineHeight: 1 }}>Write a note…</span>
                    <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: FONT_MONO, fontSize: 11, color: "rgb(122,109,85)", letterSpacing: "0.08em" }}>
                      <span>TEAR OFF</span>
                      <span style={{ border: "1px solid", borderRadius: 3, padding: "0 5px" }}>N</span>
                    </span>
                  </span>
                </button>
                <button
                  title="New checklist"
                  className="scp3"
                  onClick={(e) => {
                    e.stopPropagation();
                    newNote("list");
                  }}
                  style={{ position: "relative", width: 118, height: 140, padding: 0, border: "none", background: "none", cursor: "pointer", transform: "rotate(2.5deg)", filter: "var(--sh1)", transition: "transform 0.3s cubic-bezier(0.2,0.9,0.3,1.3)" }}
                >
                  <span style={{ position: "absolute", inset: "0 0 8px", display: "flex", flexDirection: "column", gap: 7, padding: 14, background: "rgb(255,253,246)", fontFamily: FONT_MONO, color: "rgb(42,37,32)", textAlign: "left" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textAlign: "center" }}>LIST</span>
                    <span style={{ borderTop: "1.5px dashed rgba(42,37,32,.3)" }} />
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <span style={{ width: 9, height: 9, border: "1.5px solid rgb(42,37,32)", borderRadius: 2, display: "inline-block" }} />
                      milk
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <span style={{ width: 9, height: 9, border: "1.5px solid rgb(42,37,32)", borderRadius: 2, display: "inline-block" }} />
                      stamps
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgb(143,132,116)", textDecoration: "line-through" }}>
                      <span style={{ width: 9, height: 9, background: "rgb(42,37,32)", border: "1.5px solid rgb(42,37,32)", borderRadius: 2, display: "inline-block" }} />
                      call Ana
                    </span>
                    <span style={{ marginTop: "auto", height: 14, background: "repeating-linear-gradient(90deg, rgb(42,37,32) 0, rgb(42,37,32) 2px, transparent 2px, transparent 4px, rgb(42,37,32) 4px, rgb(42,37,32) 5px, transparent 5px, transparent 8px)" }} />
                  </span>
                  <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: "conic-gradient(from -45deg at 50% 100%, rgb(255,253,246) 90deg, transparent 0) 0 0 / 12px 8px repeat-x" }} />
                </button>
                <button
                  title="New photo note"
                  className="scp4"
                  onClick={(e) => {
                    e.stopPropagation();
                    newNote("text", true);
                  }}
                  style={{ width: 112, padding: "9px 9px 0", border: "none", background: "rgb(255,253,246)", cursor: "pointer", transform: "rotate(-4deg)", boxShadow: "var(--bs1)", display: "flex", flexDirection: "column", transition: "transform 0.3s cubic-bezier(0.2,0.9,0.3,1.3)" }}
                >
                  <span style={{ height: 84, background: "repeating-linear-gradient(135deg, rgba(42,37,32,.09) 0, rgba(42,37,32,.09) 6px, transparent 6px, transparent 12px)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgb(143,132,116)" }}>
                    <i className="ph ph-camera" style={{ fontSize: 24 }} />
                  </span>
                  <span style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_HAND, fontSize: 22, color: "rgb(42,37,32)" }}>a photo</span>
                </button>
              </div>
            )}
          </header>

          {/* filter bar */}
          <FilterBar state={state} patch={patch} createLabel={createLabel} removeLabel={removeLabel} dropHandlers={dropHandlers} tapeRots={tapeRots} />

          {/* trash bar */}
          {state.view === "trash" && state.notes.some((n) => n.trashed) && (
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", maxWidth: 560, padding: "14px 14px 14px 20px", marginBottom: 36, background: "rgb(255,253,246)", color: "rgb(42,37,32)", transform: "rotate(-0.6deg)", boxShadow: "var(--bs1)" }}
            >
              <span style={{ fontFamily: FONT_HAND, fontSize: 23 }}>Notes in the bin are gone for good after 7 days.</span>
              <button
                className="scpb"
                onClick={(e) => {
                  e.stopPropagation();
                  emptyTrash();
                }}
                style={{ height: 38, padding: "0 16px", border: "1.5px solid rgb(200,67,47)", borderRadius: 4, background: "none", color: "rgb(200,67,47)", fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer" }}
              >
                EMPTY BIN
              </button>
            </div>
          )}

          {/* sections */}
          {sections.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "60px 20px", color: "var(--ink2)" }}>
              <span style={{ fontFamily: FONT_HAND, fontSize: 30 }}>{em[0]}</span>
              <span style={{ maxWidth: 420, fontSize: 14.5, lineHeight: 1.6 }}>{em[1]}</span>
            </div>
          ) : (
            sections.map((sec) => (
              <div key={sec.label} style={{ marginBottom: 44, position: sec.isCanvas ? "relative" : undefined }}>
                {!sec.isCanvas && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
                    <span style={{ fontFamily: FONT_HAND, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{sec.label}</span>
                    <span style={{ height: 22, padding: "0 8px", display: "inline-flex", alignItems: "center", border: "1px solid var(--chrome-line)", borderRadius: 999, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.06em", color: "var(--ink3)" }}>{sec.meta}</span>
                    <span style={{ flex: 1, borderTop: "1.5px dashed var(--chrome-line)" }} />
                  </div>
                )}
                {sec.isCanvas ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
                    <span style={{ fontFamily: FONT_HAND, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{sec.label}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--ink3)" }}>{sec.meta}</span>
                    <span style={{ flex: 1, borderTop: "1.5px dashed var(--chrome-line)" }} />
                  </div>
                ) : null}
                <div
                  data-grid={sec.isCanvas ? "0" : "1"}
                  data-canvas={sec.isCanvas ? "1" : "0"}
                  style={
                    sec.isCanvas
                      ? { position: "relative", width: "100%", height: sec.height, border: "1.5px dashed var(--chrome-line)", borderRadius: 18 }
                      : { display: "grid", position: "relative", gridTemplateColumns: gridCols, gridAutoRows: "4px", gridAutoFlow: "dense", columnGap: gridGap, borderRadius: 18 }
                  }
                >
                  {sec.notes.map((n) => (
                    <NoteCard key={n.id} note={n} state={state} actions={actions} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* mobile bottom nav */}
      {mob && !state.expandedId && (
        <nav
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: "calc(12px + env(safe-area-inset-bottom))",
            maxWidth: 520,
            margin: "0 auto",
            zIndex: 1500,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            padding: 6,
            borderRadius: 22,
            ...pillChrome,
            boxShadow: "inset 0 0 0 1px var(--chrome-line), 0 14px 34px -14px rgba(0,0,0,.4)",
            backdropFilter: "blur(12px)",
          }}
        >
          {navDef.map((it) => {
            const on = state.view === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setView(it.key)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, height: 54, border: "none", borderRadius: 16, background: on ? "var(--chrome-on)" : "transparent", color: on ? "var(--ink)" : "var(--ink2)", cursor: "pointer" }}
              >
                <i className={(on ? "ph-fill " : "ph ") + it.icon} style={{ fontSize: 21 }} />
                <span style={{ fontSize: 11, fontWeight: on ? 600 : 500 }}>{it.name}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* FAB */}
      {mob && !state.expandedId && (
        <button
          title="New note"
          onClick={(e) => {
            e.stopPropagation();
            newNote("text");
          }}
          style={{
            position: "fixed",
            right: 22,
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            zIndex: 1500,
            width: 62,
            height: 62,
            border: "none",
            background: "rgb(251,233,166)",
            color: "rgb(42,37,32)",
            transform: "rotate(-5deg)",
            boxShadow: "var(--bs2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
          }}
        >
          <i className="ph ph-plus" style={{ fontSize: 26 }} />
        </button>
      )}

      {/* toast */}
      {state.toast && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: "50%",
            bottom: mob ? "170px" : "32px",
            transform: "translateX(-50%)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: mob ? "wrap" : "nowrap",
            maxWidth: "calc(100% - 32px)",
            padding: "12px 10px 12px 18px",
            background: "#2a2520",
            color: "#fffdf6",
            borderRadius: 999,
            boxShadow: "0 20px 40px -14px rgba(0,0,0,.5)",
            fontSize: 14,
          }}
        >
          <span>{state.toast.text}</span>
          {state.toast.undo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const u = stateRef.current.toast?.undo;
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                patch({ toast: null });
                u?.();
              }}
              style={{ border: "none", borderRadius: 999, padding: "8px 14px", background: "rgba(255,255,255,.14)", color: "#f3d47a", fontWeight: 600, cursor: "pointer" }}
            >
              Undo
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              patch({ toast: null });
            }}
            style={{ border: "none", background: "none", color: "#8f8474", cursor: "pointer", display: "flex", padding: 4 }}
          >
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}

function FilterBar({
  state,
  patch,
  createLabel,
  removeLabel,
  dropHandlers,
  tapeRots,
}: {
  state: AppState;
  patch: (u: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
  createLabel: (name: string, noteId?: string) => void;
  removeLabel: (name: string) => void;
  dropHandlers: (key: string) => { onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void; onDrop: (e: React.DragEvent) => void };
  tapeRots: number[];
}) {
  const active = state.notes.filter((n) => !n.trashed && !n.archived);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const typeChips: [AppState["typeFilter"], string][] = [
    ["all", "ALL"],
    ["list", "LISTS"],
    ["image", "PHOTOS"],
    ["reminder", "DATED"],
  ];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", marginBottom: 40, background: "var(--chrome)", borderRadius: 16, boxShadow: "inset 0 0 0 1px var(--chrome-line), var(--bs1)" }}
    >
      <div style={{ flex: "1 1 100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 12, padding: "14px 22px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, height: 22 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em", color: "var(--ink3)" }}>LABELS</span>
          <button
            className="scp5"
            onClick={() => patch({ editLabels: !state.editLabels })}
            style={{ height: 22, padding: "0 8px", border: "none", borderRadius: 999, background: "none", fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--ink3)", cursor: "pointer" }}
          >
            {state.editLabels ? "DONE" : "EDIT"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
          {state.labels.map((l, i) => {
            const key = `label:${l}` as View;
            const on = state.view === key;
            const drop = state.dropTarget === key;
            return (
              <div key={l} style={{ position: "relative", display: "flex" }}>
                <button
                  className="scp6"
                  onClick={() => patch({ view: on ? "notes" : (key as AppState["view"]) })}
                  {...dropHandlers(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    height: 34,
                    padding: "0 16px",
                    border: "none",
                    backgroundColor: TAPES[i % 5],
                    backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0, rgba(255,255,255,.22) 6px, transparent 6px, transparent 12px)",
                    clipPath: "polygon(0 10%, 4% 0, 96% 6%, 100% 0, 98% 32%, 100% 58%, 97% 82%, 100% 100%, 3% 95%, 0 100%, 2% 70%, 0 44%, 3% 22%)",
                    transform: on || drop ? "rotate(0deg) translateY(-3px) scale(1.05)" : `rotate(${tapeRots[i % 5]}deg)`,
                    opacity: on || drop || state.view === "notes" || !state.view.startsWith("label:") ? 1 : 0.6,
                    outline: drop ? "2px dashed var(--stamp)" : "none",
                    outlineOffset: 3,
                    color: "rgb(42,37,32)",
                    cursor: "pointer",
                    transition: "transform 0.3s cubic-bezier(0.2,0.9,0.3,1.3), opacity 0.2s",
                  }}
                >
                  <span style={{ fontFamily: FONT_HAND, fontSize: 21, fontWeight: on ? 600 : 400, lineHeight: "34px" }}>{l.toLowerCase()}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, opacity: 0.65 }}>{active.filter((n) => n.labels.includes(l)).length}</span>
                </button>
                {state.editLabels && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLabel(l);
                    }}
                    title="Remove label"
                    style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, border: "none", borderRadius: "50%", background: "#2a2520", color: "#fffdf6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <i className="ph ph-x" style={{ fontSize: 11 }} />
                  </button>
                )}
              </div>
            );
          })}

          {adding ? (
            <input
              ref={inputRef}
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onBlur={() => {
                if (newLabel.trim()) createLabel(newLabel);
                setAdding(false);
                setNewLabel("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createLabel(newLabel);
                  setAdding(false);
                  setNewLabel("");
                } else if (e.key === "Escape") {
                  setAdding(false);
                }
              }}
              placeholder="label name"
              style={{ height: 34, padding: "0 12px", border: "1.5px dashed var(--chrome-line)", borderRadius: 2, background: "none", color: "var(--ink)", fontFamily: FONT_HAND, fontSize: 21, outline: "none" }}
            />
          ) : (
            <button
              title="New label"
              className="scp7"
              onClick={() => setAdding(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", border: "1.5px dashed var(--chrome-line)", borderRadius: 2, background: "none", color: "var(--ink3)", fontFamily: FONT_HAND, fontSize: 21, cursor: "pointer" }}
            >
              <i className="ph ph-plus" style={{ fontSize: 13 }} />
              new tape
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: "1 1 100%", width: 0, borderTop: "1.5px dashed var(--chrome-line)", margin: "0 22px" }} />

      <div style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 12, padding: "14px 22px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", height: 22 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em", color: "var(--ink3)" }}>SHOW</span>
        </div>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "var(--hover)", width: "max-content", maxWidth: "100%", flexWrap: "wrap" }}>
          {typeChips.map(([k, label]) => {
            const on = state.typeFilter === k;
            return (
              <button
                key={k}
                className="scp8"
                onClick={() => patch({ typeFilter: k })}
                style={{ height: 30, padding: "0 13px", border: "none", borderRadius: 999, background: on ? "var(--chrome-on)" : "transparent", boxShadow: on ? "0 1px 2px rgba(0,0,0,.12), inset 0 0 0 1px var(--chrome-line)" : "none", color: on ? "var(--ink)" : "var(--ink3)", fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", transition: "background 0.2s, color 0.2s" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: "0 0 auto", width: 0, borderLeft: "1.5px dashed var(--chrome-line)", margin: "14px 0" }} />

      <div style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 12, padding: "14px 22px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, height: 22 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em", color: "var(--ink3)" }}>PAPER</span>
          {state.colorFilter && (
            <button
              onClick={() => patch({ colorFilter: null })}
              style={{ border: "none", background: "none", color: "var(--ink3)", cursor: "pointer", fontSize: 11 }}
            >
              <i className="ph ph-x" style={{ fontSize: 11 }} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", height: 36 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              title={CNAME[c]}
              className="scpa"
              onClick={() => patch({ colorFilter: state.colorFilter === c ? null : c })}
              style={{
                width: 24,
                height: 30,
                padding: 0,
                border: "none",
                borderRadius: 2,
                background: `var(--n-${c})`,
                boxShadow:
                  state.colorFilter === c
                    ? "inset 0 0 0 1px rgba(42,37,32,.2), 0 0 0 2px var(--chrome-on), 0 0 0 3.5px var(--ink)"
                    : "inset 0 0 0 1px rgba(42,37,32,.16), 0 1px 2px rgba(42,37,32,.12)",
                transform: state.colorFilter === c ? "translateY(-4px)" : "none",
                cursor: "pointer",
                transition: "transform 0.25s cubic-bezier(0.2,0.9,0.3,1.3)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
