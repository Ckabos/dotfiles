import {Field} from "../primitiveDefinitions";

export const themeWindowsSchema = {
    name: 'windows',
    type: 'object',
    description: 'Global window styling defaults.',
    children: [
        {
            name: 'gaps',
            type: 'number',
            default: 5,
            description: 'Gap (px) between windows.',
        },
        {
            name: 'borderRadius',
            type: 'number',
            default: 8,
            description: 'Corner radius (px) for client‑side decorations.',
            reactive: false,
        },
        {
            name: 'borderWidth',
            type: 'number',
            default: 2,
            description: 'Window border width (px).',
            reactive: false,
        },
        {
            name: 'backgroundColor',
            type: 'color',
            default: {from: 'theme.colors.background'},
            description: 'Color of window backgrounds',
            reactive: false,
        },
        {
            name: 'borderColor',
            type: 'color',
            default: {from: 'theme.colors.foreground'},
            description: 'Color of window borders',
            reactive: false,
        },
    ],
} as const satisfies Field