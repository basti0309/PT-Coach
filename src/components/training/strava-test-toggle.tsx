"use client";

import { useState, useTransition } from "react";
import { setStravaTestFlag } from "@/lib/actions/strava";

/** Kunde markiert einen eigenen Strava-Lauf als Test/Wettkampf (für Prognosen). */
export function StravaTestToggle({ activityId, initial }: { activityId: string; initial: boolean }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-5 w-5"
        checked={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setValue(next);
          startTransition(async () => {
            try {
              await setStravaTestFlag(activityId, next);
            } catch {
              setValue(!next);
            }
          });
        }}
      />
      Als Test/Wettkampf werten (für Prognosen)
    </label>
  );
}
