import { useEffect } from 'react';

export default function ElfsightChatbot() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://elfsightcdn.com/platform.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return (
    <div className="elfsight-app-bd622b00-b41f-499d-af8c-f1531914f29a" data-elfsight-app-lazy></div>
  );
}
