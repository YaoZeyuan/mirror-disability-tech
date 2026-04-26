import { withDependencies, optional } from '@wix/thunderbolt-ioc'
import type { IMultilingual } from '@wix/thunderbolt-symbols'
import { MultilingualSymbol } from './symbols'
import type { IMultilingualLinkUtilsAPI } from './types'

const MultilingualUtilsAPIFactory = (multilingual: IMultilingual): IMultilingualLinkUtilsAPI => {
	return {
		getMultilingualInfo() {
			return {
				isOriginalLanguage: multilingual.isOriginalLanguage,
				currentLanguage: multilingual.currentLanguage,
			}
		},
	}
}
export const MultilingualLinkUtilsAPI = withDependencies([optional(MultilingualSymbol)], MultilingualUtilsAPIFactory)
