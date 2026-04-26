import type { IAMPlatformLoginResponse } from './types'

export type IPrivacyStatus = 'PUBLIC' | 'PRIVATE'

export const openIdpPopup = async (
	idpConnectionId: string,
	biVisitorId: string,
	bsi: string,
	svSession: string,
	metaSiteId: string,
	isCommunityChecked: boolean
): Promise<IAMPlatformLoginResponse> => {
	const searchParams = new URLSearchParams({
		visitorId: biVisitorId,
		bsi,
		svSession,
		privacyStatus: getPrivacyStatus(isCommunityChecked),
		tenantType: 'SITE',
	})

	const baseUrl = `/_api/iam/authentication/v1/sso/login/${metaSiteId}/${idpConnectionId}`
	const url = addParamsToUrl(new URL(baseUrl, window.location.origin), searchParams)

	return await openPopUrl(url)
}

const openPopUrl = (url: string): Promise<IAMPlatformLoginResponse> => {
	return new Promise(async (resolve, reject) => {
		const sessionId = window.crypto.randomUUID()
		const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
		const encryptionKey = uint8ToBase64(new Uint8Array(await window.crypto.subtle.exportKey('raw', key)))

		const bc = new BroadcastChannel(`wix-idp-${sessionId}`)

		bc.addEventListener('message', async (event) => {
			const { data: eventData } = event
			const { iv, data } = eventData
			const decryptedData = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
			const loginResponse = JSON.parse(new TextDecoder().decode(decryptedData))
			if (loginResponse.error) {
				reject(loginResponse.error)
			} else {
				resolve(JSON.parse(loginResponse.response))
			}
			bc.postMessage(await encryptedCloseMessage(key))
			bc.close()
		})

		const finalUrl = buildUrlWithQueryParams(url, sessionId, encryptionKey)
		window.open(finalUrl, 'oauthPopup', 'width=450,height=522')
	})
}

const uint8ToBase64 = (arr: Uint8Array): string =>
	btoa(
		Array(arr.length)
			.fill('')
			.map((_, i) => String.fromCharCode(arr[i]))
			.join('')
	)

const encryptedCloseMessage = async (key: CryptoKey) => {
	const iv = window.crypto.getRandomValues(new Uint8Array(12))
	const data = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('close'))
	return { iv, data }
}

const buildUrlWithQueryParams = (url: string, sessionId: string, encryptionKey: string) => {
	const queryParams = { sessionId, encryptionKey }
	const searchParams = convertToSearchParams(queryParams)

	try {
		const parsedUrl = new URL(url)
		return addParamsToUrl(parsedUrl, searchParams)
	} catch {
		return `${url}&${searchParams.toString()}`
	}
}

const convertToSearchParams = (params: Record<string, string>): URLSearchParams => {
	const searchParams = new URLSearchParams()

	for (const key in params) {
		if (params.hasOwnProperty(key)) {
			searchParams.append(key, params[key].toString())
		}
	}

	return searchParams
}

const addParamsToUrl = (url: URL, searchParams: URLSearchParams) => {
	const urlSearchParams = url.searchParams

	for (const [key, value] of searchParams) {
		urlSearchParams.append(key, value)
	}

	return url.toString()
}

export const getPrivacyStatus = (isJoinCommunityChecked: boolean): IPrivacyStatus => {
	return isJoinCommunityChecked ? 'PUBLIC' : 'PRIVATE'
}
