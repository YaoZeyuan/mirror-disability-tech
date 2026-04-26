export const DOM_STORE_DEFS_ID = 'dom-store-defs'

export const domStoreTemplate = (content = '') =>
	`<svg data-dom-store style="display:none"><defs id="${DOM_STORE_DEFS_ID}">${content}</defs></svg>`
