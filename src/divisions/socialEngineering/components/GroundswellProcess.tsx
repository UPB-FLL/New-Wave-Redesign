import { useEffect, useRef, useState } from 'react';
import { auditContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { PrimaryCta } from './sections';
import { Tabs } from './Tabs';
import './groundswell-process.css';

/** A short, illustrative sequence. CSS owns timing; visibility only pauses it. */
function ProcessDrawing({ step, active }: { step: number; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [playback, setPlayback] = useState('static');

  useEffect(() => {
    if (!active || !ref.current || typeof IntersectionObserver === 'undefined' || typeof window.matchMedia !== 'function') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (preference.matches) return;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
        started = true;
        setPlayback('playing');
      } else {
        setPlayback(started ? 'paused' : 'idle');
      }
    }, { threshold: [0, 0.25] });
    const update = () => {
      observer.disconnect();
      setPlayback(preference.matches ? 'static' : 'idle');
      if (!preference.matches && ref.current) observer.observe(ref.current);
    };
    update();
    preference.addEventListener('change', update);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', update);
    };
  }, [active]);

  return (
    <div ref={ref} className="gs-process-drawing" data-playback={active ? playback : 'static'} aria-hidden="true">
      <svg viewBox="0 0 480 280" fill="none" focusable="false">
        {step === 0 && <>
          <path className="gs-drawing-rule" d="M56 46H424M56 238H424" />
          <text x="56" y="30" className="gs-drawing-label">THE STARTING POINT</text>
          <g className="gs-draw-enter gs-draw-first">
            <rect x="56" y="68" width="368" height="62" rx="4" className="gs-drawing-paper" />
            <text x="76" y="92" className="gs-drawing-label">YOUR WEBSITE</text>
            <text x="76" y="115" className="gs-drawing-value">yourbusiness.com</text>
            <path className="gs-drawing-check" d="m386 100 7 7 13-15" />
          </g>
          <g className="gs-draw-enter gs-draw-second">
            <rect x="56" y="144" width="368" height="62" rx="4" className="gs-drawing-paper" />
            <text x="76" y="168" className="gs-drawing-label">THE COMPETITION</text>
            <text x="76" y="191" className="gs-drawing-value">The businesses you watch</text>
            <path className="gs-drawing-check" d="m386 176 7 7 13-15" />
          </g>
          <g className="gs-draw-enter gs-draw-third"><circle cx="62" cy="259" r="4" className="gs-drawing-accent-fill" /><text x="76" y="263" className="gs-drawing-label">ONE BUSINESS. A PLACE TO BEGIN.</text></g>
        </>}
        {step === 1 && <>
          <text x="30" y="30" className="gs-drawing-label">PUBLIC SOURCES</text>
          <path className="gs-drawing-rule" d="M30 46H450M200 91h46v98h34M200 140h80M200 189h46" />
          {['Search & keywords', 'Maps & reviews', 'Social, site & ads'].map((label, i) => <g key={label} className={`gs-draw-enter gs-draw-source-${i}`}>
            <rect x="30" y={68 + i * 49} width="170" height="43" rx="3" className="gs-drawing-paper" />
            <circle cx="47" cy={90 + i * 49} r="3" className="gs-drawing-accent-fill" /><text x="59" y={95 + i * 49} className="gs-drawing-value gs-drawing-small">{label}</text>
          </g>)}
          <g className="gs-draw-enter gs-draw-third">
            <rect x="280" y="74" width="170" height="137" rx="4" className="gs-drawing-navy" />
            <text x="299" y="103" className="gs-drawing-light-label">THE RESEARCH</text>
            <path className="gs-drawing-light-rule" d="M300 123h129M300 139h95M300 155h114" />
            <text x="300" y="190" className="gs-drawing-cyan-label">Sourced. Dated.</text>
          </g>
          <text x="30" y="255" className="gs-drawing-label">YOUR BUSINESS + NEARBY RIVALS</text>
        </>}
        {step === 2 && <>
          <text x="36" y="30" className="gs-drawing-label">COMPARE THE POSSIBILITIES</text>
          <path className="gs-drawing-rule" d="M36 46H444M174 66v154" />
          {['Conservative', 'Base case', 'Upside'].map((label, i) => <g key={label}>
            <text x="36" y={94 + i * 54} className="gs-drawing-value gs-drawing-small">{label}</text>
            <rect x="190" y={77 + i * 54} width="254" height="26" rx="2" className="gs-drawing-track" />
            <rect x="190" y={77 + i * 54} width={[83, 156, 222][i]} height="26" rx="2" className={`gs-draw-bar gs-draw-source-${i} ${i === 1 ? 'gs-drawing-accent-fill' : 'gs-drawing-navy'}`} />
          </g>)}
          <g className="gs-draw-enter gs-draw-third"><path className="gs-drawing-rule" d="M36 234H444" /><text x="36" y="258" className="gs-drawing-label">COST THE WORK. RANK THE RETURN.</text></g>
        </>}
        {step === 3 && <>
          <text x="30" y="30" className="gs-drawing-label">ONE AUDIT. THREE WAYS TO READ IT.</text>
          <path className="gs-drawing-rule" d="M30 46H450" />
          {['Summary', 'Slides', 'Full audit'].map((label, i) => <g key={label} className={`gs-draw-page gs-draw-source-${i}`}>
            <rect x={30 + i * 144} y="76" width="132" height="158" rx="3" className="gs-drawing-paper" />
            <rect x={45 + i * 144} y="93" width="25" height="5" className="gs-drawing-accent-fill" />
            <text x={45 + i * 144} y="126" className="gs-drawing-value gs-drawing-small">{label}</text>
            <path className="gs-drawing-rule" d={`M${45 + i * 144} 145h99m-99 13h82m-82 13h91m-91 13h64`} />
            <text x={45 + i * 144} y="215" className="gs-drawing-label">0{i + 1}</text>
          </g>)}
          <text x="30" y="264" className="gs-drawing-label">YOUR LOGO. YOUR COLORS. YOUR BRAND.</text>
        </>}
        {step === 4 && <>
          <rect x="44" y="34" width="392" height="222" rx="5" className="gs-drawing-paper" />
          <path className="gs-drawing-rule" d="M44 82H436" />
          <text x="66" y="64" className="gs-drawing-value gs-drawing-small">Your private portal</text>
          <path className="gs-drawing-check" d="m395 56 6 6 12-14" />
          {['Summary', 'Slides', 'Full audit'].map((label, i) => <g key={label} className={`gs-draw-enter gs-draw-source-${i}`}>
            <rect x="65" y={99 + i * 47} width="350" height="36" rx="2" className="gs-drawing-track" />
            <text x="79" y={122 + i * 47} className="gs-drawing-value gs-drawing-small">{label}</text>
            <text x="349" y={122 + i * 47} className="gs-drawing-label">PDF</text>
            <path className="gs-drawing-check" d={`m384 ${115 + i * 47} 4 4 8-9`} />
          </g>)}
        </>}
      </svg>
    </div>
  );
}

function ProcessPanel({ index, active }: { index: number; active: boolean }) {
  const [replay, setReplay] = useState(0);
  const step = auditContent.process.steps[index];
  return (
    <div className="gs-process-stage">
      <div className="gs-process-copy">
        <p className="gs-process-count">Step {index + 1} of {auditContent.process.steps.length}</p>
        <h3>{step.heading}</h3>
        <p className="gs-process-detail">{step.detail}</p>
        <p className="gs-process-outcome"><span>You get</span>{step.outcome}</p>
      </div>
      <figure className="gs-process-figure">
        <ProcessDrawing key={`${active}-${replay}`} step={index} active={active} />
        <figcaption>
          <span>{step.caption}</span>
          <button type="button" className="gs-process-replay" onClick={() => setReplay(value => value + 1)} aria-label={`Replay ${step.title.toLowerCase()} animation`}>
            <NwseIcon name="chevron-right" size={14} /> Replay
          </button>
        </figcaption>
      </figure>
    </div>
  );
}

export function GroundswellProcess() {
  const [active, setActive] = useState(0);
  const content = auditContent.process;
  return (
    <Tabs
      className="gs-process"
      label={content.stepsLabel}
      look="steps"
      guided
      onChange={setActive}
      finish={<PrimaryCta tone="light" />}
      items={content.steps.map((step, index) => ({
        id: `step-${index + 1}`,
        title: step.title,
        label: <><span className="gs-process-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{step.title}</span></>,
        panel: <ProcessPanel index={index} active={active === index} />,
      }))}
    />
  );
}
