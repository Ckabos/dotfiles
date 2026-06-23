import {Field, PrimitiveType} from "../schema/primitiveDefinitions";
import {Config} from "../types/derivedTypes";
import {CONFIG_SCHEMA} from "../schema/definitions/root";
import {parseYaml} from "./yamlParser";

// ───────────────────────── helpers ─────────────────────────
const stripQuotes = (s: string) => s.replace(/^"|"$/g, '').replace(/^'|'$/g, '');

function castPrimitive(value: string, target: PrimitiveType) {
    switch (target) {
        case 'number': {
            const n = Number(value);
            if (Number.isNaN(n)) throw new Error(`Expected number, got "${value}"`);
            return n;
        }
        case 'boolean':
            if (value === 'true' || value === 'false') return value === 'true';
            throw new Error(`Expected boolean, got "${value}"`);
        default:
            return stripQuotes(value);
    }
}

function isHexColor(value: string): boolean {
    return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function isResolvableDefault(value: any): value is { from: string } {
    return typeof value === 'object' && value !== null && 'from' in value;
}

// ───────────────────────── validation ─────────────────────────
export function validateAndApplyDefaults<T>(
    record: Record<string, any>,
    schema: Field[],
    defaults?: Record<string, any>,
    applySchemaDefaults: boolean = true,
): T {
    return resolveConfigPaths(validateAndApplyDefaultsInternal(record, schema, applySchemaDefaults, "", defaults))
}

function validateAndApplyDefaultsInternal<T>(
    raw: Record<string, any>,
    schema: Field[],
    applySchemaDefaults: boolean,
    path: string = "",
    defaults?: Record<string, any>
): T {
    const out: any = {};

    for (const f of schema) {
        const key = f.name;
        const rawValue = raw?.[key];
        const defaultValue = defaults?.[key];
        const value = f.transformation ? f.transformation(rawValue) : rawValue;
        let keyPath: string = path === "" ? key : `${path}.${key}`

        const resolvedValue = value !== undefined ? value : defaultValue;

        // if there is no value and the default value is a resolvable value (points to another value)
        // the keep the resolvable default and continue.  Resolving defaults happens in [resolveConfigPaths]
        if (resolvedValue === undefined && isResolvableDefault(f.default)) {
            out[key] = f.default
            continue
        }

        if (resolvedValue !== undefined && f.withinConstraints !== undefined && !f.withinConstraints(resolvedValue)) {
            throw new Error(
                `Invalid config value for ${keyPath}: ${resolvedValue}; ${f.constraintDescription}`
            )
        }

        // ── Missing key ─────────────────────────────────────────────
        if (resolvedValue === undefined) {
            if (f.type === 'object') {
                // Even if not explicitly provided, build object from child defaults
                out[key] = validateAndApplyDefaultsInternal({}, f.children ?? [], applySchemaDefaults, keyPath, defaultValue);
                continue;
            }
            if (f.default !== undefined && applySchemaDefaults) {
                out[key] = f.default;
                continue;
            }
            if (f.required) throw new Error(`Missing required config value: ${keyPath}`);
            out[key] = undefined;
            continue;
        }

        // ── Present key – validate according to type ────────────────
        switch (f.type) {
            case 'string':
            case 'number':
            case 'boolean':
                out[key] = castPrimitive(String(resolvedValue), f.type);
                break;

            case 'color':
                if (!isHexColor(resolvedValue)) throw new Error(`Invalid config value for ${keyPath}: ${resolvedValue}`)
                out[key] = castPrimitive(String(resolvedValue), f.type);
                break;

            case 'icon':
                const str = String(resolvedValue).trim();
                if (Array.from(str).length !== 1) {
                    throw new Error(`Invalid config value for ${keyPath}: expected a single glyph but got "${resolvedValue}"`);
                }
                out[key] = str;
                break;

            case 'enum':
                if (!f.enumValues!.includes(resolvedValue)) throw new Error(`Invalid config value for ${keyPath}: ${resolvedValue}`);
                out[key] = resolvedValue;
                break;

            case 'object':
                // don't use resolvedValue here because it has defaults built in.
                out[key] = validateAndApplyDefaultsInternal(value ?? {}, f.children ?? [], applySchemaDefaults, keyPath, defaultValue);
                break;

            case 'array': {
                if (!Array.isArray(resolvedValue)) throw new Error(`Expected array for config value ${keyPath}`);
                const item = f.item!;
                out[key] = resolvedValue.map((v) => {
                    if (item.type === 'enum') {
                        if (!item.enumValues!.includes(v)) throw new Error(`Invalid config value in ${keyPath}: ${v}`);
                        return v;
                    }
                    // possible bug here when it comes to resolved defaults.  mapping resolvedValue which takes into account
                    // default values.  Maybe don't want to do that?  Not a problem at the moment though because
                    // there are no object[] in the config right now, only primitive[]
                    if (item.type === 'object') return validateAndApplyDefaultsInternal(v ?? {}, item.children ?? [], applySchemaDefaults, keyPath);
                    return castPrimitive(String(v), item.type as PrimitiveType);
                });
                break;
            }
        }
    }
    return out as T;
}

export function resolveConfigPaths<T>(config: Record<string, any>): T {
    const resolvePath = (obj: any, path: string): any =>
        path.split('.').reduce((acc, key) => acc?.[key], obj);

    const resolve = (node: any): any => {
        if (Array.isArray(node)) {
            return node.map(resolve);
        }

        if (typeof node === 'object' && node !== null) {
            if ('from' in node && typeof node.from === 'string') {
                const resolved = resolvePath(config, node.from);
                return resolve(resolved);
            }

            const out: any = {};
            for (const key in node) {
                out[key] = resolve(node[key]);
            }
            return out;
        }

        return node;
    };

    return resolve(config);
}


// ────────────────────────────────────────────────────────────────────────────
// Public helper – load & validate config from file
// ────────────────────────────────────────────────────────────────────────────
export function loadConfig(
    path: string,
    defaults?: Record<string, any>,
    applySchemaDefaults: boolean = true,
): Config {
    const record = parseYaml(path)
    return validateAndApplyDefaults(record, CONFIG_SCHEMA, defaults, applySchemaDefaults);
}
