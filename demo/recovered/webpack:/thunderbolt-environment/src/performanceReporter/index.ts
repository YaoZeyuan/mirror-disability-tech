import type { IPerfReporter, IPerfReporterApi } from '@wix/thunderbolt-symbols'
import { Pulse } from '@wix/pulse'
import { getClosestCompIdByHtmlElement } from '@wix/thunderbolt-commons'

export const createPerfReporter = ({
	logger,
	sessionId,
	msid,
	vsi,
	warmupDataPromise,
}: Omit<IPerfReporter, 'getHtmlElementMetadata'>): IPerfReporterApi => {
	const pulse = new Pulse('viewer', {
		biLogger: logger,
		debug: false,
		attributions: {
			msid: msid as string,
			vsi: vsi as string,
			sessionId: sessionId as string,
		},
		getHtmlElementMetadata: () => {
			// TODO - add "compId: getClosestCompIdByHtmlElement(htmlElement)", waiting for compId to be added to the schema
			return { compType: 'tb_not_ready' }
		},
	})

	const handler: IPerfReporterApi = {
		update: ({ getHtmlElementMetadata }) => {
			pulse.update({
				getHtmlElementMetadata: (htmlElement) => {
					const elementMetadata = getHtmlElementMetadata(htmlElement)
					return {
						compType: elementMetadata.compType,
						widgetId: elementMetadata.widgetId,
						applicationId: elementMetadata.appDefinitionId,
						navigationParams: elementMetadata.navigationParams,
						isAnimated: elementMetadata.isAnimated,
						isLightbox: elementMetadata.isLightbox,
						lcpElementCustomAttributes: elementMetadata.lcpElementCustomAttributes,
					}
				},
			})
		},
	}
	warmupDataPromise?.then((warmupData) =>
		handler.update({
			getHtmlElementMetadata: (htmlElement) => {
				const compId = getClosestCompIdByHtmlElement(htmlElement)
				const compType = (
					warmupData.pages as {
						compIdToTypeMap: { [compId: string]: string }
					}
				)?.compIdToTypeMap?.[compId]
				return {
					compType: compType || 'tb_ready',
				}
			},
		})
	)

	return handler
}
