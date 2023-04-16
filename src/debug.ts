import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { dev } from './config'

export const debug = {
  gui:GUI
}

if(dev) {
  debug.gui = new GUI()
}
