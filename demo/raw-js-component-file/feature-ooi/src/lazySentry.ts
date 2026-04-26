import type { Hub, EventHint } from '@sentry/types'

// @ts-ignore
const getSentry = () => (process.env.browser ? window.Sentry : require('@sentry/node'))

const getSentryVersion = (sentry: any) => {
	const sdkVersion: string | undefined = sentry?.SDK_VERSION
	const sdkVersionParts = sdkVersion?.split('.')
	if (sdkVersionParts?.length) {
		return {
			major: parseInt(sdkVersionParts[0], 10),
			minor: parseInt(sdkVersionParts[1], 10),
			patch: parseInt(sdkVersionParts[2], 10),
		}
	}
}

export default class LazySentry {
	private _nodeClient: Hub | null = null
	private _browserClient: Hub | null = null

	constructor(
		private readonly options: any,
		private readonly scopes: Array<any> = []
	) {}

	captureException(exception: any, hint?: EventHint) {
		if (process.env.browser && window.Sentry) {
			let sentry = getSentry()
			// @ts-ignore
			sentry.onLoad(() => {
				sentry = getSentry()
				if (!this._browserClient) {
					const sentryVersion = getSentryVersion(sentry)
					const transportOption =
						typeof sentry.makeFetchTransport === 'function' ? { transport: sentry.makeFetchTransport } : {}
					const stackParserOption =
						typeof sentry.defaultStackParser === 'function' ? { stackParser: sentry.defaultStackParser } : {}
					const integrationsOption = sentry.defaultIntegrations ? { integrations: sentry.defaultIntegrations } : {}

					const browserClientOptions =
						sentryVersion && sentryVersion?.major > 6
							? {
									...transportOption, // required option added in 7.x.x
									...stackParserOption, // required option added in 7.x.x
									...integrationsOption, // required option added in 7.x.x
									...this.options,
								}
							: this.options
					this._browserClient = new sentry.Hub(new sentry.BrowserClient(browserClientOptions))
					this.scopes.forEach((fn) => {
						this._browserClient!.configureScope(fn)
					})
				}
				this._browserClient!.captureException(exception, hint)
			})
			// @ts-ignore
			sentry.forceLoad()
		} else {
			try {
				const sentry = getSentry()
				if (!this._nodeClient) {
					this._nodeClient = new sentry.Hub(new sentry.NodeClient(this.options))
					this.scopes.forEach((fn) => {
						this._nodeClient!.configureScope(fn)
					})
				}
				this._nodeClient!.captureException(exception, hint)
			} catch (error) {
				// Do not throw errors in case of failure in server side
				console.error('Failed to capture exception with Sentry', error)
			}
		}
	}

	configureScope(fn: any) {
		const client = process.env.browser ? this._browserClient : this._nodeClient
		if (client) {
			client.configureScope(fn)
		} else {
			this.scopes.push(fn)
		}
	}
}
