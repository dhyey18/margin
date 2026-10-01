"use client";

import type { CSSProperties } from "react";
import type { AppState, Actions, Note } from "./types";
import { computeNoteVals } from "./noteVals";
import { FONT_HAND, FONT_MONO } from "./lib";

const iconBtn: CSSProperties = {
  width: 32,
  height: 32,
  padding: 0,
  border: "none",
  borderRadius: "50%",
  background: "none",
  color: "var(--p-ink2)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const iconBtnBig: CSSProperties = { ...iconBtn, width: 36, height: 36 };

export default function NoteCard({ note, state, actions }: { note: Note; state: AppState; actions: Actions }) {
  const v = computeNoteVals(note, state, actions);

  const wrapperStyle: CSSProperties = {
    position: v.pos as CSSProperties["position"],
    left: v.left,
    top: v.top,
    width: v.width,
    gridColumn: v.colSpan,
    alignSelf: "start",
    boxSizing: "border-box",
    paddingTop: 14,
    zIndex: v.z,
    opacity: v.opacity,
    cursor: v.cursor,
    userSelect: v.userSelect as CSSProperties["userSelect"],
    touchAction: v.touchAction,
    transform: v.transform,
    backfaceVisibility: "hidden",
  };

  const paperStyle: CSSProperties = {
    position: "relative",
    backgroundColor: v.bg,
    backgroundImage: v.paperImg,
    borderRadius: v.radius,
    boxShadow: v.shadow,
    color: "var(--p-ink)",
    transition: "background-color 0.3s, box-shadow 0.3s",
  };

  return (
    <div
      className="note-card"
      data-note-id={note.id}
      draggable={v.draggable}
      style={wrapperStyle}
      onClick={v.onClick}
      onMouseEnter={v.onEnter}
      onMouseLeave={v.onLeave}
      onDragStart={v.onDragStart}
      onDragOver={v.onDragOver}
      onDragEnd={v.onDragEnd}
      onDrop={v.onDrop}
      onPointerDown={v.onPointerDown}
    >
      <div style={paperStyle}>
        {v.pinned && (
          <button
            title="Unpin"
            onClick={v.onPin}
            style={{
              position: "absolute",
              zIndex: 3,
              top: -12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 30,
              height: 30,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 19,
                height: 19,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%, rgb(246,165,147) 0, rgb(210,75,53) 45%, rgb(142,42,28) 100%)",
                boxShadow: "rgba(0,0,0,.32) 0 3px 4px, rgba(0,0,0,.2) 0 -2px 3px inset",
              }}
            />
          </button>
        )}

        {v.collapsed && v.hasTape && (
          <span
            style={{
              position: "absolute",
              zIndex: 3,
              top: -13,
              left: v.tapeLeft,
              width: 92,
              height: 26,
              backgroundColor: v.tapeColor,
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,.24) 0, rgba(255,255,255,.24) 6px, transparent 6px, transparent 12px)",
              opacity: 0.9,
              transform: v.tapeTransform,
              clipPath:
                "polygon(0 8%, 4% 0, 96% 4%, 100% 0, 98% 30%, 100% 55%, 97% 80%, 100% 100%, 3% 96%, 0 100%, 2% 70%, 0 45%, 3% 20%)",
              pointerEvents: "none",
            }}
          />
        )}

        {v.collapsed && v.showPinBtn && (
          <button
            title="Pin to top"
            className="scpc"
            onClick={v.onPin}
            style={{
              position: "absolute",
              zIndex: 2,
              top: 6,
              right: 6,
              width: 32,
              height: 32,
              border: "none",
              borderRadius: "50%",
              background: "none",
              color: "var(--p-ink2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: v.pinOpacity,
              transition: "opacity 0.15s",
            }}
          >
            <i className="ph ph-push-pin" style={{ fontSize: 17 }} />
          </button>
        )}

        {v.collapsed && (v.hasImgSrc || v.hasImgPh) && (
          <div style={{ padding: "11px 11px 0" }}>
            {v.hasImgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.imgSrc!}
                alt=""
                draggable={false}
                style={{ display: "block", width: "100%", maxHeight: 300, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  height: v.phHeight,
                  background:
                    "repeating-linear-gradient(135deg, rgba(42,37,32,.08) 0, rgba(42,37,32,.08) 7px, transparent 7px, transparent 14px) rgba(42,37,32,.04)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "10px 12px",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "var(--p-ink3)" }}>{v.imgCaption}</span>
              </div>
            )}
          </div>
        )}

        {v.collapsed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: v.contentPad }}>
            {v.hasTitle && (
              <div
                style={{
                  fontFamily: v.titleFont,
                  fontSize: v.titleSize,
                  fontWeight: v.titleWeight as CSSProperties["fontWeight"],
                  textTransform: v.titleTransform as CSSProperties["textTransform"],
                  textAlign: v.titleAlign as CSSProperties["textAlign"],
                  letterSpacing: v.titleTracking,
                  lineHeight: 1.12,
                  paddingRight: 24,
                }}
              >
                {v.title}
              </div>
            )}
            {v.isReceipt && (
              <>
                <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--p-ink3)", textAlign: "center", letterSpacing: "0.06em", marginTop: -4 }}>
                  {v.receiptDate}
                </div>
                <div style={{ borderTop: "1.5px dashed var(--p-line)" }} />
              </>
            )}
            {v.hasBody && (
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: v.bodyFont,
                  fontSize: v.bodySize,
                  lineHeight: v.bodyLine,
                  color: v.bodyColor,
                  maxHeight: "17em",
                  overflow: "hidden",
                }}
              >
                {v.body}
              </div>
            )}
            {v.isList && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, fontFamily: FONT_MONO }}>
                {v.previewOpen.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <button
                      onClick={item.toggle}
                      style={{
                        flex: "0 0 auto",
                        width: 15,
                        height: 15,
                        marginTop: 2,
                        padding: 0,
                        borderRadius: 2,
                        border: "1.5px solid rgb(95,86,73)",
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <i className="ph ph-check" style={{ fontSize: 10, color: "rgb(255,253,246)", opacity: item.checkOpacity }} />
                    </button>
                    <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>{item.text}</span>
                  </div>
                ))}
                {v.hasMoreOpen && <span style={{ fontSize: 11.5, color: "var(--p-ink3)" }}>{v.moreOpenText}</span>}
                {v.hasDone && (
                  <>
                    <div style={{ borderTop: "1.5px dashed var(--p-line)", marginTop: 4 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, letterSpacing: "0.08em", color: "var(--p-ink2)" }}>
                      <span>{v.receiptItems}</span>
                      <span>{v.receiptDone}</span>
                    </div>
                    <div
                      style={{
                        height: 22,
                        marginTop: 2,
                        background:
                          "repeating-linear-gradient(90deg, rgb(42,37,32) 0, rgb(42,37,32) 2px, transparent 2px, transparent 4px, rgb(42,37,32) 4px, rgb(42,37,32) 5px, transparent 5px, transparent 8px, rgb(42,37,32) 8px, rgb(42,37,32) 11px, transparent 11px, transparent 13px)",
                        opacity: 0.82,
                      }}
                    />
                  </>
                )}
              </div>
            )}
            {v.hasMeta && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, paddingTop: 2 }}>
                {v.hasReminder && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      height: 24,
                      padding: "0 8px",
                      border: `1.5px solid ${v.remColor}`,
                      borderRadius: 4,
                      color: v.remColor,
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      transform: "rotate(-2deg)",
                    }}
                  >
                    <i className="ph ph-bell-simple" style={{ fontSize: 12 }} />
                    {v.reminderText}
                  </span>
                )}
                {v.labelsView.map((l) => (
                  <button
                    key={l.name}
                    className="scpd"
                    onClick={l.go}
                    style={{
                      height: 24,
                      padding: "0 8px",
                      border: "none",
                      borderRadius: 2,
                      background: "rgba(42,37,32,.07)",
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      color: "var(--p-ink2)",
                      cursor: "pointer",
                    }}
                  >
                    #{l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ExpandedBody note={note} v={v} />
        )}

        <div
          onClick={v.stop}
          style={{
            display: v.collapsed ? v.barDisplay : "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: v.collapsed ? 0 : undefined,
            padding: v.collapsed ? "0 8px 8px" : "10px 12px 12px",
            borderTop: v.collapsed ? undefined : "1.5px dashed var(--p-line)",
            opacity: v.collapsed ? v.toolbarOpacity : 1,
            transition: v.collapsed ? "opacity 0.2s" : undefined,
          }}
        >
          {v.isTrashed ? (
            <>
              <button
                className="scpe"
                onClick={v.onRestore}
                style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", border: "none", borderRadius: 999, background: "none", color: "var(--p-ink2)", fontSize: 13, cursor: "pointer" }}
              >
                <i className="ph ph-arrow-counter-clockwise" style={{ fontSize: 15 }} />
                Restore
              </button>
              <span style={{ flex: 1 }} />
              <button
                className="scpf"
                onClick={v.onDeleteForever}
                style={{ height: 32, padding: "0 10px", border: "none", borderRadius: 999, background: "none", color: "rgb(200,67,47)", fontSize: 13, cursor: "pointer" }}
              >
                Delete forever
              </button>
            </>
          ) : (
            <>
              <button title="Remind me" className="scpe" onClick={v.onRem} style={v.expanded ? iconBtnBig : iconBtn}>
                <i className="ph ph-bell" style={{ fontSize: v.expanded ? 18 : 17 }} />
              </button>
              <button title="Paper color" className="scpe" onClick={v.onColor} style={v.expanded ? iconBtnBig : iconBtn}>
                <i className="ph ph-palette" style={{ fontSize: v.expanded ? 18 : 17 }} />
              </button>
              <button title="Add photo" className="scpe" onClick={v.onImage} style={v.expanded ? iconBtnBig : iconBtn}>
                <i className="ph ph-image" style={{ fontSize: v.expanded ? 18 : 17 }} />
              </button>
              <button title="Labels" className="scpe" onClick={v.onLabel} style={v.expanded ? iconBtnBig : iconBtn}>
                <i className="ph ph-tag" style={{ fontSize: v.expanded ? 18 : 17 }} />
              </button>
              {v.expanded && (
                <button title={v.convertTitle} className="scpe" onClick={v.onConvert} style={iconBtnBig}>
                  <i className={`ph ${v.convertIcon}`} style={{ fontSize: 18 }} />
                </button>
              )}
              {v.expanded && (
                <button title={v.wideTitle} className="scpe" onClick={v.onWide} style={iconBtnBig}>
                  <i className={`ph ${v.wideIcon}`} style={{ fontSize: 18 }} />
                </button>
              )}
              <span style={{ flex: 1 }} />
              <button title={v.archiveTitle} className="scpe" onClick={v.onArchive} style={v.expanded ? iconBtnBig : iconBtn}>
                <i className={`ph ${v.archiveIcon}`} style={{ fontSize: v.expanded ? 18 : 17 }} />
              </button>
              <button title="Move to bin" className="scpc" onClick={v.onTrash} style={v.expanded ? iconBtnBig : iconBtn}>
                <i className="ph ph-trash" style={{ fontSize: v.expanded ? 18 : 17 }} />
              </button>
              {v.expanded && (
                <>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--p-ink3)", marginRight: 12 }}>{v.editedText}</span>
                  <button
                    className="scpg"
                    onClick={v.onDone}
                    style={{ height: 38, padding: "0 20px", border: "none", borderRadius: 999, background: "rgb(31,90,69)", color: "rgb(255,253,246)", fontFamily: FONT_HAND, fontSize: 22, fontWeight: 600, cursor: "pointer" }}
                  >
                    Done
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {v.popColor && <ColorPopover v={v} />}
        {v.popReminder && <ReminderPopover v={v} />}
        {v.popLabel && <LabelPopover v={v} noteId={note.id} />}
      </div>

      {v.isReceipt && v.collapsed && (
        <div style={{ height: 9, background: v.zig }} />
      )}
    </div>
  );
}

function ExpandedBody({ note, v }: { note: Note; v: ReturnType<typeof computeNoteVals> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: v.editPad }}>
      {(v.hasImgSrc || v.hasImgPh) && (
        <div style={{ position: "relative" }}>
          {v.hasImgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.imgSrc!} alt="" draggable={false} style={{ display: "block", width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 2 }} />
          ) : (
            <div
              style={{
                height: v.phHeight,
                background:
                  "repeating-linear-gradient(135deg, rgba(42,37,32,.08) 0, rgba(42,37,32,.08) 7px, transparent 7px, transparent 14px) rgba(42,37,32,.04)",
                display: "flex",
                alignItems: "flex-end",
                padding: "10px 12px",
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "var(--p-ink3)" }}>{v.imgCaption}</span>
            </div>
          )}
          <button
            title="Remove photo"
            className="scpf"
            onClick={v.onRemoveImage}
            style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, padding: 0, border: "none", borderRadius: "50%", background: "rgba(255,253,246,.85)", color: "var(--p-ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <i className="ph ph-x" style={{ fontSize: 13 }} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <input
          data-title-input={note.id}
          placeholder={v.titlePh}
          value={note.title}
          onChange={v.onTitle}
          onKeyDown={v.onTitleKey}
          style={{
            flex: "1 1 0%",
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "none",
            padding: 0,
            fontFamily: v.titleFont,
            fontSize: v.editTitleSize,
            fontWeight: v.titleWeight as CSSProperties["fontWeight"],
            textTransform: v.titleTransform as CSSProperties["textTransform"],
            letterSpacing: v.titleTracking,
            lineHeight: 1.2,
            color: "var(--p-ink)",
          }}
        />
        <button title={v.pinTitle} className="scpf" onClick={v.onPin} style={{ flex: "0 0 auto", width: 36, height: 36, border: "none", borderRadius: "50%", background: "none", color: v.pinColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={v.pinClass} style={{ fontSize: 18 }} />
        </button>
      </div>

      {v.isList ? (
        <ItemsEditor note={note} v={v} />
      ) : (
        <textarea
          data-body-input={note.id}
          rows={v.bodyRows}
          placeholder="Start writing…"
          value={note.body}
          onChange={v.onBody}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "none",
            border: "none",
            outline: "none",
            background: "none",
            padding: 0,
            fontFamily: "inherit",
            fontSize: v.bodyEditSize,
            lineHeight: v.bodyEditLine,
            color: "var(--p-ink)",
          }}
        />
      )}

      {v.hasMeta && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
          {v.hasReminder && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 4px 0 9px",
                border: `1.5px solid ${v.remColor}`,
                borderRadius: 4,
                color: v.remColor,
                fontFamily: FONT_MONO,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                transform: "rotate(-1.5deg)",
              }}
            >
              <i className="ph ph-bell-simple" style={{ fontSize: 12 }} />
              {v.reminderText}
              <button title="Remove reminder" className="scpf" onClick={v.onClearRem} style={{ width: 22, height: 22, padding: 0, border: "none", borderRadius: "50%", background: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ph ph-x" style={{ fontSize: 11 }} />
              </button>
            </span>
          )}
          {v.labelsView.map((l) => (
            <span
              key={l.name}
              style={{ display: "inline-flex", alignItems: "center", gap: 2, height: 28, padding: "0 3px 0 9px", borderRadius: 2, background: "rgba(42,37,32,.07)", fontFamily: FONT_MONO, fontSize: 11.5, color: "var(--p-ink2)" }}
            >
              #{l.display}
              <button title="Remove label" className="scpf" onClick={l.remove} style={{ width: 22, height: 22, padding: 0, border: "none", borderRadius: "50%", background: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ph ph-x" style={{ fontSize: 11 }} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemsEditor({ note, v }: { note: Note; v: ReturnType<typeof computeNoteVals> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: FONT_MONO }}>
      <div style={{ borderTop: "1.5px dashed var(--p-line)", marginBottom: 6 }} />
      {v.editOpen.map((item) => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 38 }}>
          <button onClick={item.toggle} style={{ flex: "0 0 auto", width: 17, height: 17, padding: 0, borderRadius: 2, border: `1.5px solid ${item.boxBorder}`, background: item.boxBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <i className="ph ph-check" style={{ fontSize: 11, color: "rgb(255,253,246)", opacity: item.checkOpacity }} />
          </button>
          <input
            data-item={item.id}
            value={item.text}
            onChange={item.onText}
            onKeyDown={item.onKey}
            style={{ flex: "1 1 0%", minWidth: 0, border: "none", outline: "none", background: "none", padding: "6px 0", fontSize: 15, color: "var(--p-ink)" }}
          />
          <button title="Remove" className="scpe" onClick={item.remove} style={{ flex: "0 0 auto", width: 30, height: 30, border: "none", borderRadius: "50%", background: "none", color: "var(--p-ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ph ph-x" style={{ fontSize: 13 }} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 38 }}>
        <i className="ph ph-plus" style={{ flex: "0 0 auto", width: 17, fontSize: 15, color: "var(--p-ink3)", textAlign: "center" }} />
        <input
          data-add-item={note.id}
          placeholder="add an item"
          defaultValue=""
          onKeyDown={v.onAddItem}
          style={{ flex: "1 1 0%", minWidth: 0, border: "none", outline: "none", background: "none", padding: "6px 0", fontSize: 15, color: "var(--p-ink)" }}
        />
      </div>
      {v.hasDone && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 4px" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--p-ink3)" }}>{v.doneText}</span>
            <span style={{ flex: 1, borderTop: "1.5px dashed var(--p-line)" }} />
          </div>
          {v.editDone.map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 36 }}>
              <button onClick={item.toggle} style={{ flex: "0 0 auto", width: 17, height: 17, padding: 0, borderRadius: 2, border: `1.5px solid ${item.boxBorder}`, background: item.boxBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <i className="ph ph-check" style={{ fontSize: 11, color: "rgb(255,253,246)", opacity: item.checkOpacity }} />
              </button>
              <input
                value={item.text}
                onChange={item.onText}
                onKeyDown={item.onKey}
                style={{ flex: "1 1 0%", minWidth: 0, border: "none", outline: "none", background: "none", padding: "6px 0", fontSize: 15, color: "var(--p-ink3)", textDecoration: "line-through" }}
              />
              <button title="Remove" className="scpe" onClick={item.remove} style={{ flex: "0 0 auto", width: 30, height: 30, border: "none", borderRadius: "50%", background: "none", color: "var(--p-ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ph ph-x" style={{ fontSize: 13 }} />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const popoverBase: CSSProperties = {
  position: "absolute",
  left: 10,
  top: "calc(100% - 4px)",
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "14px 16px 16px",
  background: "rgb(255,253,246)",
  color: "rgb(42,37,32)",
  borderRadius: 4,
  boxShadow: "rgba(42,37,32,.1) 0 0 0 1px, rgba(42,37,32,.45) 0 24px 50px -16px",
  cursor: "default",
};

function ColorPopover({ v }: { v: ReturnType<typeof computeNoteVals> }) {
  return (
    <div data-pop="1" style={{ ...popoverBase, width: "max-content" }} onClick={v.stop}>
      <span style={{ fontFamily: FONT_HAND, fontSize: 22 }}>paper · {v.colorName}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 34px)", gap: 10 }}>
        {v.colorOptions.map((c) => (
          <button
            key={c.name}
            title={c.name}
            className="scph"
            onClick={c.select}
            style={{ width: 34, height: 34, padding: 0, borderRadius: "50%", border: "1px solid rgba(42,37,32,.18)", background: c.bg, boxShadow: c.ring, cursor: "pointer", transition: "transform 0.2s" }}
          />
        ))}
      </div>
    </div>
  );
}

function ReminderPopover({ v }: { v: ReturnType<typeof computeNoteVals> }) {
  return (
    <div data-pop="1" style={{ ...popoverBase, width: 264, gap: 2, padding: 10 }} onClick={v.stop}>
      <span style={{ fontFamily: FONT_HAND, fontSize: 22, padding: "2px 8px 4px" }}>remind me…</span>
      {v.remPresets.map((p) => (
        <button key={p.label} className="scpi" onClick={p.set} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 38, padding: "0 10px", border: "none", borderRadius: 4, background: "none", fontSize: 14, cursor: "pointer", textAlign: "left" }}>
          <span>{p.label}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "rgb(143,132,116)" }}>{p.sub}</span>
        </button>
      ))}
      <div style={{ borderTop: "1.5px dashed rgba(42,37,32,.16)", margin: "6px 4px" }} />
      <label style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 8px 6px" }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.08em", color: "rgb(143,132,116)" }}>PICK A DATE + TIME</span>
        <input type="datetime-local" defaultValue={v.remInput} onChange={v.onCustomRem} style={{ height: 36, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(42,37,32,.2)", background: "rgb(246,241,228)", fontSize: 13, outline: "none", color: "rgb(42,37,32)" }} />
      </label>
      {v.hasReminder && (
        <button className="scpi" onClick={v.onClearRem} style={{ height: 36, padding: "0 10px", border: "none", borderRadius: 4, background: "none", color: "rgb(200,67,47)", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
          Remove reminder
        </button>
      )}
    </div>
  );
}

function LabelPopover({ v, noteId }: { v: ReturnType<typeof computeNoteVals>; noteId: string }) {
  return (
    <div data-pop="1" style={{ ...popoverBase, width: 244, gap: 2, padding: 10 }} onClick={v.stop}>
      <input
        data-label-q={noteId}
        placeholder="find or make a label"
        value={v.labelQueryRaw}
        onChange={(e) => v.onLabelQueryChange(e.target.value)}
        onKeyDown={v.onLabelKey}
        style={{ height: 36, padding: "0 10px", marginBottom: 6, borderRadius: 4, border: "1px solid rgba(42,37,32,.2)", background: "rgb(246,241,228)", fontSize: 13, outline: "none", color: "rgb(42,37,32)" }}
      />
      {v.labelOptions.map((l) => (
        <button key={l.name} className="scpi" onClick={l.toggle} style={{ display: "flex", alignItems: "center", gap: 10, height: 36, padding: "0 8px", border: "none", borderRadius: 4, background: "none", fontSize: 14, cursor: "pointer", textAlign: "left" }}>
          <span style={{ flex: "0 0 auto", width: 15, height: 15, borderRadius: 2, border: `1.5px solid ${l.boxBorder}`, background: l.boxBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ph ph-check" style={{ fontSize: 10, color: "rgb(255,253,246)", opacity: l.checkOpacity }} />
          </span>
          {l.name}
        </button>
      ))}
      {v.canCreateLabel && (
        <button className="scpi" onClick={v.onCreateLabel} style={{ display: "flex", alignItems: "center", gap: 10, height: 36, padding: "0 8px", border: "none", borderRadius: 4, background: "none", fontSize: 14, cursor: "pointer", textAlign: "left", color: "var(--accent)" }}>
          {v.createLabelText}
        </button>
      )}
    </div>
  );
}
