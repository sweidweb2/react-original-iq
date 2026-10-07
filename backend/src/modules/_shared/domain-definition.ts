/**
 * Shared shape for bedrock domain definitions (checklist §4).
 * Keep business rules in services; this file is documentation-as-code.
 */
export type DomainEntityDef = {
  name: string
  description: string
}

export type DomainValueObjectDef = {
  name: string
  description: string
}

export type DomainDefinition = {
  name: string
  responsibility: string
  entities: readonly DomainEntityDef[]
  valueObjects: readonly DomainValueObjectDef[]
  useCases: readonly string[]
  relationships: readonly string[]
  externalAccessRules: readonly string[]
}
