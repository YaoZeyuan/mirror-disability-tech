// @ts-nocheck
import type { ICssFetcher, ViewerModel } from '@wix/thunderbolt-symbols/dist'
import { toDomId } from './PageStyleLoader'

const calculateCss = async (cssFetcher: any, pageId: string, viewerModel: ViewerModel) => {
	const { beckyModel: rawBeckyModel, stylableInstanceParams: rawStylableInstanceParams } =
		await cssFetcher.fetch(pageId)
	const beckyModel = JSON.parse(rawBeckyModel)
	const partialStylableInstanceParams = JSON.parse(rawStylableInstanceParams)
	const path = require('path')
	path.posix = path
	path.win32 = path

	const [becky, components, vsmCss] = await Promise.all([
		import('@wix/thunderbolt-becky' /* webpackChunkName: "becky-css" */),
		import('@wix/thunderbolt-components' /* webpackChunkName: "merge-mappers" */),
		import('@wix/thunderbolt-css' /* webpackChunkName: "vsm-css" */),
	])

	const { getComponentMappers, getStylableInstance } = becky
	const { mergeMappers } = components
	const { getViewerStateManagerCss } = vsmCss

	const fakeMetricsReporter = {
		runAsyncAndReport: async (fn) => fn(),
		runAndReport: async () => {},
		reportError: () => {},
	}

	partialStylableInstanceParams.fileRepoUrl = 'https://static.parastorage.com'

	const stylableInstance = await getStylableInstance({
		...partialStylableInstanceParams,
		fetch,
		metricsReporter: fakeMetricsReporter,
		cache: new Map(),
	})
	const isExperimentOpen = (experimentName: string) => beckyModel.experiments[experimentName]
	const componentMappers = await getComponentMappers({
		fetchFn: fetch,
		registryLibrariesTopology: JSON.stringify(viewerModel.siteAssets.siteScopeParams.registryLibrariesTopology),
		metricsReporter: fakeMetricsReporter,
		isExperimentOpen,
	})
	beckyModel.componentsMappers = mergeMappers(componentMappers, isExperimentOpen, () => {})
	beckyModel.stylableInstance = stylableInstance
	function runAndReport(fn, name) {
		performance.mark(`${name}-start`)
		const result = fn()
		performance.mark(`${name}-end`)
		performance.measure(name, `${name}-start`, `${name}-end`)
		return result
	}
	const { cssResult } = getViewerStateManagerCss(beckyModel, runAndReport)
	return { css: cssResult }
}

export const LocalClientCssFetcher = async (cssFetcher: ICssFetcher, pageId: string, viewerModel: ViewerModel) => {
	const id = toDomId(cssFetcher.id, pageId)
	const { css } = await calculateCss(cssFetcher, pageId, viewerModel)

	const styleElement = document.getElementById(id)
	if (!styleElement) {
		const newStyleElement = window.document.createElement('style')
		newStyleElement.setAttribute('id', id)
		newStyleElement.innerHTML = css
	} else {
		styleElement.innerHTML = css
	}
}
