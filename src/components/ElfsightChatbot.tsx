import { useEffect } from 'react';

const platformScriptId = 'elfsight-chatbot-platform';
const brandOverridesId = 'elfsight-chatbot-brand-overrides';

export default function ElfsightChatbot() {
  useEffect(() => {
    if (!document.getElementById(platformScriptId)) {
      const script = document.createElement('script');
      script.id = platformScriptId;
      script.src = 'https://elfsightcdn.com/platform.js';
      script.async = true;
      document.head.appendChild(script);
    }

    if (!document.getElementById(brandOverridesId)) {
      const style = document.createElement('style');
      style.id = brandOverridesId;
      style.textContent = `
      .elfsight-app-bd622b00-b41f-499d-af8c-f1531914f29a {
        position: fixed !important;
        right: 20px !important;
        bottom: 20px !important;
        left: auto !important;
      }
      @media (max-width: 640px) {
        .elfsight-app-bd622b00-b41f-499d-af8c-f1531914f29a {
          right: 15px !important;
          bottom: 15px !important;
        }

        #__EAAPS_PORTAL [class*="widget-welcome-window__Container"] {
          display: none !important;
        }
      }
    `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="elfsight-app-bd622b00-b41f-499d-af8c-f1531914f29a" data-elfsight-app-lazy></div>
  );
}
