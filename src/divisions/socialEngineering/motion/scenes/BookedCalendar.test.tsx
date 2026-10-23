import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SceneFrame } from '../SceneFrame';
import { bookedCalendarEntry } from './bookedCalendarEntry';

describe('BookedCalendar', () => {
  it('draws the companion calendar body, header, and body check without assuming source path indexes', async () => {
    const { BookedCalendar } = await import('./BookedCalendar');
    const { container } = render(
      <SceneFrame forceStatic>
        <BookedCalendar cx={120} cy={80} size={48} tBody={0} tHead={1} tCheck={1.4} />
      </SceneFrame>,
    );
    const calendar = container.querySelector('g[transform="translate(96 56) scale(2)"]');
    expect(calendar).toHaveAttribute('stroke-width', '1.5');
    const paths = Array.from(calendar!.querySelectorAll('path'));
    expect(paths.map((path) => path.getAttribute('d'))).toEqual([
      'M7 5H5.5A2 2 0 0 0 3.5 7V18.5A2 2 0 0 0 5.5 20.5H18.5A2 2 0 0 0 20.5 18.5V7A2 2 0 0 0 18.5 5H17M7 3.5V7M17 3.5V7M10 5H14',
      'M3.5 10H20.5',
      'M8.5 15.5L11 18L16 13',
    ]);
    expect(paths.map((path) => path.getAttribute('stroke'))).toEqual([
      'var(--scene-line)', 'var(--scene-accent)', 'var(--scene-line)',
    ]);
  });

  it('places incoming paths at the source header start at every scene scale', () => {
    expect(bookedCalendarEntry(120, 80, 48)).toEqual([103, 76]);
    expect(bookedCalendarEntry(392, 176, 104)).toEqual([355.17, 167.33]);
    expect(bookedCalendarEntry(404, 168, 104)).toEqual([367.17, 159.33]);
    expect(bookedCalendarEntry(406, 255, 80)).toEqual([377.67, 248.33]);
  });
});
