import { useEffect, useRef, useState } from 'react';
import { auditContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { PrimaryCta } from './sections';
import { Tabs } from './Tabs';
import { GroundswellProcessScenes } from './GroundswellProcessScenes';
import './groundswell-process.css';
import './groundswell-process-motion.css';

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
      <GroundswellProcessScenes step={step} />
    </div>
  );
}

function ProcessPanel({ index, active }: { index: number; active: boolean }) {
  const [replay, setReplay] = useState(0);
  const step = auditContent.process.steps[index];
  return (
    <div className="gs-process-stage">
      <div className="gs-process-copy">
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
        label: step.title,
        panel: <ProcessPanel index={index} active={active === index} />,
      }))}
    />
  );
}
