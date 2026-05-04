import { useEffect } from 'react';

export default function ElfsightChatbot() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://elfsightcdn.com/platform.js';
    script.async = true;
    document.head.appendChild(script);

    const style = document.createElement('style');
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
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="elfsight-app-bd622b00-b41f-499d-af8c-f1531914f29a" data-elfsight-app-lazy></div>
  );
}
