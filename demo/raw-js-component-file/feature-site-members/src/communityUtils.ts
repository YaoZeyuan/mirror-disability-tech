import type { IHttpClient } from '@wix/http-client'
import { getMemberPrivacySettings } from '@wix/ambassador-members-v1-member-privacy-settings/http'
import { Candidates as PublicMemberCandidates } from '@wix/ambassador-members-v1-member-privacy-settings/types'

import type { PrivacyNoteType, SiteMembersMasterPageConfig } from './types'

type SmSettings = SiteMembersMasterPageConfig['smSettings']

// Some sites may not have privacyNoteType set. In that case, default value is CHECKBOX
const getPrivacyNoteType = (smSettings: SmSettings): PrivacyNoteType => {
	const joinCommunityCheckedByDefault = smSettings.joinCommunityCheckedByDefault ?? true
	const privacyNoteType = smSettings.privacyNoteType ?? 'CHECKBOX'
	return joinCommunityCheckedByDefault ? privacyNoteType : 'CHECKBOX'
}

const getJoinCommunityCheckedByDefault = (smSettings: SmSettings) => {
	const privacyNoteType = getPrivacyNoteType(smSettings)
	if (privacyNoteType === 'NOTE') {
		return true
	}
	return smSettings.joinCommunityCheckedByDefault ?? true
}

export const getCommunityOptions = (
	smSettings: SmSettings
): { privacyNoteType: PrivacyNoteType; joinCommunityCheckedByDefault: boolean } => ({
	privacyNoteType: getPrivacyNoteType(smSettings),
	joinCommunityCheckedByDefault: getJoinCommunityCheckedByDefault(smSettings),
})

const fetchMemberPrivacySettings = async (httpClient: IHttpClient, signedInstance: string, baseURL?: string) => {
	const requestOptions = baseURL ? ({ baseURL } as any) : undefined
	const { data } = await httpClient.request(getMemberPrivacySettings({}), { signedInstance, ...requestOptions })
	return data.memberPrivacySettings
}

export const createMemberPrivacySettingsService = (
	httpClient: IHttpClient,
	getSignedInstance: () => string,
	baseURL?: string
) => {
	let _canHavePublicMembers: Promise<boolean>

	return {
		canHavePublicMembers: async () => {
			if (_canHavePublicMembers) {
				return _canHavePublicMembers
			}

			_canHavePublicMembers = new Promise(async (resolve) => {
				const memberPrivacySettings = await fetchMemberPrivacySettings(httpClient, getSignedInstance(), baseURL)
				const publicMemberCandidates = memberPrivacySettings?.publicMemberCandidates
				const canAnyoneBePublicMembers = publicMemberCandidates === PublicMemberCandidates.ANYONE
				resolve(canAnyoneBePublicMembers)
			})

			return _canHavePublicMembers
		},
	}
}
