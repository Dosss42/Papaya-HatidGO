import { Role } from '../../shared/models/user.model';

/**
 * Where a notification leads (Phase 13): the server sends a role-free target ("ride:12"), the
 * app turns it into a screen of the right area. Unknown targets open the Alerts list, so a newer
 * server never sends the app somewhere that doesn't exist.
 */
export function targetUrl(role: Role, target: string | null | undefined): string {
  const area = role === 'driver' ? '/driver' : '/passenger';
  const [what, id] = (target ?? '').split(':');

  switch (what) {
    case 'ride':
      return id ? `${area}/ride/${id}` : `${area}/rides`;
    case 'requirement':
      return role === 'driver' && id ? `/driver/requirements/${id}` : `${area}/alerts`;
    case 'requirements':
      return role === 'driver' ? '/driver/requirements' : `${area}/alerts`;
    case 'subscription':
      return `${area}/subscription`;
    case 'home':
      return role === 'driver' ? '/driver/home' : '/passenger/book';
    default:
      return `${area}/alerts`;
  }
}

/** The icon in front of an alert, by what it's about (registered by the Alerts page). */
export function alertIcon(kind: string): string {
  if (kind.startsWith('ride_') || kind === 'passenger_returning') return 'tricycle';
  if (kind.startsWith('document_')) return 'document-text-outline';
  if (kind.startsWith('driver_offline')) return 'power-outline';
  if (kind.startsWith('subscription_') || kind.startsWith('payment_')) return 'card-outline';
  return 'notifications-outline';
}

/** The tab badge: a count up to 9, then "9+" (it must fit in the small pill). */
export function badgeText(unread: number): string {
  return unread > 9 ? '9+' : String(unread);
}

/**
 * A push that arrives while the app is OPEN: show a short in-app message, or nothing when the
 * screen already shows it (decision #13): a request (the takeover rings) or the ride on screen.
 */
export function showWhileOpen(kind: string | undefined, target: string | undefined, currentUrl: string): boolean {
  if (kind === 'ride_offer') return false;
  const [what, id] = (target ?? '').split(':');
  if (what === 'ride' && id && new RegExp(`/ride/${id}(?:[/?#]|$)`).test(currentUrl)) return false;
  return true;
}
