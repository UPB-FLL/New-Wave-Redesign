const ART = ['queue', 'research', 'model', 'build', 'deliver'] as const;
const BASE = '/brand/social-engineering/07_Product_Illustrations';

/** Purpose-made dimensional artwork; the surrounding step copy supplies its accessible explanation. */
export function GroundswellProcessScenes({ step }: { step: number }) {
  const name = ART[step] ?? ART[0];
  return (
    <div className={`gs-process-art gs-process-art-${name}`}>
      <img
        className="gs-process-art-image"
        src={`${BASE}/groundswell-${name}-640.webp`}
        srcSet={`${BASE}/groundswell-${name}-640.webp 640w, ${BASE}/groundswell-${name}-1080.webp 1080w`}
        sizes="(min-width: 1280px) 680px, (min-width: 768px) 52vw, calc(100vw - 32px)"
        alt=""
        width={1080}
        height={720}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
