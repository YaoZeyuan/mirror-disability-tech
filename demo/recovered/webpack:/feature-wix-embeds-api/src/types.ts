export type WixEmbedsAPIFeatureState = {
	listeners: {
		[eventName: string]: Array<Function>
	}
	firstMount: boolean
}

export type WixEmbedsAPISiteConfig = {
	isAdminPage: boolean
}

export enum LoginErrorDetails {
	'missingMembersArea' = 'Missing Memebers Area',
	'unknown' = 'Unknown',
}
