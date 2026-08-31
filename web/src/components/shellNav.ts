import { useNavigate } from "react-router-dom";
import { type getTranslation } from "../lib/translations";
import { track } from "../lib/posthog";

/**
 * The app's navigation, defined once. Both headers need it — SiteHeader renders it
 * as the bar's centred nav, LandingHeader hands it to the menu panel for signed-in
 * visitors — and ShellMenu renders it inside its panel for either of them. Keeping
 * the labels and the navigation behaviour in one place is what stops the two
 * headers drifting into two different navs.
 */
export const NAV_VIEWS = ['dashboard', 'plan', 'expenses'] as const;
export type NavView = (typeof NAV_VIEWS)[number];
export type ActiveView = NavView | 'trips';

export function isNavView(value: unknown): value is NavView {
  return typeof value === 'string' && (NAV_VIEWS as readonly string[]).includes(value);
}

export interface NavItem {
  key: ActiveView;
  label: string;
  onClick: () => void;
}

/**
 * Each view is its own route, so selecting one is a plain navigation — the `/app`
 * shell reads the view off the URL. That is what makes every view deep-linkable
 * and gives the back button something to go back to.
 */
export function useShellNav(t: ReturnType<typeof getTranslation>): NavItem[] {
  const navigate = useNavigate();

  const go = (key: ActiveView, path: string) => () => {
    track('nav_item_clicked', { item: key });
    navigate(path);
  };

  return [
    { key: 'dashboard', label: t.navDashboard, onClick: go('dashboard', '/app/dashboard') },
    { key: 'plan', label: t.planning, onClick: go('plan', '/app/plan') },
    { key: 'expenses', label: t.navExpenses, onClick: go('expenses', '/app/expenses') },
    { key: 'trips', label: t.navTrips, onClick: go('trips', '/trips') },
  ];
}
