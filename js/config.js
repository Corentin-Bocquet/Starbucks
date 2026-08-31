/* ============================================================
   EVER — Configuration
   ------------------------------------------------------------
   Ce fichier est public : il part sur GitHub Pages et n'importé
   qui peut le lire. On n'y met donc QUE des valeurs publiables.

   - SUPABASE_URL et SUPABASE_ANON_KEY sont concues pour être
     publiques. Ce qui protège les données, c'est le RLS active
     dans sql/schema.sql, pas le secret de la clé.

   - La clé Gemini n'est PAS ici. Une clé d'API Google posée dans
     un dépôt public est lisible par tout le monde et le quota se
     vide en quelques heures. Elle se saisit dans Réglages, elle
     reste sur l'appareil. Pour une vraie mise en production,
     passer par la fonction edge sql/edge/gemini-proxy.ts.
   ============================================================ */
window.EVER_CONFIG = {
  supabaseUrl:     'https://qjxeimsinxqvlodsusww.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqeGVpbXNpbnhxdmxvZHN1c3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzY1NzksImV4cCI6MjEwMzI1MjU3OX0.I9igzeqpZlmMryY8qh4ttuXT8OflBP2rVhBy6LFJ6RQ',

  /* EVER vit dans son propre schéma Postgres, à côté de WALLET, dans
     le même projet. Les deux applications ne peuvent pas se marcher
     dessus : aucune table n'est partagée, seul le compte l'est. */
  supabaseSchema:  'ever',

  /* Proxy Gemini optionnel. Si renseigne, l'app l'utilisé et la
     clé personnelle devient inutile. */
  geminiProxyUrl:  '',

  /* Modeles Gemini utilisés. */
  geminiTextModel:   'gemini-2.0-flash',
  geminiVisionModel: 'gemini-2.0-flash',

  /* Sources de données ouvertes, sans clé. */
  weatherApi:  'https://api.open-meteo.com/v1/forecast',
  geocodeApi:  'https://geocoding-api.open-meteo.com/v1/search',
  foodApi:     'https://world.openfoodfacts.org/api/v2',

  appName:    'EVER',
  appVersion: '2.0.0'
};
