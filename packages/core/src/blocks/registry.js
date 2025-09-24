import { knownBlockSchemas } from "./block-definitions";
class BlockRegistry {
    schemas = new Map();
    constructor(defaultSchemas) {
        defaultSchemas.forEach((schema) => {
            this.schemas.set(schema.kind, schema);
        });
    }
    register(schema) {
        if (this.schemas.has(schema.kind)) {
            throw new Error(`Block schema already registered for kind "${schema.kind}"`);
        }
        this.schemas.set(schema.kind, schema);
    }
    get(kind) {
        return this.schemas.get(kind) ?? null;
    }
    list() {
        return Array.from(this.schemas.values());
    }
}
export const blockRegistry = new BlockRegistry(knownBlockSchemas);
