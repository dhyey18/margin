import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { seed, DEFAULT_LABELS } from "@/components/margin/lib";
import type { PersistedState } from "@/components/margin/types";

const DOC_ID = "margin-notes-v2";

export async function GET() {
  const db = await getDb();
  const doc = await db.collection("margin_state").findOne({ _id: DOC_ID } as never);
  if (doc) {
    const { notes, labels, layout, theme } = doc as unknown as PersistedState;
    return NextResponse.json({ notes, labels, layout, theme });
  }
  const initial: PersistedState = {
    notes: seed(),
    labels: DEFAULT_LABELS,
    layout: "grid",
    theme: "light",
  };
  await db.collection("margin_state").updateOne(
    { _id: DOC_ID } as never,
    { $set: initial },
    { upsert: true }
  );
  return NextResponse.json(initial);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as PersistedState;
  const db = await getDb();
  await db.collection("margin_state").updateOne(
    { _id: DOC_ID } as never,
    {
      $set: {
        notes: body.notes,
        labels: body.labels,
        layout: body.layout,
        theme: body.theme,
      },
    },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
