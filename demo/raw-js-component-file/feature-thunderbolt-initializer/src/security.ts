/* To enhance security for the access-tokens endpoint, when the thunderbolt app is ready, we are doing the following:
1. Creating and hardening window.tb.init function - if it already exists it means we've been compromised
2. Dispatching a tbReady event which which will be caught in the security.ejs file which loads handleAccessTokens.ts
3. Triggering The window.tb.init will be triggered in turn with the original fetch function (and not the hardened one which prevents calls to the access-tokens endpoint)
4. Resolving our promise with a function that fetches the access tokens */

import type { BrowserWindow, DynamicSessionModel, ILogger, TBReady } from '@wix/thunderbolt-symbols'

type FetchFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>

const THUNDERBOLT_READY_EVENT_NAME = 'tbReady'
const SECURITY_ERROR_TYPE = 'security_overrideGlobals'
const FETCH_TIMEOUT = 5000
const EVENT_TIMEOUT = 3000

const getAccessTokensHandler =
	(
		window: NonNullable<BrowserWindow>,
		fetchFn: FetchFn,
		fetchHeaders: Record<string, string>,
		isRunningInDifferentSiteContext: boolean
	) =>
	(fetchArgs: RequestInit = {}): Promise<DynamicSessionModel | {}> => {
		const accessTokenEndpoint = window.viewerModel.accessTokensUrl

		const processedFetchArgs = { ...fetchArgs, headers: { ...(fetchArgs.headers || {}), ...fetchHeaders } }

		return new Promise(function (resolve, reject) {
			if (isRunningInDifferentSiteContext) {
				resolve({})
			} else {
				function fetchAccessTokens() {
					fetchFn(accessTokenEndpoint, processedFetchArgs)
						.then((res: Response) => {
							if (!res.ok) {
								throw new Error(`[${res.status}]${res.statusText}`)
							}
							return res.json()
						})
						.then((data: DynamicSessionModel) => {
							clearTimeout(timeoutId)
							resolve(data)
						})
						.catch((e: Error) => {
							clearTimeout(timeoutId)
							reject(e)
						})
				}

				const timeoutId = setTimeout(() => {
					reject(new Error('Timeout occurred while waiting for access tokens response.'))
				}, FETCH_TIMEOUT)

				fetchAccessTokens()
			}
		})
	}

const hardenThunderboltInit = (
	window: NonNullable<BrowserWindow>,
	resolve: Function,
	timeoutId: NodeJS.Timeout,
	logger: ILogger,
	isRunningInDifferentSiteContext: boolean
) => {
	try {
		Object.defineProperty(window, 'tb', {
			value: {},
			writable: false,
			enumerable: false,
			configurable: false,
		})
		// @ts-expect-error
		Object.defineProperty(window.tb, 'init', {
			value: ({ fetch, fetchHeaders }: { fetch: FetchFn; fetchHeaders: Record<string, string> }) => {
				resolve(getAccessTokensHandler(window, fetch, fetchHeaders, isRunningInDifferentSiteContext))
				clearTimeout(timeoutId)
			},
			writable: false,
			enumerable: false,
			configurable: false,
		})
	} catch (e) {
		const error = new Error('TB001')
		logger.meter(`${SECURITY_ERROR_TYPE}_${error.message}`, {
			paramsOverrides: {
				errorType: SECURITY_ERROR_TYPE,
				eventString: error.message,
			},
		})

		if (window?.viewerModel?.mode.debug) {
			console.error(e)
		}
	}
}

// This event is dispatched when thunderbolt app loaded
// We receive the original fetch here and use it to generate a function to fetch the access tokens
export const tbReady: TBReady = (
	window: NonNullable<BrowserWindow>,
	logger: ILogger,
	isRunningInDifferentSiteContext: boolean
) => {
	return new Promise(function (resolve, reject) {
		const timeoutId = setTimeout(() => {
			reject(new Error(`Timeout occurred while waiting for ${THUNDERBOLT_READY_EVENT_NAME} event.`))
		}, EVENT_TIMEOUT)

		hardenThunderboltInit(window, resolve, timeoutId, logger, isRunningInDifferentSiteContext)
		window.dispatchEvent(new CustomEvent(THUNDERBOLT_READY_EVENT_NAME, { detail: { logger } }))
	})
}
