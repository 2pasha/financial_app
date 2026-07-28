import { useNavigate } from "react-router-dom";
import { type getTranslation } from "../lib/translations";

/**
 * The app's navigation, defined once. Both headers need it — SiteHeader renders it
 * as the bar's centred nav, LandingHeader hands it to the menu panel for signed-in
 * visitors — and ShellMenu renders it inside its panel for either of them. Keeping
 * the labels and the navigation behaviour in one place is what stops the two
 * headers drifting into two different navs.
 */
export type NavView = 'dashboard' | 'plan' | 'expenses';
export type ActiveView = NavView | 'trips';

export interface NavItem {
  key: ActiveView;
  label: string;
  onClick: () => void;
}

/**
 * `onViewChange` is provided by the `/app` route, which switches its in-page view
 * without a full navigation. Every other caller omits it, and selecting a view
 * routes to `/app` with the choice persisted — which is also how the landing page
 * sends a signed-in visitor straight to the view they picked.
 */
export function useShellNav(
  t: ReturnType<typeof getTranslation>,
  onViewChange?: (v: NavView) => void,
): NavItem[] {
  const navigate = useNavigate();

  const selectView = (v: NavView) => {
    if (onViewChange) {
      onViewChange(v);
    } else {
      localStorage.setItem('view', v);
      navigate('/app');
    }
  };

  return [
    { key: 'dashboard', label: 'Dashboard', onClick: () => selectView('dashboard') },
    { key: 'plan', label: t.planning, onClick: () => selectView('plan') },
    { key: 'expenses', label: 'Expenses', onClick: () => selectView('expenses') },
    { key: 'trips', label: 'Trips', onClick: () => navigate('/trips') },
  ];
}
