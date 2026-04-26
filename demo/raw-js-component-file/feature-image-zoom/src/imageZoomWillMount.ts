import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { ImageZoomAPI, ImageZoomPageConfig } from './types'
import { ImageZoomAPISymbol, name, NATIVE_GALLERIES_TYPES } from './symbols'
import type { ComponentWillMount, ViewerComponent } from 'feature-components'
import { getZoomDataFromUrl } from './imageZoom'
import type { Experiments, IPropsStore } from '@wix/thunderbolt-symbols'
import { ExperimentsSymbol, PageFeatureConfigSymbol, Props } from '@wix/thunderbolt-symbols'
import type { IUrlHistoryManager } from 'feature-router'
import { UrlHistoryManagerSymbol } from 'feature-router'
import type { ISeoSiteApi } from 'feature-seo'
import { SeoSiteSymbol } from 'feature-seo'
import type { GalleryItem } from '@wix/thunderbolt-becky-types'
import { ITEM_TYPES } from '@wix/advanced-seo-utils/api'

export const WPhotoWillMount = withDependencies(
	[ImageZoomAPISymbol],
	(zoomAPI: ImageZoomAPI): ComponentWillMount<ViewerComponent> => {
		return {
			componentTypes: ['WPhoto'],
			componentWillMount(wPhotoComp) {
				zoomAPI.addWPhotoOnClick(wPhotoComp.id)
			},
		}
	}
)

export const NativeGalleriesWillMount = withDependencies(
	[
		ImageZoomAPISymbol,
		named(PageFeatureConfigSymbol, name),
		Props,
		UrlHistoryManagerSymbol,
		SeoSiteSymbol,
		ExperimentsSymbol,
	],
	(
		zoomAPI: ImageZoomAPI,
		{ imageDataItemIdToCompId, staticMediaUrl }: ImageZoomPageConfig,
		propsStore: IPropsStore,
		urlHistoryManager: IUrlHistoryManager,
		seoSiteApi: ISeoSiteApi,
		experiments: Experiments
	): ComponentWillMount<ViewerComponent> => {
		return {
			componentTypes: NATIVE_GALLERIES_TYPES,
			async componentWillMount(galleryComponent) {
				zoomAPI.addNativeGalleryOnClick(galleryComponent.id)
				const zoomInfo = getZoomDataFromUrl(propsStore, urlHistoryManager, imageDataItemIdToCompId)
				if (!zoomInfo) {
					return
				}
				const gallery = propsStore.get(zoomInfo.compId)
				const galleryItem: GalleryItem = gallery?.items?.find(
					(item: GalleryItem) => item.dataId === zoomInfo.dataItemId
				)
				if (galleryItem && experiments.sv_imageZoomSeo) {
					await seoSiteApi.setVeloSeoTags({
						itemType: ITEM_TYPES.PRO_GALLERY_ITEM,
						itemData: {
							item: {
								id: galleryItem.dataId,
								type: 'image',
								title: galleryItem.image.title,
								description: galleryItem.description,
								page_url: urlHistoryManager.getParsedUrl().href,
								fullscreen_url: urlHistoryManager.getParsedUrl().href,
								image: {
									url: `${staticMediaUrl}/${galleryItem.image.uri}`,
									height: galleryItem.image.height,
									width: galleryItem.image.width,
									alt: galleryItem.image.alt,
								},
							},
						},
					})
				}
			},
		}
	}
)
