import type React from "react";
import type { AppState, Actions, Note, Item, PopoverKind } from "./types";
import { COLORS, CNAME, TAPES, FONT_SERIF, FONT_HAND, FONT_MONO, hash, rdate, ago, toLocalInput, fmtRem, remPresets, uid } from "./lib";

export function computeNoteVals(n: Note, st: AppState, actions: Actions) {
  const board = st.layout === "board";
  const mob = st.vw < 760;
  const exp = st.expandedId === n.id;
  const pop = st.popover && st.popover.id === n.id ? st.popover.kind : null;
  const hov = st.hoverId === n.id && !mob && !st.touch;
  const dragging = st.dragId === n.id;
  const tidy = false;
  const handTitles = false;
  const alwaysBar = false;
  const h = hash(n.id);
  const rot = tidy ? 0 : ((h % 9) - 4) * 0.55;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const box = (on: boolean) => ({
    boxBg: on ? "#2a2520" : "transparent",
    boxBorder: on ? "#2a2520" : "#5f5649",
    checkOpacity: on ? 1 : 0,
  });
  const tog = (iid: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.updItems(n.id, (items) => items.map((i) => (i.id === iid ? { ...i, done: !i.done } : i)));
  };
  const openItems = n.items.filter((i) => !i.done);
  const doneItems = n.items.filter((i) => i.done);
  const isList = n.type === "list";
  const quote = n.type === "text" && !n.image && !n.title && n.body.length < 200 && !!n.body;
  const kind: "receipt" | "polaroid" | "quote" | "card" = isList ? "receipt" : n.image ? "polaroid" : quote ? "quote" : "card";
  const over = !!(n.reminder && new Date(n.reminder) < new Date());

  const pop_ = (kind: PopoverKind) => (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.setPopover(st.popover && st.popover.id === n.id && st.popover.kind === kind ? null : { id: n.id, kind });
    actions.setLabelQuery("");
    if (kind === "label") actions.requestFocus(`[data-label-q="${n.id}"]`);
  };
  const lq = st.labelQuery.trim().toLowerCase();

  const editItem = (i: Item) => ({
    id: i.id,
    text: i.text,
    ...box(i.done),
    toggle: tog(i.id),
    onText: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      actions.updItems(n.id, (items) => items.map((x) => (x.id === i.id ? { ...x, text: v } : x)));
    },
    onKey: (e: React.KeyboardEvent<HTMLInputElement>) => actions.itemKey(e, n.id, i.id),
    remove: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.updItems(n.id, (items) => items.filter((x) => x.id !== i.id));
    },
  });

  const lines = n.body
    .split("\n")
    .reduce((a, l) => a + Math.max(1, Math.ceil(l.length / (n.wide || exp ? 60 : 34))), 0);
  const flat = exp || hov || !!pop || (board && dragging);
  const transform = exp
    ? "none"
    : board && dragging
    ? "rotate(0deg) scale(1.04)"
    : `rotate(${flat ? 0 : rot}deg) translateY(${hov && !board ? -5 : 0}px)`;
  const sh = exp ? "var(--bs3)" : hov || dragging || pop ? "var(--bs2)" : "var(--bs1)";
  const bgVar = `var(--n-${n.color})`;
  const titleFont = kind === "receipt" ? FONT_MONO : kind === "polaroid" ? FONT_HAND : handTitles ? FONT_HAND : FONT_SERIF;
  const big = n.wide || exp;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!board || e.button !== 0 || exp) return;
    const target = e.target as HTMLElement;
    if (target.closest("button,input,textarea,[data-pop]")) return;
    const cvEl = document.querySelector('[data-canvas="1"]') as HTMLElement | null;
    const cap = cvEl ? cvEl.clientWidth - (n.wide ? 400 : 252) - 8 : 1e5;
    const sx = e.clientX,
      sy = e.clientY,
      ox = Math.min(n.x || 0, cap),
      oy = n.y || 0,
      id = n.id,
      z = actions.maxZ() + 1;
    let moved = false;
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx,
        dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) {
        moved = true;
        actions.setDragId(id);
        actions.setPopover(null);
      }
      const cv = document.querySelector('[data-canvas="1"]') as HTMLElement | null;
      const maxX = cv ? cv.clientWidth - (n.wide ? 400 : 252) - 8 : 1e5;
      const nx = Math.max(0, Math.min(maxX, Math.round(ox + dx)));
      const ny = Math.max(0, Math.round(oy + dy));
      actions.moveNote(id, nx, ny, z);
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      if (moved) {
        actions.setSuppressed(true);
        setTimeout(() => actions.setSuppressed(false), 80);
        actions.setDragId(null);
      }
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  return {
    id: n.id,
    kind,
    title: n.title,
    body: n.body,
    hasTitle: !!n.title,
    hasBody: n.type === "text" && !!n.body,
    isList,
    isText: n.type === "text",
    isReceipt: kind === "receipt",
    collapsed: !exp,
    expanded: exp,
    pinned: !!n.pinned,
    showPinBtn: !n.pinned && !n.trashed,
    hasTape: !n.pinned,
    tapeColor: TAPES[h % 5],
    tapeLeft: ["50%", "28%", "70%"][(h >> 3) % 3],
    tapeTransform: `translateX(-50%) rotate(${((h >> 5) % 9) - 4}deg)`,
    bg: bgVar,
    paperImg:
      kind === "quote"
        ? "linear-gradient(90deg, transparent 38px, rgba(200,67,47,.35) 38px, rgba(200,67,47,.35) 39.5px, transparent 39.5px), repeating-linear-gradient(transparent 0 33px, rgba(70,110,160,.2) 33px 34px)"
        : "none",
    radius: kind === "receipt" ? "2px 2px 0 0" : "2px",
    zig: `conic-gradient(from -45deg at 50% 100%, ${bgVar} 90deg, transparent 0) 0 0 / 12px 9px repeat-x`,
    titleFont,
    titleSize:
      kind === "receipt"
        ? "15px"
        : kind === "polaroid"
        ? big
          ? "32px"
          : "28px"
        : titleFont === FONT_HAND
        ? big
          ? "34px"
          : "29px"
        : big
        ? "30px"
        : "25px",
    editTitleSize: kind === "receipt" ? "17px" : titleFont === FONT_HAND ? "36px" : mob ? "27px" : "32px",
    titleWeight: kind === "receipt" ? "700" : titleFont === FONT_HAND ? "600" : "400",
    titleTransform: kind === "receipt" ? "uppercase" : "none",
    titleAlign: kind === "receipt" ? "center" : "left",
    titleTracking: kind === "receipt" ? ".14em" : "-0.005em",
    titlePad: kind === "receipt" ? "0" : "24px",
    titlePh: kind === "receipt" ? "LIST NAME" : "Title",
    receiptDate: rdate(n.edited),
    receiptItems: `ITEMS ${String(n.items.length).padStart(2, "0")}`,
    receiptDone: `DONE ${String(doneItems.length).padStart(2, "0")}`,
    contentPad:
      kind === "receipt" ? "20px 20px 12px" : kind === "quote" ? "22px 22px 12px 54px" : kind === "polaroid" ? "12px 18px 8px" : "22px 20px 10px",
    editPad: kind === "quote" ? "24px 24px 14px 56px" : mob ? "20px 18px 12px" : "24px 26px 14px",
    bodyFont: quote ? FONT_HAND : "inherit",
    bodySize: quote ? (n.wide ? "31px" : "27px") : "14.5px",
    bodyEditSize: quote ? "30px" : "15.5px",
    bodyLine: quote ? "34px" : "1.55",
    bodyEditLine: quote ? "34px" : "1.6",
    bodyColor: quote ? "var(--p-ink)" : "var(--p-ink2)",
    bodyPad: n.title ? "0" : "22px",
    bodyRows: Math.max(3, lines + 1),
    hasImgSrc: !!(n.image && n.image.src),
    imgSrc: n.image && n.image.src ? n.image.src : null,
    hasImgPh: !!(n.image && n.image.ph),
    imgCaption: n.image && n.image.ph ? n.image.ph : "",
    phHeight: n.wide ? "210px" : "150px",
    previewOpen: openItems.slice(0, 7).map((i) => ({ id: i.id, text: i.text, ...box(false), toggle: tog(i.id) })),
    hasMoreOpen: openItems.length > 7,
    moreOpenText: `+ ${openItems.length - 7} more`,
    hasDone: doneItems.length > 0,
    doneText: `${doneItems.length} CHECKED`,
    editOpen: openItems.map(editItem),
    editDone: doneItems.map(editItem),
    hasReminder: !!n.reminder,
    reminderText: n.reminder ? fmtRem(n.reminder) : "",
    remColor: over ? "#c8432f" : "#1f5a45",
    remInput: toLocalInput(n.reminder),
    labelsView: n.labels.map((l) => ({
      name: l.toLowerCase(),
      display: l,
      go: (e: React.MouseEvent) => {
        e.stopPropagation();
        actions.setView(`label:${l}`);
      },
      remove: (e: React.MouseEvent) => {
        e.stopPropagation();
        actions.toggleLabel(n.id, l);
      },
    })),
    hasMeta: !!n.reminder || n.labels.length > 0,
    pinClass: n.pinned ? "ph-fill ph-push-pin" : "ph ph-push-pin",
    pinTitle: n.pinned ? "Unpin" : "Pin to top",
    pinColor: n.pinned ? "#c8432f" : "var(--p-ink2)",
    pinOpacity: hov ? 1 : 0,
    wideIcon: n.wide ? "ph-arrows-in-simple" : "ph-arrows-out-simple",
    wideTitle: n.wide ? "Make narrow" : "Make wide",
    archiveIcon: n.archived ? "ph-tray-arrow-up" : "ph-archive",
    archiveTitle: n.archived ? "Unarchive" : "Archive",
    convertIcon: isList ? "ph-text-align-left" : "ph-list-checks",
    convertTitle: isList ? "Turn into a note" : "Turn into a list",
    editedText: ago(n.edited),
    notTrashed: !n.trashed,
    isTrashed: !!n.trashed,
    barDisplay: mob || st.touch ? "none" : "flex",
    toolbarOpacity: alwaysBar || hov || pop ? 1 : 0,
    transform,
    shadow: sh,
    pos: board ? "absolute" : "relative",
    left: board
      ? `max(0px, min(${n.x || 0}px, calc(100% - ${exp ? "min(500px, 100%)" : n.wide ? "min(400px, 100%)" : "min(252px, 100%)"} - 4px)))`
      : "auto",
    top: board ? (n.y || 0) + "px" : "auto",
    width: board ? (exp ? "min(500px, 100%)" : n.wide ? "min(400px, 100%)" : "min(252px, 100%)") : "auto",
    colSpan: board ? "auto" : (st.vw < 1000 && exp) || (mob && n.wide) ? "1 / -1" : exp || n.wide ? "span 2" : "span 1",
    z: board ? (exp ? 1000 : pop ? 999 : n.z || 1) : exp || pop ? 20 : hov ? 3 : 1,
    opacity: dragging && !board ? 0.35 : n.trashed ? 0.72 : 1,
    cursor: board ? (exp ? "default" : dragging ? "grabbing" : "grab") : exp ? "default" : "pointer",
    userSelect: board && !exp ? "none" : "auto",
    touchAction: board && !exp ? "none" : "auto",
    draggable: !board && !exp && !n.trashed,
    popColor: pop === "color",
    popReminder: pop === "reminder",
    popLabel: pop === "label",
    colorName: CNAME[n.color].toLowerCase(),
    colorOptions: COLORS.map((c) => ({
      name: CNAME[c],
      bg: `var(--n-${c})`,
      ring: n.color === c ? "0 0 0 2px #fffdf6, 0 0 0 4px #2a2520" : "none",
      select: (e: React.MouseEvent) => {
        e.stopPropagation();
        actions.upd(n.id, { color: c });
      },
    })),
    remPresets: remPresets().map((p) => ({
      label: p.label,
      sub: p.sub,
      set: (e: React.MouseEvent) => {
        e.stopPropagation();
        actions.upd(n.id, { reminder: p.iso });
        actions.setPopover(null);
      },
    })),
    onCustomRem: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v) actions.upd(n.id, { reminder: new Date(v).toISOString() });
    },
    onClearRem: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.upd(n.id, { reminder: null });
      actions.setPopover(null);
    },
    labelOptions: st.labels
      .filter((l) => !lq || l.toLowerCase().includes(lq))
      .map((l) => ({
        name: l,
        ...box(n.labels.includes(l)),
        toggle: (e: React.MouseEvent) => {
          e.stopPropagation();
          actions.toggleLabel(n.id, l);
        },
      })),
    labelQueryRaw: st.labelQuery,
    onLabelQueryChange: (q: string) => actions.setLabelQuery(q),
    canCreateLabel: !!lq && !st.labels.some((l) => l.toLowerCase() === lq),
    createLabelText: `Make “${st.labelQuery.trim()}”`,
    onCreateLabel: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.createLabel(st.labelQuery, n.id);
    },
    onLabelKey: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        actions.createLabel(st.labelQuery, n.id);
      }
    },
    stop,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (actions.isSuppressed()) {
        actions.setSuppressed(false);
        return;
      }
      if (st.popover && !(e.target as HTMLElement).closest("[data-pop]")) actions.setPopover(null);
      if (!exp && !n.trashed) actions.open(n.id);
    },
    onEnter: () => {
      if (st.hoverId !== n.id) actions.setHoverId(n.id);
    },
    onLeave: () => {
      if (st.hoverId === n.id) actions.setHoverId(null);
    },
    onDragStart: (e: React.DragEvent) => {
      if (exp || board) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", n.id);
      } catch {}
      actions.setLastOver(null);
      actions.setDragId(n.id);
      actions.setPopover(null);
    },
    onDragOver: (e: React.DragEvent) => {
      const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
      if (types.includes("Files")) {
        e.preventDefault();
        return;
      }
      const d = st.dragId;
      if (!d) return;
      e.preventDefault();
      if (d === n.id || actions.getLastOver() === n.id) return;
      actions.setLastOver(n.id);
      actions.reorder(d, n.id);
    },
    onDragEnd: () => {
      actions.setLastOver(null);
      actions.setDragId(null);
      actions.setDropTarget(null);
    },
    onDrop: (e: React.DragEvent) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) {
        e.preventDefault();
        actions.readImage(f, n.id);
      } else if (st.dragId) e.preventDefault();
    },
    onPointerDown,
    onPin: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.upd(n.id, { pinned: !n.pinned }, false);
    },
    onRem: pop_("reminder"),
    onColor: pop_("color"),
    onLabel: pop_("label"),
    onImage: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.pickImage(n.id);
    },
    onRemoveImage: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.upd(n.id, { image: null });
    },
    onWide: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.upd(n.id, { wide: !n.wide }, false);
    },
    onArchive: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.archive(n.id);
    },
    onTrash: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.trash(n.id);
    },
    onRestore: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.restore(n.id);
    },
    onDeleteForever: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.deleteForever(n.id);
    },
    onConvert: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (n.type === "text")
        actions.upd(n.id, {
          type: "list",
          items: n.body
            .split("\n")
            .filter((l) => l.trim())
            .map((t) => ({ id: uid(), text: t.replace(/^[-*•]\s*/, ""), done: false })),
          body: "",
        });
      else actions.upd(n.id, { type: "text", body: n.items.map((i) => i.text).join("\n"), items: [] });
    },
    onDone: (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.close();
    },
    onTitle: (e: React.ChangeEvent<HTMLInputElement>) => actions.upd(n.id, { title: e.target.value }),
    onTitleKey: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        actions.requestFocus(isList ? `[data-add-item="${n.id}"]` : `[data-body-input="${n.id}"]`);
      }
    },
    onBody: (e: React.ChangeEvent<HTMLTextAreaElement>) => actions.upd(n.id, { body: e.target.value }),
    onAddItem: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const el = e.target as HTMLInputElement;
      const v = el.value.trim();
      if (!v) return;
      const iid = uid();
      actions.updItems(n.id, (items) => [...items, { id: iid, text: v, done: false }]);
      el.value = "";
      actions.requestFocus(`[data-item="${iid}"]`);
    },
  };
}

export type NoteVals = ReturnType<typeof computeNoteVals>;
