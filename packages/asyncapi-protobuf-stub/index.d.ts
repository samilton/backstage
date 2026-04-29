export declare function ProtoBuffSchemaParser(): {
  validate: (...args: unknown[]) => Promise<unknown[]>;
  parse: (...args: unknown[]) => Promise<unknown>;
  getMimeTypes: () => string[];
};
export default ProtoBuffSchemaParser;
