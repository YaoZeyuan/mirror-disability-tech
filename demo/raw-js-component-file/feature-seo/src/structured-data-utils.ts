const SCHEMA_TYPE_KEY = '@type'

export const FAQ_PAGE_SCHEMA_TYPE = 'FAQPage'

export const isSchemaOfType = (schema: Record<string, any>, type: string): boolean => {
	const schemaType = schema[SCHEMA_TYPE_KEY]
	return Array.isArray(schemaType) ? schemaType.includes(type) : schemaType === type
}

export const hasSchemaOfType = (
	advancedSeoData: string | undefined,
	getSchemas: (data: any) => Array<Record<string, any>>,
	type: string
): boolean => {
	if (!advancedSeoData) {
		return false
	}
	try {
		return getSchemas(JSON.parse(advancedSeoData)).some((schema) => isSchemaOfType(schema, type))
	} catch {
		return false
	}
}

export const filterStructuredDataByPageLevel = (
	structuredData: Array<Record<string, any>>,
	advancedSeoData: string | undefined,
	getSchemas: (data: any) => Array<Record<string, any>>,
	typesToDeduplicate: Array<string> = [FAQ_PAGE_SCHEMA_TYPE]
): Array<Record<string, any>> => {
	const typesAlreadyOnPage = typesToDeduplicate.filter((type) => hasSchemaOfType(advancedSeoData, getSchemas, type))
	if (typesAlreadyOnPage.length === 0) {
		return structuredData
	}
	return structuredData.filter((item) => !typesAlreadyOnPage.some((type) => isSchemaOfType(item, type)))
}
