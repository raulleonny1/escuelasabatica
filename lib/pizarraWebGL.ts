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

export type CapaTrazoGPU = {
  id: string
  buffer: WebGLBuffer
  count: number
  color: [number, number, number, number]
  erase: boolean
}

export class MotorPizarraWebGL {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private locResolution: WebGLUniformLocation
  private locColor: WebGLUniformLocation
  private vao: WebGLVertexArrayObject
  private capas = new Map<string, CapaTrazoGPU>()
  private w = 0
  private h = 0

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      desynchronized: true,
      powerPreference: "high-performance",
    })
    if (!gl) throw new Error("WebGL2 no disponible")
    this.gl = gl

    const vs = this.compilarShader(gl.VERTEX_SHADER, VS)
    const fs = this.compilarShader(gl.FRAGMENT_SHADER, FS)
    const program = gl.createProgram()
    if (!vs || !fs || !program) throw new Error("Error compilando shaders")
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Link error")
    }
    this.program = program
    this.locResolution = gl.getUniformLocation(program, "u_resolution")!
    this.locColor = gl.getUniformLocation(program, "u_color")!

    const vao = gl.createVertexArray()
    if (!vao) throw new Error("VAO error")
    this.vao = vao
    gl.bindVertexArray(vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const loc = gl.getAttribLocation(program, "a_pos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
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
    const cw = Math.floor(w * dpr)
    const ch = Math.floor(h * dpr)
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
    if (!malla || malla.vertices.length === 0) {
      this.eliminarCapa(id)
      return
    }
    const gl = this.gl
    let capa = this.capas.get(id)
    if (!capa) {
      const buffer = gl.createBuffer()
      if (!buffer) return
      capa = {
        id,
        buffer,
        count: 0,
        color: malla.color,
        erase: malla.modo === "erase",
      }
      this.capas.set(id, capa)
    }
    capa.color = malla.color
    capa.erase = malla.modo === "erase"
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

  /** Render incremental: fondo + trazos + capas overlay (activo, predicción). */
  render(ordenIds: string[], overlayIds: string[] = []) {
    const gl = this.gl
    const dpr = gl.canvas.width / this.w
    gl.clearColor(...COLOR_FONDO_PIZARRA)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)
    gl.uniform2f(this.locResolution, this.w * dpr, this.h * dpr)
    gl.bindVertexArray(this.vao)

    const dibujarCapa = (id: string) => {
      const capa = this.capas.get(id)
      if (!capa || capa.count < 3 || capa.erase) return
      gl.bindBuffer(gl.ARRAY_BUFFER, capa.buffer)
      const loc = gl.getAttribLocation(this.program, "a_pos")
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform4fv(this.locColor, capa.color)
      gl.drawArrays(gl.TRIANGLES, 0, capa.count)
    }

    for (const id of ordenIds) dibujarCapa(id)
    for (const id of overlayIds) dibujarCapa(id)

    gl.bindVertexArray(null)
  }

  dispose() {
    this.limpiarCapas()
    this.gl.deleteProgram(this.program)
    this.gl.deleteVertexArray(this.vao)
  }
}
