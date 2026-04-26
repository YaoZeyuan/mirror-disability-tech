export const MAILTO_URL_REGEXP = /mailto:([^?]+)(\?(.*))?/
export const PHONE_URL_REGEXP = /^tel:(.*)/
export const WHATSAPP_LINK_PREFIX = 'https://api.whatsapp.com/send?phone='

export const PAGE_URL_REGEXP = /^\/([^?#]*)?[#]?([^?#]*)[?]?(.*)/
export const SAME_PAGE_WITH_ANCHOR_REGEXP = /^#([^?]*)[?]?(.*)/

export const ABSOLUTE_URL_REGEXP = /^(http|https):\/\/(.*)/
export const DOCUMENT_URL_REGEXP = /^wix:document:\/\/v1\/(.+)\/(.+)/
export const LEGACY_DOCUMENT_URL_REGEXP = /^document:\/\/(.*)/

export const isPhoneUrl = (url: string) => PHONE_URL_REGEXP.test(url)
export const isWhatsappLink = (url: string) => url.startsWith(WHATSAPP_LINK_PREFIX)
export const isMailtoUrl = (url: string) => MAILTO_URL_REGEXP.test(url)
export const isDocumentUrl = (url: string) => DOCUMENT_URL_REGEXP.test(url) || LEGACY_DOCUMENT_URL_REGEXP.test(url)
export const isAbsoluteUrl = (url: string) => ABSOLUTE_URL_REGEXP.test(url)
export const isPageUrl = (href: string) => PAGE_URL_REGEXP.test(href)
export const isSamePageAnchorUrl = (href: string) => SAME_PAGE_WITH_ANCHOR_REGEXP.test(href)
export const isScrollTopOrBottomAnchor = (anchorDataId: string) =>
	['SCROLL_TO_TOP', 'SCROLL_TO_BOTTOM'].includes(anchorDataId)
