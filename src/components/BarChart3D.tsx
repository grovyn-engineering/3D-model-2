import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface DataPoint {
  label: string
  value: number
  month: string
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  data: DataPoint | null
}

const SALES_DATA: DataPoint[] = [
  { label: 'Jan', month: 'January',   value: 42000 },
  { label: 'Feb', month: 'February',  value: 58000 },
  { label: 'Mar', month: 'March',     value: 51000 },
  { label: 'Apr', month: 'April',     value: 73000 },
  { label: 'May', month: 'May',       value: 68000 },
  { label: 'Jun', month: 'June',      value: 89000 },
  { label: 'Jul', month: 'July',      value: 95000 },
  { label: 'Aug', month: 'August',    value: 82000 },
  { label: 'Sep', month: 'September', value: 76000 },
  { label: 'Oct', month: 'October',   value: 91000 },
  { label: 'Nov', month: 'November',  value: 110000 },
  { label: 'Dec', month: 'December',  value: 128000 },
]

const MAX_VAL = Math.max(...SALES_DATA.map(d => d.value))
const BAR_WIDTH   = 0.55
const BAR_GAP     = 0.95
const MAX_HEIGHT  = 4.5

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export default function BarChart3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, data: null,
  })
  const setTooltipStable = useCallback((t: TooltipState) => setTooltip(t), [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf7f7f7)

    // ── Camera ─────────────────────────────────────────────
    const w = mount.clientWidth
    const h = mount.clientHeight
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100)
    camera.position.set(0, 5, 14)
    camera.lookAt(0, 2, 0)

    // ── Renderer ───────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // ── OrbitControls ──────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 2, 0)
    controls.enableDamping     = true
    controls.dampingFactor     = 0.08
    controls.autoRotate        = true
    controls.autoRotateSpeed   = 0.6
    // Constrain so the chart never flips or goes underground
    controls.minPolarAngle     = Math.PI / 6      // 30° — can't look straight down
    controls.maxPolarAngle     = Math.PI / 2.2    // ~82° — can't go below floor
    controls.minDistance       = 8
    controls.maxDistance       = 22
    controls.enablePan         = false
    controls.update()

    // Pause auto-rotate while user is dragging; resume after 3 s of idle
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    const pauseAutoRotate = () => {
      controls.autoRotate = false
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => { controls.autoRotate = true }, 3000)
    }
    renderer.domElement.addEventListener('pointerdown', pauseAutoRotate)

    // ── Lights ─────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5)
    dirLight.position.set(5, 12, 8)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(1024, 1024)
    dirLight.shadow.camera.near   = 0.5
    dirLight.shadow.camera.far    = 50
    dirLight.shadow.camera.left   = -12
    dirLight.shadow.camera.right  = 12
    dirLight.shadow.camera.top    = 12
    dirLight.shadow.camera.bottom = -4
    scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6)
    fillLight.position.set(-5, 3, -3)
    scene.add(fillLight)

    // ── Floor ──────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(20, 14)
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xefefef })
    const floor    = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    const baseGeo = new THREE.BoxGeometry(SALES_DATA.length * BAR_GAP + 0.4, 0.04, BAR_WIDTH + 0.4)
    const baseMat = new THREE.MeshLambertMaterial({ color: 0xd0d0d0 })
    const base    = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = 0.02
    scene.add(base)

    const gridHelper = new THREE.GridHelper(20, 20, 0xc0c0c0, 0xe0e0e0)
    gridHelper.position.y = 0.001
    scene.add(gridHelper)

    // ── Bars ───────────────────────────────────────────────
    const totalWidth = (SALES_DATA.length - 1) * BAR_GAP

    type BarEntry = {
      mesh: THREE.Mesh
      targetHeight: number
      data: DataPoint
      normalMat: THREE.MeshLambertMaterial
      hoverMat: THREE.MeshLambertMaterial
      // current XZ scale for smooth hover swell
      currentXZ: number
      targetXZ: number
    }

    const bars: BarEntry[] = []

    SALES_DATA.forEach((d, i) => {
      const targetH = (d.value / MAX_VAL) * MAX_HEIGHT
      const geo = new THREE.BoxGeometry(BAR_WIDTH, 1, BAR_WIDTH)
      geo.translate(0, 0.5, 0)   // pivot at bottom

      const normalMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
      const hoverMat  = new THREE.MeshLambertMaterial({ color: 0x080808 })

      const mesh = new THREE.Mesh(geo, normalMat)
      mesh.scale.set(1, 0.001, 1)
      mesh.position.x  = i * BAR_GAP - totalWidth / 2
      mesh.position.y  = 0
      mesh.castShadow  = true
      mesh.receiveShadow = true
      mesh.userData    = { index: i }
      scene.add(mesh)

      bars.push({ mesh, targetHeight: targetH, data: d, normalMat, hoverMat, currentXZ: 1, targetXZ: 1 })
    })

    // ── Raycaster ──────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const pointer   = new THREE.Vector2(-9999, -9999)
    let hoveredIndex = -1

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect()
      pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(bars.map(b => b.mesh))

      if (hits.length > 0) {
        const idx = (hits[0].object as THREE.Mesh).userData.index as number

        if (idx !== hoveredIndex) {
          // restore previous
          if (hoveredIndex >= 0) {
            bars[hoveredIndex].mesh.material = bars[hoveredIndex].normalMat
            bars[hoveredIndex].targetXZ = 1
          }
          hoveredIndex = idx
          bars[idx].mesh.material = bars[idx].hoverMat
          bars[idx].targetXZ = 1.18   // swell 18% on XZ
          mount.style.cursor = 'pointer'
        }

        setTooltipStable({
          visible: true,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          data: bars[idx].data,
        })
      } else {
        if (hoveredIndex >= 0) {
          bars[hoveredIndex].mesh.material = bars[hoveredIndex].normalMat
          bars[hoveredIndex].targetXZ = 1
          hoveredIndex = -1
          mount.style.cursor = 'default'
        }
        setTooltipStable({ visible: false, x: 0, y: 0, data: null })
      }
    }

    const onMouseLeave = () => {
      if (hoveredIndex >= 0) {
        bars[hoveredIndex].mesh.material = bars[hoveredIndex].normalMat
        bars[hoveredIndex].targetXZ = 1
        hoveredIndex = -1
      }
      mount.style.cursor = 'default'
      setTooltipStable({ visible: false, x: 0, y: 0, data: null })
    }

    mount.addEventListener('mousemove', onMouseMove)
    mount.addEventListener('mouseleave', onMouseLeave)

    // ── Animation loop ─────────────────────────────────────
    const START_DELAY = 0.3
    const DURATION    = 1.4
    let startTime: number | null = null
    let rafId: number

    const animate = (time: number) => {
      rafId = requestAnimationFrame(animate)

      if (startTime === null) startTime = time
      const elapsed = (time - startTime) / 1000

      bars.forEach((b, i) => {
        // Rise animation
        const barDelay = START_DELAY + (i / bars.length) * 0.5
        const t        = Math.min(Math.max((elapsed - barDelay) / DURATION, 0), 1)
        const eased    = easeOutCubic(t)
        b.mesh.scale.y = Math.max(eased * b.targetHeight, 0.001)

        // Smooth XZ swell on hover
        b.currentXZ = lerp(b.currentXZ, b.targetXZ, 0.12)
        b.mesh.scale.x = b.currentXZ
        b.mesh.scale.z = b.currentXZ
      })

      controls.update()           // needed for damping + auto-rotate
      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(animate)

    // ── Resize ─────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(mount)

    // ── Cleanup ────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      if (idleTimer) clearTimeout(idleTimer)
      resizeObserver.disconnect()
      mount.removeEventListener('mousemove', onMouseMove)
      mount.removeEventListener('mouseleave', onMouseLeave)
      renderer.domElement.removeEventListener('pointerdown', pauseAutoRotate)
      controls.dispose()
      mount.removeChild(renderer.domElement)
      renderer.dispose()
      bars.forEach(b => {
        b.mesh.geometry.dispose()
        b.normalMat.dispose()
        b.hoverMat.dispose()
      })
    }
  }, [setTooltipStable])

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {/* Hint */}
      <div
        className="absolute top-3 right-4 pointer-events-none"
      >
        <span
          className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: 'var(--ink-muted)' }}
        >
          drag to rotate
        </span>
      </div>

      {/* Month labels */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-around pb-1 pointer-events-none"
        style={{ paddingLeft: '3%', paddingRight: '3%' }}
      >
        {SALES_DATA.map(d => (
          <span
            key={d.label}
            className="text-center font-mono text-[10px] md:text-xs"
            style={{ color: 'var(--ink-muted)', minWidth: 0 }}
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          className="absolute pointer-events-none z-20 card-paper rounded px-3 py-2"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)',
            minWidth: 140,
          }}
        >
          <p className="font-serif font-semibold text-sm mb-0.5" style={{ color: 'var(--ink)' }}>
            {tooltip.data.month}
          </p>
          <p className="font-mono text-xs" style={{ color: 'var(--ink-muted)' }}>
            ${tooltip.data.value.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}

export { SALES_DATA, MAX_VAL }
