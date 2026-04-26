import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { CurrentRouteInfoSymbol, PageFeatureConfigSymbol, SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import type { IPageWillMountHandler, OOIWidgetConfig } from '@wix/thunderbolt-symbols'
import { name } from '../symbols'
import type { OOIPageConfig, OOISiteConfig } from '../types'
import type { Reporter } from '../reporting'
import { OOIReporterSymbol } from '../reporting'
import type { ICurrentRouteInfo } from 'feature-router'

export default withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		named(PageFeatureConfigSymbol, name),
		CurrentRouteInfoSymbol,
		OOIReporterSymbol,
	],
	(
		{ ooiComponentsData }: OOISiteConfig,
		{ ooiComponents, pagesToShowSosp }: OOIPageConfig,
		currentRouteInfo: ICurrentRouteInfo,
		reporter: Reporter
	): IPageWillMountHandler => {
		const pageId = currentRouteInfo.getCurrentRouteInfo()?.pageId

		const loadCss = async (url: string, sentryDsn: any) => {
			const existingStyle = Array.from(document.getElementsByTagName('style')).find(
				(style) => style.getAttribute('data-href') === url
			)
			if (existingStyle) {
				return existingStyle
			}

			const existingLink = document.querySelector(`link[rel="stylesheet"][href="${url}"]`)
			if (existingLink) {
				return existingLink
			}

			const res = await fetch(url)
			if (res.status !== 200) {
				reporter.reportError(
					new Error(`Could not load CSS vars static css. CSS url: ${url}. Error: ${res.status} - ${res.statusText}`),
					sentryDsn,
					{
						tags: { phase: 'ooi component resolution' },
					}
				)
			}
			const text = await res.text()
			const style = document.createElement('style')
			style.innerHTML = text
			style.setAttribute('data-href', url)
			document.head.appendChild(style)
		}

		return {
			name: 'ooiLoadStaticCSSPageWillMountClient',
			async pageWillMount() {
				const shouldDisplayComponentInCurrentPage: (component: OOIWidgetConfig) => boolean = (component) => {
					if (!component.isInSosp) {
						return true
					}

					if (!pageId) {
						return false
					}
					return Boolean(pagesToShowSosp[pageId])
				}

				// Single-pass with Promise.all over components, dedup by widgetId
				const seenWidgetIds = new Set<string>()
				await Promise.all(
					Object.values(ooiComponents).map(async (component) => {
						if (!shouldDisplayComponentInCurrentPage(component)) {
							return
						}

						const widgetId = component.widgetId
						if (seenWidgetIds.has(widgetId)) {
							return
						}
						seenWidgetIds.add(widgetId)

						const data = ooiComponentsData[widgetId]
						if (!data) {
							console.error(`OOI component ${widgetId} not found in ooiComponentsData`)
							return
						}

						const { componentUrl, sentryDsn, noCssComponentUrl } = data
						if (!noCssComponentUrl) {
							return
						}

						// we load css by convention - same name as js bundle
						const cssUrl = componentUrl.replace('.bundle.min.js', '.min.css')
						await loadCss(cssUrl, sentryDsn)
					})
				)
			},
		}
	}
)
