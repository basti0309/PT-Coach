"use client";

import { useActionState } from "react";
import { deleteStravaWebhook, registerStravaWebhook, type WebhookActionState } from "./actions";

export function WebhookButtons({ registered }: { registered: boolean }) {
  const [regState, register, regPending] = useActionState<WebhookActionState>(registerStravaWebhook, {});
  const [delState, remove, delPending] = useActionState<WebhookActionState>(deleteStravaWebhook, {});
  const state = delState.ok || delState.error ? delState : regState;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={register}>
          <button className="btn-primary" disabled={regPending}>
            {regPending ? "Registriere …" : registered ? "Strava-Webhook erneut prüfen/registrieren" : "Strava-Webhook registrieren"}
          </button>
        </form>
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm("Strava-Abo wirklich löschen? Danach kommen keine neuen Aktivitäten mehr an.")) e.preventDefault();
          }}
        >
          <button className="btn-danger" disabled={delPending}>
            Abo löschen
          </button>
        </form>
      </div>
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </div>
  );
}
