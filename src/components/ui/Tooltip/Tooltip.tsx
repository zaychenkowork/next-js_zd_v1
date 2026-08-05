'use client';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import cn from 'classnames';

import styles from './TooltipStyles.module.css';

/**
 * A tooltip with the positioner wiring already done.
 *
 * `Tooltip.Provider` is mounted once in src/app/providers.tsx, not here. It is
 * what shares the open/close delay across the app so moving between two
 * neighbouring icons does not replay the delay each time; per-tooltip providers
 * would defeat that.
 *
 * Accessibility caveat worth stating out loud: a tooltip is a *supplement*, not a
 * label. A control whose only name is its tooltip is unusable on touch and with
 * a screen reader — give the trigger an `aria-label` too. That is why
 * `ThemeSwitcher` has both.
 */
type TooltipProps = {
  content: React.ReactNode;
  /**
   * A single element, not arbitrary nodes: Base UI's `render` prop merges the
   * trigger's props and ref into it rather than wrapping it in another `<div>`.
   */
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'inline-start' | 'inline-end';
  className?: string;
};

const Tooltip = ({
  content,
  children,
  side = 'top',
  className,
}: TooltipProps) => (
  <BaseTooltip.Root>
    <BaseTooltip.Trigger render={children} />
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        className={styles.positioner}
        side={side}
        sideOffset={6}
      >
        <BaseTooltip.Popup className={cn(styles.popup, className)}>
          {content}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  </BaseTooltip.Root>
);

export { Tooltip };
