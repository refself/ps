import type { BlockSchema } from "../types";

import { knownBlockSchemas } from "./block-definitions";

class BlockRegistry {
  private schemas = new Map<string, BlockSchema>();

  constructor(defaultSchemas: BlockSchema[]) {
    defaultSchemas.forEach((schema) => {
      this.schemas.set(schema.kind, schema);
    });
  }

  register(schema: BlockSchema) {
    if (this.schemas.has(schema.kind)) {
      throw new Error(`Block schema already registered for kind "${schema.kind}"`);
    }
    this.schemas.set(schema.kind, schema);
  }

  get(kind: string) {
    return this.schemas.get(kind) ?? null;
  }

  list() {
    return Array.from(this.schemas.values());
  }
}

export const blockRegistry = new BlockRegistry(knownBlockSchemas);
