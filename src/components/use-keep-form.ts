"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Formulare mit <form action={…}> werden von React nach dem Absenden geleert –
 * bei einem Fehler wären alle Eingaben weg. Dieser onSubmit-Handler schickt die
 * Daten an die Action, ohne das Formular zurückzusetzen.
 */
export function keepFormOnSubmit(dispatch: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(data));
  };
}
