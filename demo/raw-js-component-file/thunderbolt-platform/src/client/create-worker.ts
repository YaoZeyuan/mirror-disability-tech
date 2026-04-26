// Use defensive access to avoid errors when viewerModel is incomplete (e.g., SSR fallback scenarios)
const viewerModel = (window as any).viewerModel
const siteFeatures = viewerModel?.siteFeatures || []
const platform = viewerModel?.siteFeaturesConfigs?.platform
const clientTopology = viewerModel?.siteAssets?.clientTopology
const externalBaseUrl = viewerModel?.site?.externalBaseUrl
const usedPlatformApis = (window as any).usedPlatformApis

const shouldCreateWebWorker = typeof Worker !== 'undefined' && siteFeatures.includes('platform') && !!platform

const createWorkerBlobUrl = (workerUrl: string) => {
	const blob = new Blob([`importScripts('${workerUrl}');`], { type: 'application/javascript' })
	return URL.createObjectURL(blob)
}

const createWorker = async () => {
	// Guard against missing platform config or required properties
	if (!platform?.clientWorkerUrl || !platform?.appsScripts || !platform?.bootstrapData) {
		console.warn(
			'[create-worker] Platform config incomplete (missing clientWorkerUrl, appsScripts, or bootstrapData), skipping worker creation'
		)
		return undefined
	}

	const starMark = 'platform_create-worker started'
	performance.mark(starMark)

	const { clientWorkerUrl, appsScripts, bootstrapData, sdksStaticPaths } = platform
	const { appsSpecData = {}, appDefIdToIsMigratedToGetPlatformApi = {}, forceEmptySdks } = bootstrapData || {}
	const url =
		clientWorkerUrl.startsWith('http://localhost:') ||
		clientWorkerUrl.startsWith('https://bo.wix.com/suricate/') ||
		document.baseURI !== location.href
			? createWorkerBlobUrl(clientWorkerUrl)
			: clientWorkerUrl.replace(clientTopology?.fileRepoUrl || '', `${externalBaseUrl}/_partials`)

	const platformWorker = new Worker(url)
	const appsScriptsUrls = appsScripts?.urls || {}
	const nonFederatedAppsOnPageScriptsUrls = Object.keys(appsScriptsUrls)
		.filter((id) => !appsSpecData[id]?.isModuleFederated)
		.reduce<typeof appsScriptsUrls>((acc, id) => {
			acc[id] = appsScriptsUrls[id]
			return acc
		}, {})

	if (sdksStaticPaths && sdksStaticPaths.mainSdks && sdksStaticPaths.nonMainSdks) {
		const areAllAppsMigratedToGetPlatformApi = Object.values(appDefIdToIsMigratedToGetPlatformApi).every((x) => x)
		if (areAllAppsMigratedToGetPlatformApi || forceEmptySdks) {
			platformWorker.postMessage({
				type: 'preloadNamespaces',
				namespaces: usedPlatformApis,
			})
		} else {
			platformWorker.postMessage({
				type: 'preloadAllNamespaces',
				sdksStaticPaths,
			})
		}
	}

	platformWorker.postMessage({
		type: 'platformScriptsToPreload',
		appScriptsUrls: nonFederatedAppsOnPageScriptsUrls,
	})

	const endMark = 'platform_create-worker ended'
	performance.mark(endMark)
	performance.measure('Create Platform Web Worker', starMark, endMark)

	return platformWorker
}

export const platformWorkerPromise = shouldCreateWebWorker ? createWorker() : Promise.resolve()
