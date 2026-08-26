import AstalNotifd from "gi://AstalNotifd?version=0.1";
import { playNotificationSound } from "../utils/audio";

/**
 * Suscripción GLOBAL y única al daemon de notificaciones. Se conecta una sola vez
 * (a diferencia de NotificationPopups, que se crea por monitor), así que el sonido
 * suena UNA vez por notificación aunque haya varios monitores.
 *
 * Respeta "No molestar" (dontDisturb) y omite las notificaciones reemplazadas
 * (actualizaciones de una notificación ya existente, p. ej. barras de progreso),
 * para no spamear sonido.
 */
export function NotificationSound() {
    const notifd = AstalNotifd.get_default()
    notifd.connect("notified", (_source, id, replaced) => {
        if (notifd.dontDisturb) return
        if (replaced) return
        // Leemos urgencia y app para elegir sonido crítico / silenciar apps.
        const notification = notifd.get_notification(id)
        playNotificationSound(notification?.urgency, notification?.appName)
    })
}
