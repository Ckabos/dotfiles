import {Field} from "../primitiveDefinitions";

export enum NotificationsPosition {
    LEFT = "left",
    RIGHT = "right",
    CENTER = "center",
}

export const NOTIFICATION_POSITIONS = Object.values(NotificationsPosition) as readonly NotificationsPosition[]

export const notificationsSchema = {
    name: 'notifications',
    type: 'object',
    description: 'Notification pop‑up behaviour.',
    children: [
        {
            name: 'position',
            type: 'enum',
            enumValues: NOTIFICATION_POSITIONS,
            default: NotificationsPosition.RIGHT,
            description: 'Screen edge where notification bubbles appear.',
        },
        {
            name: 'respectExclusive',
            type: 'boolean',
            default: true,
            description: 'Whether to avoid overlaying exclusive zones declared by widgets.',
        },
        {
            name: 'timeoutMs',
            type: 'number',
            default: 7000,
            description: 'How long (ms) a notification pop-up stays on screen before auto-dismissing. Hovering it pauses the countdown.',
        },
    ],
} as const satisfies Field
