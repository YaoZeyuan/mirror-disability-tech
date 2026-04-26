import { withDependencies, optional } from '@wix/thunderbolt-ioc'
import type { IPageResourceFetcher, ViewerModel, ILogger } from '@wix/thunderbolt-symbols'
import { CurrentRouteInfoSymbol, SiteAssetsClientSym, ViewerModelSym, LoggerSymbol } from '@wix/thunderbolt-symbols'
import type { SiteAssetsClientAdapter } from 'thunderbolt-site-assets-client'
import { errorPagesIds } from '@wix/thunderbolt-commons'
import type { ICurrentRouteInfo } from 'feature-router'
import type { IProtectedPagesApi } from 'feature-protected-pages'
import { ProtectedPagesApiSymbol } from 'feature-protected-pages'

export const resourceFetcher: (
	viewerModel: ViewerModel,
	siteAssetsClient: SiteAssetsClientAdapter,
	currentRouteInfo: ICurrentRouteInfo,
	logger: ILogger,
	protectedPagesApiProvider?: IProtectedPagesApi
) => IPageResourceFetcher = (viewerModel, siteAssetsClient, currentRouteInfo, logger, protectedPagesApiProvider) => {
	const getPageJsonFileNameData = (pageCompId: string) => {
		const {
			siteAssets: { siteScopeParams },
		} = viewerModel

		const pageJsonFileNames = siteScopeParams.pageJsonFileNames
		const pageJsonFileName =
			pageJsonFileNames[pageCompId] || protectedPagesApiProvider?.getPageJsonFileName(pageCompId) || undefined
		return { pageJsonFileNames, pageJsonFileName }
	}

	return {
		fetchResource(pageCompId, resourceType, extraModuleParams = {}) {
			const {
				siteAssets: { modulesParams },
				mode: { siteAssetsFallback },
			} = viewerModel

			const moduleParams = { ...modulesParams[resourceType], ...extraModuleParams }
			const isErrorPage = !!errorPagesIds[pageCompId]

			const { pageJsonFileNames, pageJsonFileName: pageJsonFileNameWihoutFallback } =
				getPageJsonFileNameData(pageCompId)
			const pageJsonFileName =
				pageJsonFileNameWihoutFallback || currentRouteInfo.getCurrentRouteInfo()?.pageJsonFileName
			const bypassSsrInternalCache = viewerModel.experiments.bypassSsrInternalCache === true
			const shouldReportBi = !process.env.browser && resourceType === 'css' // reporting from SSR only and only the css
			if (shouldReportBi) {
				logger.interactionStarted(`site_assets_execute_${resourceType}`)
			}
			const siteAssetsResult = siteAssetsClient.execute(
				{
					moduleParams,
					pageCompId,
					...(pageJsonFileName ? { pageJsonFileName } : {}),
					...(isErrorPage
						? {
								pageCompId: isErrorPage ? 'masterPage' : pageCompId,
								errorPageId: pageCompId,
								pageJsonFileName: pageJsonFileNames.masterPage,
							}
						: {}),
					bypassSsrInternalCache,
				},
				siteAssetsFallback
			)
			if (shouldReportBi) {
				logger.interactionEnded(`site_assets_execute_${resourceType}`)
			}
			return siteAssetsResult
		},
		getResourceUrl(pageCompId, resourceType, extraModuleParams = {}): string {
			const {
				siteAssets: { modulesParams, siteScopeParams },
			} = viewerModel

			const moduleParams = { ...modulesParams[resourceType], ...extraModuleParams }
			const isErrorPage = !!errorPagesIds[pageCompId]

			const pageJsonFileNames = siteScopeParams.pageJsonFileNames
			const pageJsonFileName = pageJsonFileNames[pageCompId] || currentRouteInfo.getCurrentRouteInfo()?.pageJsonFileName

			return siteAssetsClient.calcPublicModuleUrl({
				moduleParams,
				pageCompId,
				...(pageJsonFileName ? { pageJsonFileName } : {}),
				...(isErrorPage
					? {
							pageCompId: isErrorPage ? 'masterPage' : pageCompId,
							errorPageId: pageCompId,
							pageJsonFileName: pageJsonFileNames.masterPage,
						}
					: {}),
			})
		},
		getPageJsonFileName(pageCompId: string): string | undefined {
			return getPageJsonFileNameData(pageCompId).pageJsonFileName
		},
	}
}

export const PageResourceFetcher = withDependencies<IPageResourceFetcher>(
	[ViewerModelSym, SiteAssetsClientSym, CurrentRouteInfoSymbol, LoggerSymbol, optional(ProtectedPagesApiSymbol)],
	resourceFetcher
)
