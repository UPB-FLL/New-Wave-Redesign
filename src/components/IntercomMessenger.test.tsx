import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  Intercom: vi.fn(),
  boot: vi.fn(),
  shutdown: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@intercom/messenger-js-sdk', () => ({
  default: sdk.Intercom,
  Intercom: sdk.Intercom,
  boot: sdk.boot,
  shutdown: sdk.shutdown,
  update: sdk.update,
}));

import IntercomMessenger from './IntercomMessenger';
import { INTERCOM_APP_ID, intercomAllowedOn } from '../lib/intercom';

let go: (path: string) => void = () => {};
function Navigator() {
  const navigate = useNavigate();
  useEffect(() => {
    go = navigate;
  }, [navigate]);
  return null;
}

function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navigator />
      <IntercomMessenger />
    </MemoryRouter>,
  );
}

describe('IntercomMessenger', () => {
  beforeEach(() => {
    Object.values(sdk).forEach((fn) => fn.mockClear());
  });

  it('boots with the App ID only: no user_id, name, email or created_at', () => {
    mount('/');
    expect(sdk.Intercom).toHaveBeenCalledTimes(1);
    expect(sdk.Intercom).toHaveBeenCalledWith({ app_id: 'eep3rzlx' });
    expect(INTERCOM_APP_ID).toBe('eep3rzlx');
  });

  it('stays off the division, the Groundswell portal and the admin', () => {
    ['/social-engineering', '/social-engineering/contact-us', '/groundswell', '/groundswell/customers', '/admin', '/admin/blog'].forEach((path) => {
      expect(intercomAllowedOn(path)).toBe(false);
      sdk.Intercom.mockClear();
      const { unmount } = mount(path);
      expect(sdk.Intercom).not.toHaveBeenCalled();
      unmount();
    });
    ['/', '/contact', '/pricing', '/support', '/managed-it-services-miami', '/blog/some-post', '/administrator'].forEach((path) =>
      expect(intercomAllowedOn(path)).toBe(true),
    );
  });

  it('updates on navigation, shuts down off the IT pages, and boots again on return', () => {
    mount('/');
    expect(sdk.Intercom).toHaveBeenCalledTimes(1);

    act(() => go('/pricing'));
    expect(sdk.update).toHaveBeenCalledTimes(1);
    expect(sdk.update.mock.calls[0][0]).toEqual({ last_request_at: expect.any(Number) });

    act(() => go('/social-engineering'));
    expect(sdk.shutdown).toHaveBeenCalledTimes(1);

    act(() => go('/contact'));
    expect(sdk.boot).toHaveBeenCalledWith({ app_id: 'eep3rzlx', api_base: 'https://api-iam.intercom.io' });
    expect(sdk.Intercom).toHaveBeenCalledTimes(1);
  });

  it("is allowed by the site's Content Security Policy", () => {
    const config = JSON.parse(readFileSync(resolve(__dirname, '../../vercel.json'), 'utf8')) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const csp = config.headers
      .flatMap((h) => h.headers)
      .find((h) => h.key === 'Content-Security-Policy')!.value;
    const directive = (name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';
    expect(directive('script-src')).toContain('https://widget.intercom.io');
    expect(directive('script-src')).toContain('https://js.intercomcdn.com');
    expect(directive('connect-src')).toContain('https://api-iam.intercom.io');
    expect(directive('connect-src')).toContain('wss://*.intercom-messenger.com');
    expect(directive('frame-src')).toContain('https://intercom-sheets.com');
    expect(directive('font-src')).toContain('https://fonts.intercomcdn.com');
    expect(directive('media-src')).toContain('https://js.intercomcdn.com');
    expect(directive('form-action')).toContain('https://intercom.help');
  });
});
