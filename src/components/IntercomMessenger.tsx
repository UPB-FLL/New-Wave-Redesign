// The Intercom Messenger, for anonymous visitors on the New Wave IT pages.
//
// Owner's choices (2026-11-17): anonymous visitors only (no user_id, name or
// email is sent, so no identity verification is needed); it loads for every
// visitor, Global Privacy Control and Do Not Track included; New Wave IT pages
// only, never the Social Engineering division, the Groundswell portal or the
// admin. The Cookie and Privacy Policies describe it, and vercel.json's CSP
// allows Intercom's US hosts (Intercom's CSP article, read 2026-11-17).
// The App ID and the page rule live in src/lib/intercom.ts.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Intercom, { boot, shutdown, update } from '@intercom/messenger-js-sdk';
import { INTERCOM_API_BASE, INTERCOM_APP_ID, intercomAllowedOn } from '../lib/intercom';

type State = 'never' | 'running' | 'shut';

export default function IntercomMessenger() {
  const { pathname } = useLocation();
  const state = useRef<State>('never');

  useEffect(() => {
    if (!intercomAllowedOn(pathname)) {
      if (state.current === 'running') {
        shutdown();
        state.current = 'shut';
      }
      return;
    }
    if (state.current === 'never') {
      // Adds widget.intercom.io's loader and boots from intercomSettings.
      Intercom({ app_id: INTERCOM_APP_ID });
    } else if (state.current === 'shut') {
      // The loader is already on the page; Intercom() would only send
      // "update", which does not bring a shut-down Messenger back.
      boot({ app_id: INTERCOM_APP_ID, api_base: INTERCOM_API_BASE });
    } else {
      // A new page in the single-page app: lets Intercom check for messages.
      update({ last_request_at: Math.floor(Date.now() / 1000) });
    }
    state.current = 'running';
  }, [pathname]);

  return null;
}
