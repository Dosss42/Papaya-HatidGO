/** One entry of the Alerts list (GET /notifications, Phase 13). The text comes in the app's language. */
export interface AppAlert {
  id: string;
  /** e.g. ride_cancelled_by_driver, document_rejected, subscription_ending */
  kind: string;
  title: string;
  body: string;
  /** Where a tap leads: ride:12 · requirement:drivers_license · requirements · subscription · home (null = nowhere) */
  target: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AlertPage {
  data: AppAlert[];
  meta: { current_page: number; last_page: number; total: number; unread: number };
}

/** The extra data every push carries (the server's AppNotification::toFcm). */
export interface PushData {
  kind?: string;
  target?: string;
  /** Set when the push also has an Alerts entry: a tap marks it read. */
  notification_id?: string;
}

/**
 * Android 13+ notification permission, as the app tracks it. 'unknown' = not checked yet (no card
 * shown); 'unsupported' = the browser (npm start).
 */
export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unknown' | 'unsupported';
