import { useId } from 'react';

/** Vector artwork for five short films. Coordinates and CSS timelines share a 640×400 stage. */
function Check({ x, y, className = '' }: { x: number; y: number; className?: string }) {
  return <g transform={`translate(${x} ${y})`}><path d="m-7 0 5 5 10-11" className={`gsp-check ${className}`} pathLength="1" /></g>;
}

function Page({ kind }: { kind: 'summary' | 'slides' | 'audit' }) {
  return <>
    <rect width="132" height="178" rx="5" className="gsp-paper" />
    <rect x="16" y="18" width="28" height="5" rx="1" className="gsp-cyan-fill" />
    <g className="gsp-page-content">
    <text x="16" y="49" className="gsp-paper-title">{kind === 'summary' ? 'Summary' : kind === 'slides' ? 'Slides' : 'Full audit'}</text>
    {kind === 'slides' ? <>
      <rect x="16" y="65" width="100" height="58" rx="2" className="gsp-paper-tint" />
      <path d="M29 108V94m19 14V83m19 25V90m19 18V75m19 33V87" className="gsp-paper-chart" />
      <path d="M16 139h96m-96 12h69" className="gsp-paper-lines" />
    </> : <>
      <path d="M16 67h100m-100 12h84m-84 12h95" className="gsp-paper-lines" />
      {kind === 'summary' ? <><rect x="16" y="112" width="100" height="43" rx="2" className="gsp-paper-tint" /><path d="m26 144 19-12 17 4 20-16 23 3" className="gsp-paper-chart" /></> : <path d="M16 113h100m-100 12h92m-92 12h100m-100 12h72" className="gsp-paper-lines" />}
    </>}
    </g>
  </>;
}

function QueueScene() {
  const clip = `gsp-url-${useId().replace(/:/g, '')}`;
  return <>
    <defs><clipPath id={clip}><rect x="61" y="122" width="235" height="30" className="gsp-url-reveal" /></clipPath></defs>
    <text x="36" y="44" className="gsp-eyebrow">01 / THE STARTING POINT</text>
    <path d="M36 62H604" className="gsp-hairline" />
    <g className="gsp-brief">
      <rect x="36" y="98" width="292" height="184" rx="10" className="gsp-window" />
      <text x="58" y="123" className="gsp-muted">Your website</text>
      <rect x="54" y="133" width="256" height="46" rx="5" className="gsp-input" />
      <g clipPath={`url(#${clip})`} transform="translate(0 24)"><text x="65" y="141" className="gsp-text">yourbusiness.com</text></g>
      <rect x="65" y="146" width="2" height="20" className="gsp-type-cursor" />
      <rect x="54" y="199" width="256" height="48" rx="5" className="gsp-cyan-fill" />
      <text x="182" y="229" textAnchor="middle" className="gsp-button-text">Add business</text>
      <g className="gsp-click-ripple"><circle cx="270" cy="225" r="15" /></g>
    </g>
    <path d="M328 190h60" className="gsp-route" pathLength="1" />
    <g className="gsp-profile-anchor" transform="translate(386 105)"><g className="gsp-profile">
      <rect width="218" height="191" rx="10" className="gsp-window" />
      <rect x="20" y="20" width="38" height="38" rx="8" className="gsp-cyan-fill" />
      <path d="M30 47V36l9-6 9 6v11M35 47v-9h8v9" className="gsp-ink-stroke" />
      <text x="20" y="83" className="gsp-text">Your business</text>
      <text x="20" y="107" className="gsp-muted">yourbusiness.com</text>
      <path d="M20 124h178" className="gsp-hairline" />
      <g className="gsp-profile-rivals"><circle cx="29" cy="153" r="9" className="gsp-secondary-fill" /><circle cx="55" cy="153" r="9" className="gsp-secondary-fill" /><circle cx="81" cy="153" r="9" className="gsp-secondary-fill" /><text x="103" y="158" className="gsp-muted">+ rivals</text></g>
      <g className="gsp-profile-check"><circle cx="184" cy="39" r="12" className="gsp-cyan-fill" /><Check x={184} y={39} /></g>
    </g></g>
    <g className="gsp-pointer"><path d="m0 0 7 27 6-10 11-4Z" /><path d="m13 18 7 12" /></g>
    <g className="gsp-finish"><circle cx="43" cy="348" r="4" className="gsp-cyan-fill" /><text x="57" y="353" className="gsp-muted">Business profile ready for research</text></g>
  </>;
}

function ResearchScene() {
  const sources = ['Search', 'Maps', 'Social', 'Site & ads'];
  return <>
    <text x="36" y="44" className="gsp-eyebrow">02 / FOLLOW THE SOURCES</text>
    <path d="M36 62H604" className="gsp-hairline" />
    {sources.map((label, i) => <g key={label}>
      <g transform={`translate(36 ${86 + i * 65})`}><g className={`gsp-source gsp-source-${i}`}>
        <rect width="144" height="46" rx="6" className="gsp-window" /><circle cx="18" cy="23" r="3" className="gsp-cyan-fill" /><text x="30" y="29" className="gsp-text gsp-small">{label}</text>
      </g></g>
      <path d={`M180 ${109 + i * 65} C219 ${109 + i * 65},215 207,257 207`} className={`gsp-route gsp-source-path-${i}`} pathLength="1" />
      <g transform={`translate(180 ${109 + i * 65})`}><circle r="4" className={`gsp-packet gsp-packet-${i}`} /></g>
    </g>)}
    <g transform="translate(257 166)"><g className="gsp-engine">
      <rect width="86" height="82" rx="15" className="gsp-engine-box" />
      <path d="M18 40c12-21 18 21 30 0s18 21 22 0" className="gsp-wave" pathLength="1" />
      <circle cx="73" cy="13" r="4" className="gsp-cyan-fill" />
    </g></g>
    <path d="M343 207h62" className="gsp-route gsp-output-path" pathLength="1" />
    <circle cx="343" cy="207" r="4" className="gsp-packet gsp-packet-output" />
    <g transform="translate(406 101)"><g className="gsp-evidence">
      <rect width="198" height="212" rx="9" className="gsp-window" />
      <text x="19" y="32" className="gsp-text">The evidence</text>
      <path d="M19 47h160" className="gsp-hairline" />
      {[0, 1, 2].map(i => <g key={i} className={`gsp-evidence-row gsp-evidence-row-${i}`}><rect x="19" y={64 + i * 36} width="27" height="24" rx="3" className="gsp-secondary-fill" /><path d={`M57 ${71 + i * 36}h108m-108 10h76`} className="gsp-content-line" /></g>)}
      <text x="19" y="192" className="gsp-cyan-text gsp-small gsp-evidence-seal">Sources attached</text>
    </g></g>
    <text x="36" y="362" className="gsp-muted">Public signals → sourced findings</text>
  </>;
}

function ModelScene() {
  return <>
    <text x="36" y="44" className="gsp-eyebrow">03 / TEST THE POSSIBILITIES</text>
    <path d="M36 62H604" className="gsp-hairline" />
    <g className="gsp-chart-grid"><path d="M78 104v198h486M78 153h486M78 202h486M78 251h486" /><path d="M175 104v198m97-198v198m97-198v198m97-198v198m98-198v198" /></g>
    <path d="M78 291C157 288 186 268 256 263S392 237 564 220" className="gsp-scenario gsp-scenario-low" pathLength="1" />
    <path d="M78 291C157 285 189 249 261 230S400 187 564 158" className="gsp-scenario gsp-scenario-base" pathLength="1" />
    <path d="M78 291C159 281 193 231 270 204S409 144 564 101" className="gsp-scenario gsp-scenario-high" pathLength="1" />
    <g className="gsp-chart-scan"><path d="M0 104v198" /><circle cy="291" r="5" className="gsp-scan-point" /></g>
    <g className="gsp-scenario-labels"><text x="86" y="329" className="gsp-muted">Conservative</text><circle cx="237" cy="324" r="4" className="gsp-cyan-fill" /><text x="251" y="329" className="gsp-cyan-text">Base case</text><text x="444" y="329" className="gsp-muted">Upside</text></g>
    <g className="gsp-model-note"><rect x="371" y="112" width="176" height="48" rx="5" className="gsp-note" /><text x="459" y="142" textAnchor="middle" className="gsp-text gsp-small">Base case</text></g>
    <text x="36" y="374" className="gsp-muted">Illustrative scenarios · no projected figures</text>
  </>;
}

function BuildScene() {
  return <>
    <text x="36" y="44" className="gsp-eyebrow">04 / GIVE THE FINDINGS FORM</text>
    <path d="M36 62H604" className="gsp-hairline" />
    <g className="gsp-manuscript" transform="translate(254 111)"><rect width="132" height="178" rx="5" className="gsp-paper" /><path d="M17 28h98M17 44h84M17 60h98M17 84h98M17 100h91M17 116h98M17 140h98M17 156h70" className="gsp-paper-lines" /></g>
    <g transform="translate(254 111)"><g className="gsp-build-page gsp-build-summary"><Page kind="summary" /></g></g>
    <g transform="translate(254 111)"><g className="gsp-build-page gsp-build-slides"><Page kind="slides" /></g></g>
    <g transform="translate(254 111)"><g className="gsp-build-page gsp-build-audit"><Page kind="audit" /></g></g>
    <g className="gsp-print-head"><rect x="55" y="87" width="530" height="2" className="gsp-cyan-fill" /><circle cx="55" cy="88" r="4" className="gsp-cyan-fill" /></g>
    <g className="gsp-build-checks"><Check x={142} y={318} /><Check x={320} y={318} /><Check x={498} y={318} /></g>
    <text x="36" y="367" className="gsp-muted">One set of findings. Three reports. Your brand.</text>
  </>;
}

function DeliverScene() {
  return <>
    <text x="36" y="44" className="gsp-eyebrow">05 / READY WHEN YOU ARE</text>
    <path d="M36 62H604" className="gsp-hairline" />
    <g className="gsp-delivery-portal">
      <rect x="182" y="94" width="422" height="236" rx="10" className="gsp-window" />
      <path d="M182 147h422" className="gsp-hairline" /><text x="204" y="126" className="gsp-text">Your private portal</text>
      <g transform="translate(569 120)"><g className="gsp-lock"><rect x="-9" y="-1" width="18" height="15" rx="3" /><path d="M-5-1v-6a5 5 0 0 1 10 0v6" /></g></g>
      {['Summary', 'Slides', 'Full audit'].map((name, i) => <g key={name} className={`gsp-delivery-row gsp-delivery-row-${i}`}>
        <rect x="202" y={164 + i * 48} width="382" height="38" rx="4" className="gsp-row-surface" />
        <path d={`M218 ${174 + i * 48}h11l5 5v16h-16Zm11 0v5h5`} className="gsp-file-icon" />
        <text x="248" y={189 + i * 48} className="gsp-text gsp-small">{name}</text><text x="515" y={189 + i * 48} className="gsp-muted">PDF</text>
        <Check x={566} y={184 + i * 48} />
      </g>)}
    </g>
    {[0, 1, 2].map(i => <g key={i} transform={`translate(60 ${149 + i * 30})`}><g className={`gsp-flying-file gsp-flying-file-${i}`}><rect width="64" height="83" rx="4" className="gsp-paper" /><rect x="10" y="14" width="20" height="4" className="gsp-cyan-fill" /><path d="M10 31h44M10 41h38M10 51h44M10 61h29" className="gsp-paper-lines" /></g></g>)}
    <g className="gsp-delivery-done"><circle cx="43" cy="368" r="4" className="gsp-cyan-fill" /><text x="57" y="373" className="gsp-muted">Saved under your business. Ready to open.</text></g>
  </>;
}

export function GroundswellProcessScenes({ step }: { step: number }) {
  return <svg viewBox="0 0 640 400" fill="none" focusable="false" className={`gsp-film gsp-film-${step}`}>
    {step === 0 ? <QueueScene /> : step === 1 ? <ResearchScene /> : step === 2 ? <ModelScene /> : step === 3 ? <BuildScene /> : <DeliverScene />}
  </svg>;
}
