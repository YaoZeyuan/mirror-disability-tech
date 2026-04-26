import { multi, withDependencies } from '@wix/thunderbolt-ioc'
import type { IGeneralHeadContent, IPageCssHeadContent, IScriptPreloadHeadContent } from '@wix/thunderbolt-symbols'
import { HeadContentProviderSymbol, HeadContentType } from '@wix/thunderbolt-symbols'

export const GeneralHeadContentProvider = withDependencies([], (): IGeneralHeadContent => {
	const headStatic: Record<string, string> = {}
	const headOther: Array<string> = []
	const headAfterSecurity: Array<string> = []

	return {
		setHead: (content, type?) => {
			switch (type) {
				case HeadContentType.SEO:
				case HeadContentType.SEO_DEBUG:
					headStatic[type] = content
					break
				case HeadContentType.AFTER_SECURITY:
					headAfterSecurity.push(content)
					break
				default:
					headOther.push(content)
					break
			}
		},
		getHead: () => {
			return [...Object.values(headStatic), ...headOther].join('\n')
		},
		getHeadSeoMarkup: () => {
			return [headStatic[HeadContentType.SEO], headStatic[HeadContentType.SEO_DEBUG]].join('\n')
		},
		getHeadAfterSecurityMarkup: () => {
			return headAfterSecurity.join('\n')
		},
		getHeadMarkupByType: (type) => {
			switch (type) {
				case HeadContentType.SEO:
				case HeadContentType.SEO_DEBUG:
					return headStatic[type]
				case HeadContentType.AFTER_SECURITY:
					return headAfterSecurity.join('\n')
				default:
					return headOther.join('\n')
			}
		},
	}
})

export const PageCssHeadContentProvider = withDependencies([], (): IPageCssHeadContent => {
	const pagesCss: Array<string> = []
	return {
		addPageCss: (css) => pagesCss.push(css),
		getPagesCss: () => pagesCss.join('\n'),
	}
})

export const ScriptPreloadHeadContentProvider = withDependencies([], (): IScriptPreloadHeadContent => {
	const urlsToPreload: Array<string> = []
	return {
		addScriptToPreloadList: (url) => urlsToPreload.push(url),
		getScriptPreloadList: () => urlsToPreload,
	}
})

export const HeadContent = withDependencies([multi(HeadContentProviderSymbol)], (providers) =>
	Object.assign({}, ...providers)
)
