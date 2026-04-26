import { STATIC_MEDIA_URL } from '@wix/image-kit'
import type { ImagePlaceholder, IImagePlaceholderService, IImagePlaceholderConfig } from './types'

export const createPlaceholderGetter = (
	getWOWPlaceholder: any,
	{ baseMediaUrl = STATIC_MEDIA_URL, isSEOBot = false }: IImagePlaceholderConfig
): IImagePlaceholderService => {
	const SCHEME_RE = /^[a-z]+:/

	return {
		getPlaceholder: ({ fittingType, src, target, options }) => {
			const placeholder = getWOWPlaceholder(fittingType, src, target, {
				...(options || {}),
				isSEOBot,
				autoEncode: true,
			})

			if (placeholder && placeholder.uri && !SCHEME_RE.test(placeholder.uri)) {
				placeholder.uri = `${baseMediaUrl}/${placeholder.uri}`
			}

			if (placeholder?.srcset?.dpr) {
				placeholder.srcset.dpr = placeholder.srcset.dpr.map((s: string) =>
					SCHEME_RE.test(s) ? s : `${baseMediaUrl}/${s}`
				)
			}

			return placeholder as ImagePlaceholder
		},
	}
}
