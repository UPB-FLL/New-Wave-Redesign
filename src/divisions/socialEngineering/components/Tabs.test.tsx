import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, type TabItem } from './Tabs';

const items: TabItem[] = [
  { id: 'one', title: 'One', panel: <p>First panel</p> },
  { id: 'two', title: 'Two', panel: <p>Second panel</p> },
  { id: 'three', title: 'Three', panel: <p>Third panel</p> },
];

const visiblePanel = () => screen.getByRole('tabpanel');

describe('Tabs', () => {
  it('is one tablist of buttons, each wired to its panel, with the inactive panels kept in the DOM but hidden', () => {
    render(<Tabs items={items} label="Parts" />);
    const list = screen.getByRole('tablist', { name: 'Parts' });
    const tabs = within(list).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['One', 'Two', 'Three']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    tabs.forEach((tab) => expect(tab).toHaveAttribute('type', 'button'));
    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    expect(panels).toHaveLength(3);
    expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true]);
    panels.forEach((panel, index) => {
      expect(panel).toHaveAttribute('id', tabs[index].getAttribute('aria-controls'));
      expect(panel).toHaveAttribute('aria-labelledby', tabs[index].id);
    });
    expect(visiblePanel()).toHaveTextContent('First panel');
  });

  it('selects on click and on the arrow, Home, and End keys, moving focus with the selection', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} label="Parts" onChange={onChange} />);
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(visiblePanel()).toHaveTextContent('Second panel');
    expect(onChange).toHaveBeenLastCalledWith(1);

    tabs[1].focus();
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[2]);
    // Wraps at the ends.
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[2]);
    // Other keys are left alone.
    fireEvent.keyDown(tabs[2], { key: 'Tab' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('walks the tabs with Back and Next when guided, and ends on the finish control', () => {
    render(<Tabs items={items} label="Parts" guided finish={<a href="/go">Go</a>} nextLabel="Forward" backLabel="Backward" />);
    const back = screen.getByRole('button', { name: /Backward/ });
    const next = screen.getByRole('button', { name: /Forward/ });
    expect(back).toBeDisabled();
    // Next names the tab it goes to.
    expect(next).toHaveTextContent('Forward: Two');
    fireEvent.click(next);
    expect(visiblePanel()).toHaveTextContent('Second panel');
    expect(back).toBeEnabled();
    expect(screen.getByRole('button', { name: /Forward/ })).toHaveTextContent('Forward: Three');
    fireEvent.click(screen.getByRole('button', { name: /Forward/ }));
    expect(visiblePanel()).toHaveTextContent('Third panel');
    // On the last tab the finish control stands where Next was.
    expect(screen.queryByRole('button', { name: /Forward/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/go');
    fireEvent.click(screen.getByRole('button', { name: /Backward/ }));
    expect(visiblePanel()).toHaveTextContent('Second panel');
  });

  it('takes the look, a header in the tabs’ frame, and the frame and body classes', () => {
    const { container } = render(
      <Tabs items={items} label="Parts" look="dark" header={<p>Head</p>} headClassName="head-frame" bodyClassName="body-frame" className="outer" />,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveClass('nwse-tabs', 'outer');
    expect(root).toHaveAttribute('data-look', 'dark');
    const head = root.querySelector('.head-frame')!;
    expect(head).toHaveTextContent('Head');
    expect(head.querySelector('[role="tablist"]')).not.toBeNull();
    screen.getAllByRole('tab').forEach((tab) => expect(tab).toHaveClass('nwse-tab', 'nwse-tab-dark'));
    expect(root.querySelector('.body-frame [role="tabpanel"]')).not.toBeNull();
  });

  it('gives chip tabs the shared pill class, and step tabs theirs', () => {
    const chips = render(<Tabs items={items} label="Chips" look="chips" />);
    chips.getAllByRole('tab').forEach((tab) => expect(tab).toHaveClass('nwse-tab-chip', 'nwse-chip'));
    chips.unmount();
    const steps = render(<Tabs items={items} label="Steps" look="steps" />);
    steps.getAllByRole('tab').forEach((tab) => expect(tab).toHaveClass('nwse-tab-steps'));
  });
});
