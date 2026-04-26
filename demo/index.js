import fs from 'fs'
import path from 'path'
import { SourceMapConsumer } from 'source-map-js'

async function recoveredFile(targetFileUri) {
  try {
    const rawSourceMap = JSON.parse(fs.readFileSync(targetFileUri, 'utf-8'))
    const consumer = await new SourceMapConsumer(rawSourceMap)

    consumer.sources.forEach((source, i) => {
      const content = consumer.sourcesContent?.[i]
      if (content) {
        const filePath = `./recovered/${source}`
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, content)
      }
    })
  } catch (e) {
    console.log(`❌${targetFileUri}还原失败`)
    console.log(e)
  }

  // consumer.destroy()
}

async function main() {
  const filenameList = [
    'accessibility.5a528201.chunk.min.js.map',
    'accessibilityBrowserZoom.6895cb62.chunk.min.js.map',
    'animations.49c55ede.chunk.min.js.map',
    'animationsWixCodeSdk.726e9885.chunk.min.js.map',
    'appMonitoring.d502493c.chunk.min.js.map',
    'assetsLoader.1a4bd352.chunk.min.js.map',
    'browser-deprecation.bundle.es5.js.map',
    'businessLogger.382014f6.chunk.min.js.map',
    'componentsLoader.07f88113.chunk.min.js.map',
    'consentPolicy.c7f0149b.chunk.min.js.map',
    'contentReflow.e4dd8a93.chunk.min.js.map',
    'cyclicTabbing.7085d18c.chunk.min.js.map',
    'domSelectors.0df2cf2d.chunk.min.js.map',
    'domStore.4d54a74d.chunk.min.js.map',
    'dynamicPages.1b10d791.chunk.min.js.map',
    'environment.aa72590f.chunk.min.js.map',
    'environmentService.ce65c260.chunk.min.js.map',
    'environmentWixCodeSdk.dbb376f6.chunk.min.js.map',
    'externalServices.bf1ce5f4.chunk.min.js.map',
    'group_0.5120b1c2.chunk.min.js.map',
    'group_11.e2f9d796.chunk.min.js.map',
    'group_14.71cad7d9.chunk.min.js.map',
    'group_2.4cb4d010.chunk.min.js.map',
    'group_20.1128a55d.chunk.min.js.map',
    'group_23.572bd6dc.chunk.min.js.map',
    'group_24.ae2b90b3.chunk.min.js.map',
    'group_27.24507aab.chunk.min.js.map',
    'group_28.98f4bda8.chunk.min.js.map',
    'group_3.443a1623.chunk.min.js.map',
    'group_30.2abbdf6f.chunk.min.js.map',
    'group_32.643a5cba.chunk.min.js.map',
    'group_36.bc4eabb9.chunk.min.js.map',
    'group_38.90c9557b.chunk.min.js.map',
    'group_4.825d1a51.chunk.min.js.map',
    'group_42.825d0e24.chunk.min.js.map',
    'group_5.79f06044.chunk.min.js.map',
    'group_6.8fc8a69c.chunk.min.js.map',
    'group_7.c0d47db2.chunk.min.js.map',
    'group_9.c8b7529f.chunk.min.js.map',
    'imagePlaceholder.a5c38083.chunk.min.js.map',
    'main.bd1e9da6.bundle.min.js.map',
    'mobileFullScreen.3c69b7f5.chunk.min.js.map',
    'motion.4dedec96.chunk.min.js.map',
    'mpaNavigation.a6072a7b.chunk.min.js.map',
    'multilingual.656b9723.chunk.min.js.map',
    'navigation.857097f4.chunk.min.js.map',
    'onloadCompsBehaviors.7e1bb591.chunk.min.js.map',
    'ooi.5da71659.chunk.min.js.map',
    'pageAnchors.b16478c5.chunk.min.js.map',
    'panorama.1bdf1744.chunk.min.js.map',
    'platform.884c7fe8.chunk.min.js.map',
    'platformPubsub.bde4edad.chunk.min.js.map',
    'popups.4f64a536.chunk.min.js.map',
    'protectedPages.9e2f0c3d.chunk.min.js.map',
    'renderer.90f3ef29.chunk.min.js.map',
    'router.a868afca.chunk.min.js.map',
    'routerFetch.4fed4805.chunk.min.js.map',
    'scrollToAnchor.c63ab772.chunk.min.js.map',
    'siteMembers.4f6f476c.chunk.min.js.map',
    'siteMembersWixCodeSdk.c31eca95.chunk.min.js.map',
    'siteScrollBlocker.d38ddc5a.chunk.min.js.map',
    'speculationRules.0f29966f.chunk.min.js.map',
    'ssrCache.a72bfdc3.chunk.min.js.map',
    'stores.0468e03d.chunk.min.js.map',
    'svgLoader.dda061e2.chunk.min.js.map',
    'triggersAndReactions.23ab777e.chunk.min.js.map',
    'usedPlatformApis.b09c4d5c.chunk.min.js.map',
    'windowScroll.b6975c2a.chunk.min.js.map',
  ]

  const basePath = path.resolve('.', 'raw-source')

  let index = 0
  for (const filename of filenameList) {
    index++
    console.log(`还原第${index}/${filenameList.length}个文件${filename}`)
    const targetFileUri = path.resolve(basePath, filename)
    console.log('targetFileUri => ', targetFileUri)
    await recoveredFile(targetFileUri)
    console.log(`✅ 第${index}/${filenameList.length}个文件`, targetFileUri, '还原完毕')
  }
}

main()
