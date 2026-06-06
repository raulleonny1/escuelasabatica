import type { MallaTinta } from "./pizarraTinta"
import { COLOR_FONDO_PIZARRA } from "./pizarraTinta"

const VS = `#version 300 es
in vec2 a_pos;
uniform vec2 u_resolution;
void main() {
  vec2 clip = (a_pos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
}`

const FS = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main() {
  outColor = u_color;
}`

type CapaGPU = {
  buffer: WebGLBuffer
  count: number
  color: [number, number, number, number]
}

export class MotorPizarraWebGL {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private locResolution: WebGLUniformLocation
  private locColor: WebGLUniformLocation
  private locPos: number
  private capas = new Map<string, CapaGPU>()
  private w = 0
  private h = 0
  private dpr = 1
  private fondoTransparente: boolean

  constructor(canvas: HTMLCanvasElement, opts?: { fondoTransparente?: boolean }) {
    this.fondoTransparente = opts?.fondoTransparente ?? false
    const gl = canvas.getContext("webgl2", {
      alpha: this.fondoTransparente,
      antialias: true,
      desynchronized: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    })
    if (!gl) throw new Error("WebGL2 no disponible")
    this.gl = gl

    const vs = this.compilarShader(gl.VERTEX_SHADER, VS)
    const fs = this.compilarShader(gl.FRAGMENT_SHADER, FS)
    const program = gl.createProgram()
    if (!vs || !fs || !program) throw new Error("Error compilando shaders WebGL")
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Link error")
    }
    this.program = program
    this.locResolution = gl.getUniformLocation(program, "u_resolution")!
    this.locColor = gl.getUniformLocation(program, "u_color")!
    this.locPos = gl.getAttribLocation(program, "a_pos")
  }

  private compilarShader(type: number, src: string) {
    const gl = this.gl
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh))
      gl.deleteShader(sh)
      return null
    }
    return sh
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w
    this.h = h
    this.dpr = dpr
    const cw = Math.max(1, Math.floor(w * dpr))
    const ch = Math.max(1, Math.floor(h * dpr))
    const canvas = this.gl.canvas as HTMLCanvasElement
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    this.gl.viewport(0, 0, cw, ch)
  }

  actualizarCapa(id: string, malla: MallaTinta | null) {
    if (!malla || malla.vertices.length < 6) {
      this.eliminarCapa(id)
      return
    }
    const gl = this.gl
    let capa = this.capas.get(id)
    if (!capa) {
      const buffer = gl.createBuffer()
      if (!buffer) return
      capa = { buffer, count: 0, color: malla.color }
      this.capas.set(id, capa)
    }
    capa.color = malla.color
    capa.count = malla.vertices.length / 2
    gl.bindBuffer(gl.ARRAY_BUFFER, capa.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, malla.vertices, gl.DYNAMIC_DRAW)
  }

  eliminarCapa(id: string) {
    const capa = this.capas.get(id)
    if (capa) {
      this.gl.deleteBuffer(capa.buffer)
      this.capas.delete(id)
    }
  }

  limpiarCapas() {
    for (const id of [...this.capas.keys()]) this.eliminarCapa(id)
  }

  podarCapas(idsValidos: Set<string>) {
    for (const id of [...this.capas.keys()]) {
      if (!idsValidos.has(id)) this.eliminarCapa(id)
    }
  }

  get resolucionDispositivo() {
    return { w: this.w * this.dpr, h: this.h * this.dpr }
  }

  render(ordenIds: string[], overlayIds: string[] = []) {
    const gl = this.gl
    const { w, h } = this.resolucionDispositivo
    if (this.fondoTransparente) {
      gl.clearColor(0, 0, 0, 0)
    } else {
      gl.clearColor(...COLOR_FONDO_PIZARRA)
    }
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(this.program)
    gl.uniform2f(this.locResolution, w, h)

    const dibujar = (id: string) => {
      const capa = this.capas.get(id)
      if (!capa || capa.count < 3) return
      gl.bindBuffer(gl.ARRAY_BUFFER, capa.buffer)
      gl.enableVertexAttribArray(this.locPos)
      gl.vertexAttribPointer(this.locPos, 2, gl.FLOAT, false, 0, 0)
      gl.uniform4fv(this.locColor, capa.color)
      gl.drawArrays(gl.TRIANGLES, 0, capa.count)
    }

    for (const id of ordenIds) dibujar(id)
    for (const id of overlayIds) dibujar(id)
  }

  dispose() {
    this.limpiarCapas()
    this.gl.deleteProgram(this.program)
  }
}
