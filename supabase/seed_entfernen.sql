-- Entfernt alle Demo-Daten aus seed.sql (Konten unter demo.invalid und alles, was daran hängt).
delete from auth.users where email like '%@demo.invalid';
