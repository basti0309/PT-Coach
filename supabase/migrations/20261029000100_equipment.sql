-- Equipment ist kein Hyrox-Teil mehr, sondern ein eigener Abschnitt im Profil:
-- answers.equipment = { home: [...], gym: [...], gymNote } (Validierung in src/lib/questionnaire/schema.ts).
-- Die alten Häkchen aus answers.hyrox.equipment gehen in die Gym-Liste (Entscheidung der Betreiberin);
-- danach wird hyrox.equipment entfernt. Nur Daten, keine Rechte-Änderung. Mehrfach ausführbar.
update public.client_questionnaires q
set answers = (q.answers #- '{hyrox,equipment}')
  || jsonb_build_object(
    'equipment',
    jsonb_build_object(
      'home', coalesce(q.answers -> 'equipment' -> 'home', '[]'::jsonb),
      'gym', (
        select coalesce(jsonb_agg(m.neu order by m.ord), '[]'::jsonb)
        from (values ('sled', 'schlitten', 1), ('skierg', 'skierg', 2), ('rower', 'rudergeraet', 3), ('wallball', 'wallball_ziel', 4)) as m (alt, neu, ord)
        where (q.answers -> 'hyrox' -> 'equipment' ->> m.alt)::boolean is true
      ),
      'gymNote', ''
    )
  )
where q.answers -> 'hyrox' ? 'equipment';
