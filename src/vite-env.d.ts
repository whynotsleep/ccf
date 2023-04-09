/// <reference types="vite/client" />
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
export declare global {
  interface window {
    THREE: THREE,
    CANNON: CANNON
  }
}