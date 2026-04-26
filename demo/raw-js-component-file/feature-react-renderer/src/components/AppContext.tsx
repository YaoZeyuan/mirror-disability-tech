import React from 'react'
import type { AppContext } from '../types'

const Context = React.createContext<AppContext>({} as AppContext)

export default Context
