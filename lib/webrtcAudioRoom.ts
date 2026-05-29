import {
  actualizarEstadoVoz,
  enviarSenal,
  iniciarHeartbeatVoz,
  registrarEnSala,
  salirDeSala,
  subscribeParticipantesVoz,
  subscribeSenalesVoz,
  type VoiceParticipante,
  type VoiceSignal,
} from "./voiceSala"

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
]

type PeerEntry = {
  pc: RTCPeerConnection
  audioEl: HTMLAudioElement
  sourceNode: MediaStreamAudioSourceNode | null
  gainNode: GainNode | null
  candidatosPendientes: RTCIceCandidateInit[]
}

export type SalaAudioEstado = {
  enSala: boolean
  conectando: boolean
  silenciado: boolean
  participantes: VoiceParticipante[]
  error: string | null
}

function raizAudio(): HTMLElement | null {
  if (typeof document === "undefined") return null
  let root = document.getElementById("es-audio-root")
  if (!root) {
    root = document.createElement("div")
    root.id = "es-audio-root"
    root.setAttribute("aria-hidden", "true")
    root.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1"
    document.body.appendChild(root)
  }
  return root
}

export class WebRTCAudioRoom {
  private claseId: string
  private peerId: string
  private nombre: string
  private localStream: MediaStream | null = null
  private peers = new Map<string, PeerEntry>()
  private unsubParticipantes: (() => void) | null = null
  private unsubSenales: (() => void) | null = null
  private stopHeartbeat: (() => void) | null = null
  private analizador: AnalyserNode | null = null
  private audioCtx: AudioContext | null = null
  private playbackCtx: AudioContext | null = null
  private rafSpeaking: number | null = null
  private ultimoSpeaking = false
  private silenciado = false
  private activo = false
  private onChange: (estado: Partial<SalaAudioEstado>) => void
  private participantes: VoiceParticipante[] = []

  constructor(
    claseId: string,
    peerId: string,
    nombre: string,
    onChange: (estado: Partial<SalaAudioEstado>) => void
  ) {
    this.claseId = claseId
    this.peerId = peerId
    this.nombre = nombre
    this.onChange = onChange
  }

  async entrar() {
    if (this.activo) return
    this.onChange({ conectando: true, error: null })

    try {
      raizAudio()
      await this.activarSalidaAudio()

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      this.activo = true
      this.silenciado = false

      this.unsubSenales = subscribeSenalesVoz(this.claseId, this.peerId, (s) => {
        void this.procesarSenal(s)
      })

      this.unsubParticipantes = subscribeParticipantesVoz(this.claseId, (lista) => {
        this.participantes = lista
        this.onChange({ participantes: lista })
        for (const p of lista) {
          if (p.peerId !== this.peerId) void this.asegurarPeer(p.peerId)
        }
        for (const id of [...this.peers.keys()]) {
          if (!lista.some((p) => p.peerId === id)) this.quitarPeer(id)
        }
      })

      await registrarEnSala(this.claseId, this.peerId, this.nombre, false)
      this.stopHeartbeat = iniciarHeartbeatVoz(this.claseId, this.peerId)
      this.iniciarDeteccionHabla()

      this.onChange({ enSala: true, conectando: false, silenciado: false, error: null })
    } catch (err) {
      this.activo = false
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permiso de micrófono denegado."
          : "No se pudo acceder al micrófono."
      this.onChange({ conectando: false, enSala: false, error: msg })
      throw err
    }
  }

  async salir() {
    this.activo = false
    this.unsubParticipantes?.()
    this.unsubSenales?.()
    this.stopHeartbeat?.()
    this.unsubParticipantes = null
    this.unsubSenales = null
    this.stopHeartbeat = null

    if (this.rafSpeaking) cancelAnimationFrame(this.rafSpeaking)
    this.rafSpeaking = null
    this.analizador = null
    if (this.audioCtx) {
      void this.audioCtx.close()
      this.audioCtx = null
    }
    if (this.playbackCtx) {
      void this.playbackCtx.close()
      this.playbackCtx = null
    }

    for (const id of [...this.peers.keys()]) this.quitarPeer(id)

    this.localStream?.getTracks().forEach((t) => t.stop())
    this.localStream = null

    await salirDeSala(this.claseId, this.peerId)
    this.participantes = []
    this.onChange({ enSala: false, conectando: false, participantes: [], error: null })
  }

  async toggleSilencio() {
    this.silenciado = !this.silenciado
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !this.silenciado
    })
    await actualizarEstadoVoz(this.claseId, this.peerId, {
      muted: this.silenciado,
      speaking: false,
    })
    this.onChange({ silenciado: this.silenciado })
  }

  private async activarSalidaAudio() {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!this.playbackCtx) this.playbackCtx = new Ctx()
    if (this.playbackCtx.state === "suspended") await this.playbackCtx.resume()
  }

  private debeIniciar(theirPeerId: string) {
    return this.peerId < theirPeerId
  }

  private crearElementoAudio(): HTMLAudioElement {
    const el = document.createElement("audio")
    el.autoplay = true
    el.setAttribute("playsinline", "true")
    el.setAttribute("webkit-playsinline", "true")
    el.muted = false
    el.volume = 1
    raizAudio()?.appendChild(el)
    return el
  }

  private conectarAudioRemoto(remotePeerId: string, stream: MediaStream) {
    const entry = this.peers.get(remotePeerId)
    if (!entry) return

    entry.audioEl.srcObject = stream
    void entry.audioEl.play().catch(() => {})

    void this.activarSalidaAudio().then(() => {
      if (!this.playbackCtx || entry.sourceNode) return
      try {
        const source = this.playbackCtx.createMediaStreamSource(stream)
        const gain = this.playbackCtx.createGain()
        gain.gain.value = 1.2
        source.connect(gain)
        gain.connect(this.playbackCtx.destination)
        entry.sourceNode = source
        entry.gainNode = gain
      } catch {
        /* pista ya enrutada */
      }
    })
  }

  private crearPeerConnection(remotePeerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const audioEl = this.crearElementoAudio()

    const entry: PeerEntry = {
      pc,
      audioEl,
      sourceNode: null,
      gainNode: null,
      candidatosPendientes: [],
    }
    this.peers.set(remotePeerId, entry)

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        pc.addTrack(track, this.localStream)
      }
    }

    pc.ontrack = (ev) => {
      let stream = ev.streams[0]
      if (!stream && ev.track) stream = new MediaStream([ev.track])
      if (!stream) return

      this.conectarAudioRemoto(remotePeerId, stream)

      ev.track.onunmute = () => this.conectarAudioRemoto(remotePeerId, stream)
      ev.track.onended = () => {
        if (entry.audioEl.srcObject) void entry.audioEl.play().catch(() => {})
      }
    }

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return
      void enviarSenal(this.claseId, {
        from: this.peerId,
        to: remotePeerId,
        type: "candidate",
        candidate: ev.candidate.toJSON(),
      })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        void this.activarSalidaAudio()
      }
      if (pc.connectionState === "failed") {
        try {
          pc.restartIce()
        } catch {
          this.quitarPeer(remotePeerId)
        }
      }
      if (pc.connectionState === "closed") {
        this.quitarPeer(remotePeerId)
      }
    }

    return pc
  }

  private async asegurarPeer(remotePeerId: string) {
    if (remotePeerId === this.peerId || this.peers.has(remotePeerId)) return
    const pc = this.crearPeerConnection(remotePeerId)
    if (this.debeIniciar(remotePeerId)) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)
      await enviarSenal(this.claseId, {
        from: this.peerId,
        to: remotePeerId,
        type: "offer",
        sdp: { type: offer.type, sdp: offer.sdp ?? "" },
      })
    }
  }

  private async procesarSenal(signal: VoiceSignal) {
    if (!this.activo || signal.from === this.peerId) return

    let entry = this.peers.get(signal.from)

    if (signal.type === "offer" && signal.sdp?.sdp) {
      const desc = new RTCSessionDescription({
        type: signal.sdp.type ?? "offer",
        sdp: signal.sdp.sdp,
      })

      if (entry) {
        const state = entry.pc.signalingState
        if (state === "have-local-offer") {
          if (this.debeIniciar(signal.from)) return
          await entry.pc.setLocalDescription({ type: "rollback" })
        } else if (state !== "stable") {
          return
        }
      } else {
        this.crearPeerConnection(signal.from)
        entry = this.peers.get(signal.from)!
      }

      await entry.pc.setRemoteDescription(desc)
      const answer = await entry.pc.createAnswer()
      await entry.pc.setLocalDescription(answer)
      await enviarSenal(this.claseId, {
        from: this.peerId,
        to: signal.from,
        type: "answer",
        sdp: { type: answer.type, sdp: answer.sdp ?? "" },
      })
      await this.vaciarCandidatos(signal.from)
      return
    }

    if (!entry) return
    const { pc } = entry

    if (signal.type === "answer" && signal.sdp?.sdp) {
      if (pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: signal.sdp.type ?? "answer",
            sdp: signal.sdp.sdp,
          })
        )
        await this.vaciarCandidatos(signal.from)
      }
      return
    }

    if (signal.type === "candidate" && signal.candidate?.candidate) {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {})
      } else {
        entry.candidatosPendientes.push(signal.candidate)
      }
    }
  }

  private async vaciarCandidatos(remotePeerId: string) {
    const entry = this.peers.get(remotePeerId)
    if (!entry) return
    for (const c of entry.candidatosPendientes) {
      await entry.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
    }
    entry.candidatosPendientes = []
  }

  private quitarPeer(remotePeerId: string) {
    const entry = this.peers.get(remotePeerId)
    if (!entry) return
    try {
      entry.sourceNode?.disconnect()
      entry.gainNode?.disconnect()
    } catch {
      /* ignorar */
    }
    entry.pc.close()
    entry.audioEl.pause()
    entry.audioEl.srcObject = null
    entry.audioEl.remove()
    this.peers.delete(remotePeerId)
  }

  private iniciarDeteccionHabla() {
    if (!this.localStream) return
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return

    this.audioCtx = new Ctx()
    this.analizador = this.audioCtx.createAnalyser()
    this.analizador.fftSize = 512
    const source = this.audioCtx.createMediaStreamSource(this.localStream)
    source.connect(this.analizador)

    const buf = new Uint8Array(this.analizador.frequencyBinCount)
    let ultimoEnvio = 0

    const medir = () => {
      if (!this.activo || !this.analizador) return
      this.analizador.getByteFrequencyData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i]
      const avg = sum / buf.length
      const hablando = !this.silenciado && avg > 18
      const ahora = Date.now()
      if (hablando !== this.ultimoSpeaking && ahora - ultimoEnvio > 400) {
        this.ultimoSpeaking = hablando
        ultimoEnvio = ahora
        void actualizarEstadoVoz(this.claseId, this.peerId, { speaking: hablando })
      }
      this.rafSpeaking = requestAnimationFrame(medir)
    }
    this.rafSpeaking = requestAnimationFrame(medir)
  }
}
