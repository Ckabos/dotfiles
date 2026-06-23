import {Accessor} from "ags";

export function isAccessor<T = unknown>(v: unknown): v is Accessor<T> {
    if (v == null) return false;
    if (v instanceof Accessor) return true; // fast path (same realm)

    if (typeof v !== 'function') return false;
    const o = v as any;
    return typeof o.get === 'function'
        && typeof o.subscribe === 'function'
        && typeof o.as === 'function';
}