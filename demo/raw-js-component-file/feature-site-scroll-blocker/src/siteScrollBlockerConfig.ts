import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import type { name } from './symbols'
import type { ISiteScrollBlockerServiceConfig } from '@wix/viewer-service-site-scroll-blocker/definition'

const isPublicSegment = process.env.PACKAGE_NAME !== 'thunderbolt-ds'
const shouldBlockScrollWithoutVar = isPublicSegment

export const getSiteScrollBlockerConfig = (
	siteScrollBlockerExports: IFeatureExportsStore<typeof name>
): ISiteScrollBlockerServiceConfig => {
	return {
		onSiteScrollBlockChanged: (status) => {
			siteScrollBlockerExports.export({
				isScrollingBlocked: status,
			})
		},
		shouldBlockScrollWithoutVar,
	}
}
