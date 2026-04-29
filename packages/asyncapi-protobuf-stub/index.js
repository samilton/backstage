// No-op replacement for @asyncapi/protobuf-schema-parser.
// Returns a SchemaParser that claims no mime types, so the AsyncAPI
// parser will simply never dispatch to it. See AGENTS.md / app-config
// notes for why we strip this: protobufjs -> @protobufjs/inquire does a
// dynamic require() that webpack flags as a critical dependency.
function ProtoBuffSchemaParser() {
  return {
    validate: async () => [],
    parse: async () => ({}),
    getMimeTypes: () => [],
  };
}

module.exports = ProtoBuffSchemaParser;
module.exports.ProtoBuffSchemaParser = ProtoBuffSchemaParser;
module.exports.default = ProtoBuffSchemaParser;
