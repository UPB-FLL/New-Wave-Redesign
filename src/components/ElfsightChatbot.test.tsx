import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ElfsightChatbot from './ElfsightChatbot';

const platformScriptId = 'elfsight-chatbot-platform';
const brandOverridesId = 'elfsight-chatbot-brand-overrides';

afterEach(() => {
  cleanup();
  document.getElementById(platformScriptId)?.remove();
  document.getElementById(brandOverridesId)?.remove();
});

describe('ElfsightChatbot', () => {
  it('keeps a single chat launcher integration and suppresses the mobile auto-greeting', () => {
    const { container } = render(
      <>
        <ElfsightChatbot />
        <ElfsightChatbot />
      </>,
    );

    expect(container.querySelector('[data-elfsight-app-lazy]')).toBeInTheDocument();
    expect(document.querySelectorAll(`#${platformScriptId}`)).toHaveLength(1);

    const overrides = document.getElementById(brandOverridesId);
    expect(overrides).toHaveTextContent('#__EAAPS_PORTAL');
    expect(overrides).toHaveTextContent('display: none !important');
  });
});
