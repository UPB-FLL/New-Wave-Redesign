// Groundswell, New Wave IT's audit portal, lives at newwaveitfl.com/groundswell:
// one sign-in for partners (outside agencies and resellers) and New Wave staff,
// the partner app, and the staff admin. Pure data: vite.config.ts and the
// router read it. Partner auth is not Supabase Auth (CLAUDE.md, "Groundswell
// section"); staff pages sit behind the content admin's Supabase sign-in.

/** The sign-in page: the only Groundswell URL that is indexed and prerendered. */
export const GROUNDSWELL_PATH = '/groundswell';
/** Invite and password-reset links land here (api/_lib/groundswell/partners.ts builds them). */
export const GROUNDSWELL_SET_PASSWORD_PATH = `${GROUNDSWELL_PATH}/set-password`;
/** The partner app: a partner's own customers and their audits. The bare path sends to the prospects. */
export const GROUNDSWELL_CUSTOMERS_PATH = `${GROUNDSWELL_PATH}/customers`;
/** Prospects: leads whose public data Groundswell reads. */
export const GROUNDSWELL_PROSPECTS_PATH = `${GROUNDSWELL_PATH}/prospects`;
/** Clients: businesses the partner works for ("Became a client" moves a prospect here, with everything gathered). */
export const GROUNDSWELL_CLIENTS_PATH = `${GROUNDSWELL_PATH}/clients`;
/** The list a customer belongs to. */
export const groundswellStagePath = (stage: 'prospect' | 'client') => (stage === 'client' ? GROUNDSWELL_CLIENTS_PATH : GROUNDSWELL_PROSPECTS_PATH);
/** One customer: its details and every audit of it. */
export const groundswellCustomerPath = (id: string) => `${GROUNDSWELL_CUSTOMERS_PATH}/${encodeURIComponent(id)}`;
/** The staff admin (Supabase sign-in): overview, the audit queue, partners. */
export const GROUNDSWELL_ADMIN_PATH = `${GROUNDSWELL_PATH}/admin`;
export const GROUNDSWELL_ADMIN_AUDITS_PATH = `${GROUNDSWELL_ADMIN_PATH}/audits`;
export const GROUNDSWELL_ADMIN_PARTNERS_PATH = `${GROUNDSWELL_ADMIN_PATH}/partners`;

/**
 * Where the partner portal and the Groundswell admin lived before
 * /groundswell (vercel.json redirects them permanently; App.tsx keeps
 * client-side redirects for links inside the app).
 */
export const LEGACY_PARTNER_PATH = '/social-engineering/croissance/partners';
export const LEGACY_ADMIN_PATH = '/admin/groundswell';

export const isGroundswellPath = (pathname: string) => pathname === GROUNDSWELL_PATH || pathname.startsWith(`${GROUNDSWELL_PATH}/`);

/** The product name on its own pages; the audit it runs is Croissance. */
export const GROUNDSWELL_NAME = 'Groundswell';
export const AUDIT_NAME = 'Croissance';
