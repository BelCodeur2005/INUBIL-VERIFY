import { api } from '../api/client';

/** GET /notifications/moi — mes notifications (paginees, filtrables par statut). */
export function listerMesNotifications({ statut, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (statut) params.set('statut', statut);
  return api.get(`/notifications/moi?${params.toString()}`);
}

/** GET /notifications/moi/non-lues/count — nombre de notifications non lues (badge). */
export function compterNotificationsNonLues() {
  return api.get('/notifications/moi/non-lues/count');
}

/** PATCH /notifications/:id/lire — marque une notification comme lue. */
export function marquerNotificationLue(id) {
  return api.patch(`/notifications/${id}/lire`);
}

/** PATCH /notifications/moi/tout-lire — marque toutes les notifications comme lues. */
export function marquerToutesNotificationsLues() {
  return api.patch('/notifications/moi/tout-lire');
}

/** DELETE /notifications/:id — archive une notification. */
export function archiverNotification(id) {
  return api.delete(`/notifications/${id}`);
}
