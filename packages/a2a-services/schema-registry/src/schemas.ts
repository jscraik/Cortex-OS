import { JSONSchema7 } from 'json-schema';

export const schemaForSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Schema Registry Schema',
  type: 'object',
  properties: {
    id: { type: 'string', description: 'The unique identifier for the schema.' },
    name: { type: 'string', description: 'The name of the schema.' },
    version: { type: 'string', description: 'The version of the schema.' },
    schema: { type: 'object', description: 'The JSON schema itself.' },
  },
  required: ['id', 'name', 'version', 'schema'],
};
