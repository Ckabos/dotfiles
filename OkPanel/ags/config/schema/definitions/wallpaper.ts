import {Field} from "../primitiveDefinitions";

export enum WallpaperTransitionType {
    None = "none",
    Crossfade = "crossfade",
    SlideRight = "slideRight",
    SlideLeft = "slideLeft",
    SlideUp = "slideUp",
    SlideDown = "slideDown",
    SlideLeftRight = "slideLeftRight",
    SlideUpDown = "slideUpDown",
    OverUp = "overUp",
    OverDown = "overDown",
    OverLeft = "overLeft",
    OverRight = "overRight",
    UnderUp = "underUp",
    UnderDown = "underDown",
    UnderLeft = "underLeft",
    UnderRight = "underRight",
    OverUpDown = "overUpDown",
    OverDownUp = "overDownUp",
    OverLeftRight = "overLeftRight",
    OverRightLeft = "overRightLeft",
    RotateLeft = "rotateLeft",
    RotateRight = "rotateRight",
    RotateLeftRight = "rotateLeftRight",
}

export const WALLPAPER_TRANSITION_VALUES = Object.values(WallpaperTransitionType) as readonly WallpaperTransitionType[]

export const wallpaperSchema = {
    name: 'wallpaper',
    type: 'object',
    description: 'Wallpaper configs.',
    children: [
        {
            name: 'showWallpaper',
            type: 'boolean',
            default: 'true',
            description: 'Show the wallpaper in OkPanel.  Set to false if you want to use another wallpaper program',
        },
        {
            name: 'wallpaperUpdateScript',
            type: 'string',
            description: 'Absolute path to the script run when the wallpaper changes.  Wallpaper path is sent as an argument to the script.',
            required: false,
        },
        {
            name: 'wallpaperDir',
            type: 'string',
            default: '',
            description: 'Directory containing theme wallpapers (may be empty).',
        },
        {
            name: 'transitionType',
            type: 'enum',
            enumValues: WALLPAPER_TRANSITION_VALUES,
            default: WallpaperTransitionType.Crossfade,
            description: 'The type of transition animation when switching wallpapers.'
        },
        {
            name: 'transitionDuration',
            type: 'number',
            default: 200,
            description: 'The duration of the transition animation when switching wallpapers in milliseconds.'
        },
    ]
} as const satisfies Field