// JustDry – forbindelse til databasen (Supabase → Project Settings → API).
// Brug KUN "Project URL" og "Publishable key" (sb_publishable_…) her. De er beregnet til browseren;
// sikkerheden ligger i databasens regler (RLS). Læg ALDRIG service_role- eller Stripe-nøgler her.
window.JUSTDRY = {
  supabaseUrl: "https://kcbhtmhgbdbjtfhyfogb.supabase.co",
  supabaseAnonKey: "sb_publishable_vXGCextcplNLrGtkz6p0Mw_KZU9eye0", // "Publishable key" (sikker at vise offentligt)
  paymentsEnabled: false, // sæt til true, når Stripe og Edge Functions er sat op (se README)
  addressSuggest: false,  // sæt til true, når address-suggest og ADDRESS_API_KEY er sat op (se README)
  googleReviews: false    // sæt til true, når google-reviews, GOOGLE_PLACES_KEY og GOOGLE_PLACE_ID er sat op (se README)
};
