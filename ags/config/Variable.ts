import { createState, createComputed } from "ags";
import type { Accessor, Setter } from "ags";

/**
 * Back-compat mutable wrapper around AGS Accessor<T> + setter.
 * NOTE: Derived instances (created via `map`) are read-only and throw on `set`.
 */
export class Variable<T> {
    private readonly acc: Accessor<T>;
    private readonly setter?: Setter<T>;

    // Construct from initial value (creates its own state)
    constructor(initial: T);
    // Or wrap an existing accessor (+ optional setter for mutability)
    constructor(accessor: Accessor<T>, setter?: Setter<T>);
    constructor(arg1: T | Accessor<T>, setter?: Setter<T>) {
        if (typeof arg1 === "function" || (arg1 && typeof (arg1 as any).get === "function")) {
            this.acc = arg1 as Accessor<T>;
            this.setter = setter;
        } else {
            const [acc, setAcc] = createState(arg1 as T);
            this.acc = acc;
            this.setter = setAcc;
        }
    }

    /** Read current value. Works whether Accessor uses `.get()` or is callable. */
    get(): T {
        const a = this.acc as any;
        if (typeof a.get === "function") return a.get();
        // callable-style accessor fallback
        return a();
    }

    /** Set value (throws if read-only / derived). */
    set(next: T | ((prev: T) => T)): void {
        if (!this.setter) {
            throw new Error("This Variable is read-only (no setter available).");
        }
        this.setter(next as any);
    }

    /** Functional update convenience. */
    update(fn: (prev: T) => T): void {
        this.set(fn);
    }

    /** Back-compat property-style access. */
    get value(): T {
        return this.get();
    }
    set value(v: T) {
        this.set(v);
    }

    /** Create a read-only derived Variable<U>. */
    map<U>(fn: (v: T) => U): Variable<U> {
        const comp = createComputed([this.acc], () => fn(this.get()));
        // no setter → read-only wrapper
        return new Variable<U>(comp);
    }

    /** Expose raw accessor (for passing to AGS props). */
    asAccessor(): Accessor<T> {
        return this.acc;
    }

    /** Helpful for JSON/string interpolation */
    toJSON(): T {
        return this.get();
    }
    valueOf(): T {
        return this.get();
    }

    /** Wrap an existing [accessor, setter] tuple. */
    static fromState<T>(state: [Accessor<T>, Setter<T>]): Variable<T> {
        return new Variable<T>(state[0], state[1]);
    }

    /** Convenience helpers (optional): */
    toggle(this: Variable<boolean>): void {
        this.set((p: boolean) => !p);
    }
    push<U>(this: Variable<U[]>, ...items: U[]): void {
        this.set((arr: U[]) => (arr ? [...arr, ...items] : [...items]));
    }
}
