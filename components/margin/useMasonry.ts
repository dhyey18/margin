import { useEffect, useRef } from "react";
import type { Layout } from "./types";

export function useMasonry(layout: Layout, vw: number, deps: unknown[]) {
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);

  const run = () => {
    if (layout !== "grid" && vw >= 420) return;
    const gap = vw < 760 ? 18 : 26;
    document.querySelectorAll<HTMLElement>('[data-grid="1"] [data-note-id]').forEach((el) => {
      if (roRef.current) roRef.current.observe(el);
      const span = "span " + Math.max(1, Math.ceil((el.offsetHeight + gap) / 4));
      if (el.style.gridRowEnd !== span) el.style.gridRowEnd = span;
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "ResizeObserver" in window) {
      roRef.current = new ResizeObserver(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(run);
      });
    }
    rafRef.current = requestAnimationFrame(run);
    if (document.fonts) document.fonts.ready.then(() => run());
    return () => {
      roRef.current?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
