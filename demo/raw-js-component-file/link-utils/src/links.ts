import type { MatchingResult } from './textPatterns'
import {
	findFirstMatch,
	getUrlWithProtocol,
	PatternType,
	replaceEmails,
	replacePhoneNumbers,
	replaceUrls,
} from './textPatterns'
import type {
	AddressLinkData,
	AnchorLinkData,
	DocumentLinkData,
	DynamicPageLinkData,
	EmailLinkData,
	LinkProps,
	PhoneLinkData,
	PopupLinkProps,
	WhatsAppLinkData,
} from './linksTypes'
import type { RoutersConfigMap } from '@wix/thunderbolt-ssr-api'
import type { BaseDataItem } from './types'
import { WHATSAPP_LINK_PREFIX } from './linkPatternUtils'
import type { ResolvedAnchorLink } from '@wix/thunderbolt-becky-types'

export const ALLOWED_FILE_EXTENSIONS_FROM_USER_DOMAIN = [
	'pdf',
	'docx',
	'zip',
	'pptx',
	'xlsx',
	'doc',
	'txt',
	'rar',
	'xls',
	'ppt',
	'ppsx',
	'epub',
	'rtf',
	'pub',
	'vcf',
	'csv',
]

const PatternToPrefix: { [key in keyof typeof PatternType]: string } = {
	[PatternType.PHONE]: 'tel:',
	[PatternType.MAIL]: 'mailto:',
	[PatternType.URL]: '',
}

const parseLinkValue = ({ pattern, value }: MatchingResult): LinkProps => {
	const baseLinkProps = pattern === PatternType.URL ? ({ target: '_blank' } as const) : {}
	return { ...baseLinkProps, href: `${PatternToPrefix[pattern]}${value}` }
}

const getPropertyName = (key: string) => {
	switch (key) {
		case 'linkPopupId':
			return 'data-popupid'
		case 'anchorDataId':
			return 'data-anchor'
		case 'anchorCompId':
			return 'data-anchor-comp-id'
		default:
			return key
	}
}

export const toQueryString = (queryObject: Record<string, string>) =>
	Object.keys(queryObject)
		.map((key) => `${key}=${encodeURIComponent(queryObject[key])}`)
		.join('&')

const getLinkAttributes = (linkProps?: PopupLinkProps): string => {
	if (linkProps) {
		// if link to popup modify attributes
		if (linkProps.linkPopupId) {
			linkProps.role = 'button'
			linkProps['aria-haspopup'] = 'dialog'
			linkProps.tabindex = '0'
			delete linkProps.href
		}
		return Object.keys(linkProps)
			.map((key) => `${getPropertyName(key)}="${linkProps[key as keyof LinkProps]}"`)
			.join(' ')
	}
	return ''
}

const joinAttributesParts = (attributesParts: Array<string>): string =>
	attributesParts
		.filter((attributesPart) => attributesPart !== '')
		.map((attributesPart) => attributesPart.trim())
		.join(' ')

export const convertDataQueryLinksToHtmlAnchors = (text: string, linkList: Record<string, LinkProps>) =>
	text.replace(/<a ([^>]*)dataquery="#([^"]+)"([^>]*)>/g, (_full, preAttributes, dataQuery, postAttributes) => {
		const linkProps = linkList[dataQuery]
		const fixedAttributes = joinAttributesParts([preAttributes, getLinkAttributes(linkProps), postAttributes])
		return `<a${fixedAttributes ? ` ${fixedAttributes}` : ''}>`
	})

export const getImpliedLink = (text: string | null, isMobileView: boolean): LinkProps | null => {
	const firstMatch = findFirstMatch(text, { MAIL: true, URL: true, PHONE: isMobileView })
	return firstMatch && parseLinkValue(firstMatch)
}

const getLinkWrapperFunction = (type: 'email' | 'url' | 'phone') => (content: string) => {
	let aTagContent: string = ''
	const href = content.trim()
	switch (type) {
		case 'email':
			aTagContent = `href="mailto:${href}"`
			break
		case 'phone':
			aTagContent = `href="tel:${href}"`
			break
		case 'url':
			aTagContent = `href="${getUrlWithProtocol(href)}" target="_blank"`
			break
		default:
	}
	return `<a data-auto-recognition="true" ${aTagContent}>${content}</a>`
}

export interface GetImpliedLinksConfig {
	parseEscaped: boolean
}

const wrapEmailImpliedLink = getLinkWrapperFunction('email')
const wrapUrlImpliedLink = getLinkWrapperFunction('url')
const wrapPhoneImpliedLink = getLinkWrapperFunction('phone')

const getTextLinkMatcher = (isMobileView: boolean, parseEscaped: boolean) => (fullMatch: string, text?: string) => {
	// If the text matched is escaped and should not be formatted as HTML, return as is
	if (!text || (!parseEscaped && text.startsWith('&lt;'))) {
		return fullMatch
	}
	let textWithLinks = replaceEmails(text, wrapEmailImpliedLink)
	textWithLinks = replaceUrls(textWithLinks, wrapUrlImpliedLink)
	if (isMobileView) {
		textWithLinks = replacePhoneNumbers(textWithLinks, wrapPhoneImpliedLink)
	}

	return fullMatch.split(text).join(textWithLinks)
}

export function getImpliedLinks(
	text: string,
	isMobileView: boolean,
	{ parseEscaped }: GetImpliedLinksConfig = { parseEscaped: false }
) {
	/**
	 * >((?![<>]).+?)< - Lazly search for any text within '>' '<' to extract text nodes
	 * (?:<a.*>.*<\/a>) - Match all inside `a` tags (inclusive), without adding to the capture group
	 * The result - getting only the text, excluding any text/nodes within `a` tags.
	 */
	return text.replace(/>((?![<>]).+?)<|(?:<a.*>.*<\/a>)/g, getTextLinkMatcher(isMobileView, parseEscaped))
}

export const getPostSignupUrl = (postSignupUrl: string): string => {
	const placeholder = '{ifcontext}'
	if (!postSignupUrl.includes(placeholder)) {
		return postSignupUrl
	}

	const [, queryString] = postSignupUrl.split('?')
	const urlSearchParams = new URLSearchParams(queryString)

	let target
	let postSignupUrlWithContext = ''
	urlSearchParams.forEach((value, key) => {
		if (key.toLowerCase() !== 'ifcontext') {
			return
		}

		target = value.replace('#', '')
		if (/^[a-zA-Z0-9]+$/.test(target)) {
			postSignupUrlWithContext = postSignupUrl.replace(placeholder, target)
		} else {
			postSignupUrlWithContext = postSignupUrl.replace(placeholder, 'illegalContextValue')
		}
	})

	return postSignupUrlWithContext || postSignupUrl
}

export const resolveEmailLink = ({
	recipient,
	subject,
	body,
	bcc = undefined,
	cc = undefined,
}: Omit<EmailLinkData, 'type' | 'id'> & { bcc?: string; cc?: string }): string => {
	const queryString = Object.entries({ subject, body, bcc, cc })
		.filter(([, value]) => value)
		.map(([key, value]) => `${key}=${value}`)
		.join('&')

	const query = queryString.length > 0 ? `?${queryString}` : ''
	return `mailto:${recipient}${query}`
}

export const resolvePhoneLink = ({ phoneNumber }: Omit<PhoneLinkData, 'type' | 'id'>): string => `tel:${phoneNumber}`

export const resolveWhatsAppLink = ({ phoneNumber }: Omit<WhatsAppLinkData, 'type'>): string => {
	const sanitizedPhoneNumber = phoneNumber.replace(new RegExp('[+|-]', 'g'), '')
	return `${WHATSAPP_LINK_PREFIX}${sanitizedPhoneNumber}`
}

export const resolveAddressLink = ({ address }: Omit<AddressLinkData, 'type'>): string =>
	`http://maps.google.com/maps?daddr=${encodeURI(address)}`

const getInnerRouteSuffix = (innerRoute?: string) => innerRoute && innerRoute.replace(/^\//, '')

export const resolveDynamicPageLink = (
	externalBaseUrl: string,
	{ innerRoute }: Omit<DynamicPageLinkData, 'type'>,
	routerInfo: RoutersConfigMap['string']
): string => {
	const { prefix } = routerInfo

	const innerRouteSuffix = getInnerRouteSuffix(innerRoute)
	return innerRouteSuffix ? `${externalBaseUrl}/${prefix}/${innerRouteSuffix}` : `${externalBaseUrl}/${prefix}`
}
const isFreeSite = (url: string) => {
	const hostname = new URL(url).hostname
	return (
		hostname.endsWith('.wixsite.com') ||
		hostname.endsWith('.editorx.io') ||
		hostname.endsWith('.wixstudio.io') ||
		hostname.endsWith('.wixstudio.com')
	)
}

const shouldServeFileFromUserDomain = (isPremiumDomain: boolean, externalBaseUrl: string, docId: string) => {
	const isPreview = new URL(externalBaseUrl).hostname.startsWith('editor.wix')
	if (!isPremiumDomain || isPreview || isFreeSite(externalBaseUrl)) {
		return false
	}

	return ALLOWED_FILE_EXTENSIONS_FROM_USER_DOMAIN.some((fileExtension) => docId.endsWith(fileExtension))
}

const getDocumentLinkSuffix = (docId: string, name: string, indexable: boolean) => {
	const isPDF = docId.endsWith('.pdf')
	if (isPDF) {
		return indexable ? '?index=true' : ''
	}

	return `?${toQueryString({ dn: name })}`
}

export const getBaseUrlFilesPath = (externalBaseUrl: string) => {
	const externalBaseUrlWithTrailingSlash = externalBaseUrl.endsWith('/') ? externalBaseUrl : `${externalBaseUrl}/`
	return new URL('_files', externalBaseUrlWithTrailingSlash)
}

export const resolveDocumentLink = (
	{ docId, name, indexable }: Omit<DocumentLinkData, 'type' | 'id'>,
	metaSiteId: string,
	userFileDomainUrl: string,
	externalBaseUrl: string,
	isPremiumDomain: boolean
): string => {
	const serveFileFromUserDomain = shouldServeFileFromUserDomain(isPremiumDomain, externalBaseUrl, docId)
	const baseUrl = serveFileFromUserDomain
		? getBaseUrlFilesPath(externalBaseUrl)
		: `https://${metaSiteId}.${userFileDomainUrl}`

	const prefixedDocId = docId.includes('/') ? docId : `ugd/${docId}`
	const prefixedDocIdWithSlash = prefixedDocId.startsWith('/') ? prefixedDocId : `/${prefixedDocId}`
	const suffix = getDocumentLinkSuffix(docId, name, indexable)
	return `${baseUrl}${prefixedDocIdWithSlash}${suffix}`
}

export const getDocumentLink = (docId: string, name: string = '') => `wix:document://v1/${docId}/${name}`

export const hasLinkDataWithCurrentRouteAnchors = (
	dataItem: BaseDataItem & {
		anchorDataId?: AnchorLinkData['anchorDataId']
		pageId?: AnchorLinkData['pageId']
		innerRoute?: DynamicPageLinkData['innerRoute']
		link?: DynamicPageLinkData | AnchorLinkData
		items?: Array<BaseDataItem>
		linkList?: Array<BaseDataItem>
		menuRef?: Array<BaseDataItem>
	}
): boolean => {
	const linkData = (dataItem?.link || dataItem) as unknown as ResolvedAnchorLink
	const anchorDataId = (linkData?.anchorDataId as unknown as string) || ''
	const pageId = linkData?.pageId?.id
	const isLinkWithTopBottomAnchor = ['SCROLL_TO_TOP', 'SCROLL_TO_BOTTOM'].includes(anchorDataId)
	const isLinkToTopBottomOnCurrentPage = isLinkWithTopBottomAnchor && pageId === 'masterPage'

	const innerRoute = dataItem?.innerRoute || (dataItem?.link as BaseDataItem as DynamicPageLinkData)?.innerRoute
	const isCurrentInnerRouteDynamicPageLink = innerRoute === 'CURRENT_INNER_ROUTE'

	const subDataItems = dataItem?.items || dataItem?.linkList || dataItem?.menuRef || []

	return (
		isLinkToTopBottomOnCurrentPage ||
		isCurrentInnerRouteDynamicPageLink ||
		subDataItems.some((item) => hasLinkDataWithCurrentRouteAnchors(item))
	)
}
