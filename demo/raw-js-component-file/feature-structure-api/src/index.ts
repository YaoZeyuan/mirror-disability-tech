import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { StructureAPI } from './structureApi'
import { BaseStructureAPI } from './baseStructureAPI'
import { DsStructureAPI } from './dsStructureApi'
import type { IBaseStructureAPI, IStructureAPI } from '@wix/thunderbolt-symbols'
import { StructureAPI as StructureAPISym } from '@wix/thunderbolt-symbols'
import { BaseStructureAPISym } from './symbols'

export const site: ContainerModuleLoader = (bind) => {
	bind<IBaseStructureAPI>(BaseStructureAPISym).to(BaseStructureAPI)
	bind<IStructureAPI>(StructureAPISym).to(StructureAPI)
}

export const editor: ContainerModuleLoader = (bind) => {
	bind<IBaseStructureAPI>(BaseStructureAPISym).to(BaseStructureAPI)
	bind<IStructureAPI>(StructureAPISym).to(DsStructureAPI)
}
