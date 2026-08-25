/*
  # Restrict contact_submissions inserts to the service role

  Contact submissions are now written by /api/send-contact-email using the
  service-role key, after spam screening (honeypot, timing token, content
  heuristics, rate limits). The browser no longer inserts with the anon key,
  so dropping the public INSERT policy stops bots from writing spam rows
  straight into Supabase.

  Apply after the frontend that removes the client-side insert is deployed;
  the service role bypasses RLS, so the API route is unaffected either way.
*/

DROP POLICY IF EXISTS "Anyone can submit a contact form" ON contact_submissions;
