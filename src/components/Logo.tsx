import { NewWaveLogo } from './brand/NewWaveLogo';

type Tone = 'onLight' | 'onDark';

/** Backwards-compatible path for existing navigation and footer imports. */
export default function Logo({
  tone = 'onLight',
  showTag = true,
  className = '',
}: {
  tone?: Tone;
  showTag?: boolean;
  className?: string;
}) {
  return (
    <NewWaveLogo
      tone={tone}
      showTagline={showTag}
      size={showTag ? 220 : 180}
      className={className}
      decorative
    />
  );
}
