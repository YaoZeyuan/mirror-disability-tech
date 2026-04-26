import type { BrowserWindow, BusinessLogger, IPropsStore } from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, BusinessLoggerSymbol, PageFeatureConfigSymbol, Props } from '@wix/thunderbolt-symbols'
import { ContentReflowVisibilitySymbol, name, REFLOW_BANNER_COMP_ID } from './symbols'
import type { ContentReflowPageConfig, IContentReflowVisibility } from './types'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { IUrlHistoryManager } from 'feature-router'
import { UrlHistoryManagerSymbol } from 'feature-router'

export const contentReflowZoomDetectionFactory = (
	{ translations }: ContentReflowPageConfig,
	browserWindow: NonNullable<BrowserWindow>,
	businessLogger: BusinessLogger,
	propsStore: IPropsStore,
	urlHistoryManager: IUrlHistoryManager,
	{ showContentReflowBanner, hideContentReflowBanner }: IContentReflowVisibility
) => {
	const checkScrollbars = () => {
		const element = document.documentElement // or use a specific container reference
		const hasHorizontal = element.scrollWidth > element.clientWidth
		const hasVertical = element.scrollHeight > element.clientHeight

		if (hasHorizontal && hasVertical) {
			showContentReflowBanner()
		} else {
			hideContentReflowBanner()
		}

		return { horizontal: hasHorizontal, vertical: hasVertical }
	}

	const sendBi = (option: string) => {
		businessLogger.logger.log(
			{
				src: 29,
				evid: 9,
				option,
			},
			{ endpoint: 'm' }
		)
	}

	const deactivate = () => {
		window.removeEventListener('resize', checkScrollbars)
	}

	const setBannerProps = () => {
		propsStore.update({
			[REFLOW_BANNER_COMP_ID]: {
				onClose: () => {
					hideContentReflowBanner()
					deactivate()
					sendBi('close')
				},
				switchToMobileView: () => {
					sendBi('mobileView')
					const currentUrl = urlHistoryManager.getParsedUrl()
					browserWindow.location.href = `${currentUrl.href}${currentUrl.search ? '&' : '?'}
					showMobileView=true`
				},
				translations,
			},
		})
	}

	return {
		activate: () => {
			setBannerProps()
			checkScrollbars()
			window.addEventListener('resize', checkScrollbars)
		},
		deactivate,
	}
}

export const ContentReflowZoomDetection = withDependencies(
	[
		named(PageFeatureConfigSymbol, name),
		BrowserWindowSymbol,
		BusinessLoggerSymbol,
		Props,
		UrlHistoryManagerSymbol,
		ContentReflowVisibilitySymbol,
	],
	contentReflowZoomDetectionFactory
)
