import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LevelDef, Position } from '../types/game';

// Pre-allocated scratch vectors to ensure zero GC in animation loop
const _vec3 = new THREE.Vector3();
const _targetCameraPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

export interface SceneCallbacks {
  onTileClick: (x: number, y: number) => void;
  onBlinkTargetSelect?: (x: number, y: number) => void;
  onCameraChange?: (azimuth: number) => void;
}

export class ChronoSceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pmremGenerator: THREE.PMREMGenerator;
  private isSoftwareGl: boolean = false;
  private animationFrameId: number = 0;
  private isDisposed: boolean = false;
  private domCleanup: (() => void) | null = null;

  // Real Space Lighting & Celestial Rig
  private sunLight: THREE.DirectionalLight;
  private nebulaFillLight: THREE.HemisphereLight;
  private earthshineRimLight: THREE.DirectionalLight;

  // Space Environment Meshes
  private celestialGroup: THREE.Group;
  private gasGiantMesh: THREE.Mesh;
  private gasGiantRings: THREE.Mesh;
  private starfieldPoints: THREE.Points;

  // Platform & Interactive Meshes
  private tileMeshes: Map<string, THREE.Group> = new Map();
  private keyMeshes: Map<string, THREE.Group> = new Map();
  private gateMeshes: Map<string, THREE.Group> = new Map();
  private switchMeshes: Map<string, THREE.Group> = new Map();
  private teleporterMeshes: Map<string, THREE.Group> = new Map();
  private exitMesh: THREE.Group | null = null;

  // Human Astronaut Character
  private astronautGroup: THREE.Group;
  private astronautTorso: THREE.Group;
  private astronautHead: THREE.Group;
  private astronautVisor: THREE.Mesh;
  private astronautLeftLeg: THREE.Group;
  private astronautRightLeg: THREE.Group;
  private astronautLeftArm: THREE.Group;
  private astronautRightArm: THREE.Group;
  private astronautBackpack: THREE.Group;
  private astronautHeadlamp: THREE.SpotLight;
  private astronautShadow: THREE.Mesh;

  // Quantum Blink Targeting Reticle (Teleport Anywhere Ability)
  private blinkReticleGroup: THREE.Group;
  private isBlinkMode: boolean = false;
  private blinkTargetPos: Position | null = null;

  // Surrounding Orbital Station Superstructure
  private stationSuperstructure: THREE.Group = new THREE.Group();
  private commsDishGroup: THREE.Group | null = null;
  private solarWingLeft: THREE.Group | null = null;
  private solarWingRight: THREE.Group | null = null;
  private stationBeaconMats: THREE.MeshBasicMaterial[] = [];

  // Cold Gas RCS Thruster Particle Emitters
  private rcsParticles: THREE.Points;
  private rcsGeo: THREE.BufferGeometry;
  private rcsPositions: Float32Array;
  private rcsVelocities: Float32Array;
  private rcsLifetimes: Float32Array;

  // Quantum Warp Flash Particles (for Teleport Anywhere)
  private warpFlashParticles: THREE.Points;
  private warpFlashGeo: THREE.BufferGeometry;
  private warpPositions: Float32Array;
  private warpVelocities: Float32Array;
  private warpLifetimes: Float32Array;

  // Space Dust Particles
  private spaceDust: THREE.Points;

  // Interaction & Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private callbacks: SceneCallbacks;

  // Astronaut Locomotion & Animation
  private clock: THREE.Clock = new THREE.Clock();
  private playerVisualPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private playerTargetPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private playerFacingAngle: number = 0;
  private playerTargetAngle: number = 0;
  private walkCyclePhase: number = 0;
  private isMoving: boolean = false;

  // Camera Orbit, Zoom & Enlarged Map Framing
  // Enlarge map: closer default distance so map is prominent and monumental
  private cameraOrbitRadius: number = 14.0;
  private cameraOrbitAzimuth: number = Math.PI * 0.28;
  private cameraOrbitElevation: number = 0.82;
  private cameraCurrentLookAt: THREE.Vector3 = new THREE.Vector3(0, 0.45, 0);
  private cameraTargetLookAt: THREE.Vector3 = new THREE.Vector3(0, 0.45, 0);
  private viewPanOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isDraggingCamera: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dragDistance: number = 0;

  // Level Info
  private levelWidth: number = 6;
  private levelHeight: number = 6;
  private currentPrevPos: Position | null = null;

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Detect WebGL Capabilities
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Setup High-Precision WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(this.renderer.domElement);

    // 3. Realistic Void Scene & Studio PBR Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.pmremGenerator.dispose();

    // 4. Camera Setup with Enlarged Map FOV
    this.camera = new THREE.PerspectiveCamera(
      48, // Slightly wider FOV for immersive presence
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    // 5. Authentic Astrophysical Solar Lighting
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 3.4);
    this.sunLight.position.set(24, 40, 20);
    this.sunLight.castShadow = !this.isSoftwareGl;
    if (this.sunLight.castShadow) {
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 1;
      this.sunLight.shadow.camera.far = 80;
      const d = 16;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0004;
      this.sunLight.shadow.normalBias = 0.03;
    }
    this.scene.add(this.sunLight);

    this.nebulaFillLight = new THREE.HemisphereLight(0x475569, 0x070b16, 0.8);
    this.scene.add(this.nebulaFillLight);

    this.earthshineRimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    this.earthshineRimLight.position.set(-20, -10, -25);
    this.scene.add(this.earthshineRimLight);

    // 6. Build Celestial Vista
    this.celestialGroup = new THREE.Group();
    const { gasGiant, rings, starfield } = this.buildCelestialEnvironment();
    this.gasGiantMesh = gasGiant;
    this.gasGiantRings = rings;
    this.starfieldPoints = starfield;
    this.scene.add(this.celestialGroup);

    // 7. Build Non-Robot Human Astronaut Character
    const {
      astronaut,
      torso,
      head,
      visor,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      backpack,
      headlamp,
    } = this.buildRealisticAstronaut();
    this.astronautGroup = astronaut;
    this.astronautTorso = torso;
    this.astronautHead = head;
    this.astronautVisor = visor;
    this.astronautLeftLeg = leftLeg;
    this.astronautRightLeg = rightLeg;
    this.astronautLeftArm = leftArm;
    this.astronautRightArm = rightArm;
    this.astronautBackpack = backpack;
    this.astronautHeadlamp = headlamp;
    this.scene.add(this.astronautGroup);

    // Contact Shadow
    const shadowGeo = new THREE.CircleGeometry(0.5, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.astronautShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.astronautShadow.rotation.x = -Math.PI / 2;
    this.astronautShadow.position.y = 0.02;
    this.scene.add(this.astronautShadow);

    // 8. Build Quantum Blink Reticle (Teleport Anywhere Ability)
    this.blinkReticleGroup = this.buildBlinkReticle();
    this.blinkReticleGroup.visible = false;
    this.scene.add(this.blinkReticleGroup);

    // Surrounding Space Station Superstructure
    this.scene.add(this.stationSuperstructure);

    // 9. Particle Systems (RCS and Warp Surge)
    const rcsCount = 70;
    this.rcsPositions = new Float32Array(rcsCount * 3);
    this.rcsVelocities = new Float32Array(rcsCount * 3);
    this.rcsLifetimes = new Float32Array(rcsCount);
    this.rcsGeo = new THREE.BufferGeometry();
    this.rcsGeo.setAttribute('position', new THREE.BufferAttribute(this.rcsPositions, 3));
    const rcsMat = new THREE.PointsMaterial({
      color: 0xa5f3fc,
      size: 0.1,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.rcsParticles = new THREE.Points(this.rcsGeo, rcsMat);
    this.scene.add(this.rcsParticles);

    // Warp flash particles for instant teleport anywhere
    const warpCount = 120;
    this.warpPositions = new Float32Array(warpCount * 3);
    this.warpVelocities = new Float32Array(warpCount * 3);
    this.warpLifetimes = new Float32Array(warpCount);
    this.warpFlashGeo = new THREE.BufferGeometry();
    this.warpFlashGeo.setAttribute('position', new THREE.BufferAttribute(this.warpPositions, 3));
    const warpMat = new THREE.PointsMaterial({
      color: 0xc084fc,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.warpFlashParticles = new THREE.Points(this.warpFlashGeo, warpMat);
    this.scene.add(this.warpFlashParticles);

    // 10. Vacuum Dust
    const dustCount = 160;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 36;
      dustPos[i + 1] = (Math.random() - 0.2) * 16;
      dustPos[i + 2] = (Math.random() - 0.5) * 36;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.04,
      transparent: true,
      opacity: 0.45,
    });
    this.spaceDust = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.spaceDust);

    // 11. Bind Listeners & Start Loop
    this.bindEvents();
    this.startLoop();
  }

  /**
   * Constructs the Quantum Blink Reticle for Teleport Anywhere
   */
  private buildBlinkReticle(): THREE.Group {
    const group = new THREE.Group();

    // Outer spinning cyan/violet target ring
    const ringGeo = new THREE.RingGeometry(0.38, 0.46, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    ring.name = 'reticleRing';
    group.add(ring);

    // Inner crosshairs
    const crossGeo = new THREE.PlaneGeometry(0.18, 0.04);
    const crossMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const cross1 = new THREE.Mesh(crossGeo, crossMat);
    cross1.rotation.x = -Math.PI / 2;
    cross1.position.y = 0.045;
    group.add(cross1);

    const cross2 = new THREE.Mesh(crossGeo, crossMat);
    cross2.rotation.x = -Math.PI / 2;
    cross2.rotation.z = Math.PI / 2;
    cross2.position.y = 0.045;
    group.add(cross2);

    // Vertical holographic beacon cylinder
    const colGeo = new THREE.CylinderGeometry(0.08, 0.35, 2.8, 16, 1, true);
    const colMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.y = 1.4;
    group.add(col);

    return group;
  }

  private buildCelestialEnvironment() {
    const starCount = 2800;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 380 + Math.random() * 40;

      const sinPhi = Math.sin(phi);
      starPositions[i * 3] = r * sinPhi * Math.cos(theta);
      starPositions[i * 3 + 1] = r * sinPhi * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const spectralRand = Math.random();
      if (spectralRand > 0.85) {
        starColors[i * 3] = 0.65;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0;
      } else if (spectralRand > 0.4) {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.95;
        starColors[i * 3 + 2] = 1.0;
      } else if (spectralRand > 0.15) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.9;
        starColors[i * 3 + 2] = 0.7;
      } else {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.55;
        starColors[i * 3 + 2] = 0.45;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: false,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    this.celestialGroup.add(starfield);

    // Gas Giant
    const planetRadius = 45;
    const planetGeo = new THREE.SphereGeometry(planetRadius, 48, 48);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.15, '#334155');
      grad.addColorStop(0.28, '#0369a1');
      grad.addColorStop(0.45, '#0ea5e9');
      grad.addColorStop(0.55, '#38bdf8');
      grad.addColorStop(0.7, '#0284c7');
      grad.addColorStop(0.85, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < 40; i++) {
        const y = Math.random() * 256;
        const h = Math.random() * 6 + 1;
        ctx.fillRect(0, y, 512, h);
      }
    }

    const planetTex = new THREE.CanvasTexture(canvas);
    planetTex.colorSpace = THREE.SRGBColorSpace;
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    const gasGiant = new THREE.Mesh(planetGeo, planetMat);
    gasGiant.position.set(-140, -45, -180);
    gasGiant.rotation.z = 0.38;
    this.celestialGroup.add(gasGiant);

    // Planetary Rings
    const ringGeo = new THREE.RingGeometry(55, 95, 64);
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 256;
    ringCanvas.height = 1;
    const ringCtx = ringCanvas.getContext('2d');
    if (ringCtx) {
      const rGrad = ringCtx.createLinearGradient(0, 0, 256, 0);
      rGrad.addColorStop(0, 'rgba(186, 230, 253, 0.0)');
      rGrad.addColorStop(0.1, 'rgba(224, 242, 254, 0.6)');
      rGrad.addColorStop(0.3, 'rgba(147, 197, 253, 0.8)');
      rGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.0)');
      rGrad.addColorStop(0.55, 'rgba(186, 230, 253, 0.7)');
      rGrad.addColorStop(0.85, 'rgba(224, 242, 254, 0.4)');
      rGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ringCtx.fillStyle = rGrad;
      ringCtx.fillRect(0, 0, 256, 1);
    }
    const ringTex = new THREE.CanvasTexture(ringCanvas);
    ringTex.colorSpace = THREE.SRGBColorSpace;

    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
      metalness: 0.2,
      depthWrite: false,
    });
    const rings = new THREE.Mesh(ringGeo, ringMat);
    rings.position.copy(gasGiant.position);
    rings.rotation.x = Math.PI * 0.45;
    rings.rotation.y = -0.25;
    this.celestialGroup.add(rings);

    return { gasGiant, rings, starfield };
  }

  private buildRealisticAstronaut() {
    const astronaut = new THREE.Group();

    const suitFabricMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.72,
      metalness: 0.08,
    });

    const carbonTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.85,
    });

    const goldVisorMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
      metalness: 0.95,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 1.0,
    });

    // 1. Torso
    const torso = new THREE.Group();
    torso.position.y = 0.58;

    const chestGeo = new THREE.BoxGeometry(0.38, 0.42, 0.28);
    const chest = new THREE.Mesh(chestGeo, suitFabricMat);
    chest.castShadow = !this.isSoftwareGl;
    chest.receiveShadow = !this.isSoftwareGl;
    torso.add(chest);

    const harnessGeo = new THREE.BoxGeometry(0.26, 0.24, 0.07);
    const harness = new THREE.Mesh(harnessGeo, carbonTrimMat);
    harness.position.set(0, 0.04, 0.16);
    torso.add(harness);

    const patchGeo = new THREE.PlaneGeometry(0.08, 0.05);
    const patchMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.position.set(-0.08, 0.12, 0.201);
    torso.add(patch);

    const ledGeo = new THREE.CircleGeometry(0.02, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.08, 0.12, 0.201);
    torso.add(led);

    astronaut.add(torso);

    // 2. Backpack (PLSS)
    const backpack = new THREE.Group();
    backpack.position.set(0, 0.02, -0.22);

    const packGeo = new THREE.BoxGeometry(0.32, 0.44, 0.18);
    const pack = new THREE.Mesh(packGeo, suitFabricMat);
    pack.castShadow = !this.isSoftwareGl;
    backpack.add(pack);

    const tankGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.38, 12);
    const tankLeft = new THREE.Mesh(tankGeo, carbonTrimMat);
    tankLeft.position.set(-0.1, 0, -0.06);
    backpack.add(tankLeft);

    const tankRight = new THREE.Mesh(tankGeo, carbonTrimMat);
    tankRight.position.set(0.1, 0, -0.06);
    backpack.add(tankRight);

    const nozzleGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.06, 8);
    const leftNozzle = new THREE.Mesh(nozzleGeo, carbonTrimMat);
    leftNozzle.position.set(-0.16, 0.18, 0.04);
    leftNozzle.rotation.z = Math.PI / 4;
    backpack.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, carbonTrimMat);
    rightNozzle.position.set(0.16, 0.18, 0.04);
    rightNozzle.rotation.z = -Math.PI / 4;
    backpack.add(rightNozzle);

    torso.add(backpack);

    // 3. Head & Helmet
    const head = new THREE.Group();
    head.position.set(0, 0.34, 0.02);

    const helmetGeo = new THREE.SphereGeometry(0.21, 24, 24);
    const helmet = new THREE.Mesh(helmetGeo, suitFabricMat);
    helmet.castShadow = !this.isSoftwareGl;
    head.add(helmet);

    const visorGeo = new THREE.SphereGeometry(0.18, 24, 24, 0, Math.PI, 0, Math.PI * 0.7);
    const visor = new THREE.Mesh(visorGeo, goldVisorMat);
    visor.rotation.x = Math.PI * 0.15;
    visor.rotation.y = -Math.PI / 2;
    visor.position.set(0, 0.01, 0.05);
    head.add(visor);

    const lampGeo = new THREE.BoxGeometry(0.04, 0.04, 0.06);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });

    const leftLamp = new THREE.Mesh(lampGeo, lampMat);
    leftLamp.position.set(-0.18, 0.05, 0.1);
    head.add(leftLamp);

    const rightLamp = new THREE.Mesh(lampGeo, lampMat);
    rightLamp.position.set(0.18, 0.05, 0.1);
    head.add(rightLamp);

    const headlamp = new THREE.SpotLight(0xfff7ed, 1.8, 14, Math.PI * 0.28, 0.4);
    headlamp.position.set(0, 0.05, 0.2);
    headlamp.target.position.set(0, -1.5, 3.5);
    head.add(headlamp);
    head.add(headlamp.target);

    torso.add(head);

    // 4. Arms
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.24, 0.16, 0);
    const shoulderGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const leftShoulder = new THREE.Mesh(shoulderGeo, suitFabricMat);
    leftArm.add(leftShoulder);
    const armGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.26, 12);
    const leftUpperArm = new THREE.Mesh(armGeo, suitFabricMat);
    leftUpperArm.position.y = -0.14;
    leftArm.add(leftUpperArm);
    const gloveGeo = new THREE.BoxGeometry(0.09, 0.1, 0.08);
    const leftGlove = new THREE.Mesh(gloveGeo, carbonTrimMat);
    leftGlove.position.y = -0.3;
    leftArm.add(leftGlove);
    torso.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.24, 0.16, 0);
    const rightShoulder = new THREE.Mesh(shoulderGeo, suitFabricMat);
    rightArm.add(rightShoulder);
    const rightUpperArm = new THREE.Mesh(armGeo, suitFabricMat);
    rightUpperArm.position.y = -0.14;
    rightArm.add(rightUpperArm);
    const rightGlove = new THREE.Mesh(gloveGeo, carbonTrimMat);
    rightGlove.position.y = -0.3;
    rightArm.add(rightGlove);
    torso.add(rightArm);

    // 5. Legs
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.11, 0.36, 0);
    const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.36, 12);
    const leftThigh = new THREE.Mesh(legGeo, suitFabricMat);
    leftThigh.position.y = -0.18;
    leftLeg.add(leftThigh);
    const kneeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.06);
    const leftKnee = new THREE.Mesh(kneeGeo, carbonTrimMat);
    leftKnee.position.set(0, -0.22, 0.06);
    leftLeg.add(leftKnee);
    const bootGeo = new THREE.BoxGeometry(0.14, 0.1, 0.24);
    const leftBoot = new THREE.Mesh(bootGeo, carbonTrimMat);
    leftBoot.position.set(0, -0.36, 0.04);
    leftBoot.castShadow = !this.isSoftwareGl;
    leftLeg.add(leftBoot);
    astronaut.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.11, 0.36, 0);
    const rightThigh = new THREE.Mesh(legGeo, suitFabricMat);
    rightThigh.position.y = -0.18;
    rightLeg.add(rightThigh);
    const rightKnee = new THREE.Mesh(kneeGeo, carbonTrimMat);
    rightKnee.position.set(0, -0.22, 0.06);
    rightLeg.add(rightKnee);
    const rightBoot = new THREE.Mesh(bootGeo, carbonTrimMat);
    rightBoot.position.set(0, -0.36, 0.04);
    rightBoot.castShadow = !this.isSoftwareGl;
    rightLeg.add(rightBoot);
    astronaut.add(rightLeg);

    return {
      astronaut,
      torso,
      head,
      visor,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      backpack,
      headlamp,
    };
  }

  /**
   * Constructs the surrounding orbital station superstructure:
   * Photovoltaic solar array wings, high-gain parabolic comms dish,
   * gantry perimeter framework, and plasma pipelines.
   */
  private buildStationSuperstructure(width: number, height: number) {
    this.stationSuperstructure.clear();
    this.stationBeaconMats = [];

    const ox = (width - 1) / 2;
    const oz = (height - 1) / 2;

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25,
    });

    const solarCellMat = new THREE.MeshStandardMaterial({
      color: 0x071e3d,
      emissive: 0x0284c7,
      emissiveIntensity: 0.18,
      metalness: 0.95,
      roughness: 0.1,
    });

    // 1. Dual Giant Photovoltaic Solar Wings
    const buildSolarWing = (isLeft: boolean) => {
      const wing = new THREE.Group();
      const side = isLeft ? -1 : 1;
      const wingDist = ox + 4.2;
      wing.position.set(side * wingDist, -0.4, 0);

      // Main structural lattice boom arm
      const boomGeo = new THREE.CylinderGeometry(0.1, 0.12, 6.2, 8);
      const boom = new THREE.Mesh(boomGeo, titaniumMat);
      boom.rotation.z = Math.PI / 2;
      wing.add(boom);

      // 4 Solar panels per wing
      const panelPositions = [-2.2, -0.75, 0.75, 2.2];
      panelPositions.forEach((pz) => {
        const panelGeo = new THREE.BoxGeometry(2.4, 0.05, 1.25);
        const panel = new THREE.Mesh(panelGeo, solarCellMat);
        panel.position.set(side * 1.3, 0, pz);
        wing.add(panel);

        // Gold busbar trace
        const goldGeo = new THREE.PlaneGeometry(2.2, 0.04);
        const goldMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const gold = new THREE.Mesh(goldGeo, goldMat);
        gold.rotation.x = -Math.PI / 2;
        gold.position.set(side * 1.3, 0.03, pz);
        wing.add(gold);
      });

      return wing;
    };

    this.solarWingLeft = buildSolarWing(true);
    this.solarWingRight = buildSolarWing(false);
    this.stationSuperstructure.add(this.solarWingLeft);
    this.stationSuperstructure.add(this.solarWingRight);

    // 2. High-Gain Deep-Space Parabolic Antenna Dish
    const dishGroup = new THREE.Group();
    dishGroup.position.set(0, -0.5, -oz - 4.0);

    const pedestalGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.2, 16);
    const pedestal = new THREE.Mesh(pedestalGeo, titaniumMat);
    pedestal.position.y = 0.6;
    dishGroup.add(pedestal);

    const bowlGeo = new THREE.SphereGeometry(1.8, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42);
    const dishMesh = new THREE.Mesh(bowlGeo, titaniumMat);
    dishMesh.rotation.x = -Math.PI * 0.35;
    dishMesh.position.set(0, 1.6, 0);
    dishGroup.add(dishMesh);

    const hornGeo = new THREE.ConeGeometry(0.14, 0.4, 12);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 });
    const horn = new THREE.Mesh(hornGeo, hornMat);
    horn.rotation.x = Math.PI * 0.65;
    horn.position.set(0, 2.0, 0.8);
    dishGroup.add(horn);

    this.commsDishGroup = dishGroup;
    this.stationSuperstructure.add(dishGroup);

    // 3. Perimeter Gantry Beacon Strobes
    const beaconCoords = [
      [-ox - 1.4, -oz - 1.4],
      [ox + 1.4, -oz - 1.4],
      [-ox - 1.4, oz + 1.4],
      [ox + 1.4, oz + 1.4],
    ];

    beaconCoords.forEach(([bx, bz], i) => {
      const pylonGeo = new THREE.BoxGeometry(0.28, 1.6, 0.28);
      const pylon = new THREE.Mesh(pylonGeo, titaniumMat);
      pylon.position.set(bx, 0.6, bz);
      this.stationSuperstructure.add(pylon);

      const strobeGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const strobeMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xf59e0b : 0x06b6d4,
        transparent: true,
        opacity: 0.95,
      });
      this.stationBeaconMats.push(strobeMat);
      const strobe = new THREE.Mesh(strobeGeo, strobeMat);
      strobe.position.set(bx, 1.45, bz);
      this.stationSuperstructure.add(strobe);
    });

    // 4. Luminous Substructure Plasma Conduits
    const pipeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.8,
    });
    const pipeGeoX = new THREE.CylinderGeometry(0.045, 0.045, width + 2.0, 8);
    const pipe1 = new THREE.Mesh(pipeGeoX, pipeMat);
    pipe1.rotation.z = Math.PI / 2;
    pipe1.position.set(0, -0.3, -oz - 0.9);
    this.stationSuperstructure.add(pipe1);

    const pipe2 = new THREE.Mesh(pipeGeoX, pipeMat);
    pipe2.rotation.z = Math.PI / 2;
    pipe2.position.set(0, -0.3, oz + 0.9);
    this.stationSuperstructure.add(pipe2);
  }

  /**
   * Rebuilds the level with enlarged, prominent platform dimensions
   */
  public buildLevel(level: LevelDef, playerPos: Position, prevPos: Position | null) {
    this.levelWidth = level.width;
    this.levelHeight = level.height;
    this.currentPrevPos = prevPos;

    this.clearLevelObjects();
    this.buildStationSuperstructure(level.width, level.height);

    const ox = (level.width - 1) / 2;
    const oz = (level.height - 1) / 2;

    for (let y = 0; y < level.height; y++) {
      const row = level.rows[y] || '';
      for (let x = 0; x < level.width; x++) {
        const char = row[x] || '#';
        const wx = x - ox;
        const wz = y - oz;
        const tileKey = `${x},${y}`;

        if (char === '#') {
          const wallGroup = this.createSpacePylon(wx, wz);
          this.tileMeshes.set(tileKey, wallGroup);
          this.scene.add(wallGroup);
        } else {
          const floorGroup = this.createRealisticFloorTile(x, y, wx, wz);
          this.tileMeshes.set(tileKey, floorGroup);
          this.scene.add(floorGroup);

          if (char === 'E') {
            this.exitMesh = this.createRealisticAirlockModule(wx, wz);
            this.scene.add(this.exitMesh);
          } else if (char === 'K' || char === 'C' || char === 'M') {
            const color = char === 'K' ? 'gold' : char === 'C' ? 'cyan' : 'magenta';
            const keyMesh = this.createRealisticQuantumCore(wx, wz, color);
            this.keyMeshes.set(tileKey, keyMesh);
            this.scene.add(keyMesh);
          } else if (char === 'G' || char === 'D' || char === 'N') {
            const color = char === 'G' ? 'gold' : char === 'D' ? 'cyan' : 'magenta';
            const gateMesh = this.createRealisticMagneticFieldGate(wx, wz, color);
            this.gateMeshes.set(tileKey, gateMesh);
            this.scene.add(gateMesh);
          }
        }
      }
    }

    if (level.switches) {
      for (const sw of level.switches) {
        const wx = sw.x - ox;
        const wz = sw.y - oz;
        const swMesh = this.createRealisticEVAConsole(wx, wz, sw.label, sw.isActive);
        this.switchMeshes.set(sw.id, swMesh);
        this.scene.add(swMesh);
      }
    }

    if (level.teleporters) {
      for (const tp of level.teleporters) {
        const wx = tp.x - ox;
        const wz = tp.y - oz;
        const tpMesh = this.createRealisticWormholeEmitter(wx, wz, tp.remainingUses);
        this.teleporterMeshes.set(tp.id, tpMesh);
        this.scene.add(tpMesh);
      }
    }

    const px = playerPos.x - ox;
    const pz = playerPos.y - oz;
    this.playerVisualPos.set(px, 0, pz);
    this.playerTargetPos.set(px, 0, pz);
    this.astronautGroup.position.set(px, 0, pz);
    this.astronautShadow.position.set(px, 0.02, pz);
    this.cameraCurrentLookAt.set(px, 0.45, pz);
    this.cameraTargetLookAt.set(px, 0.45, pz);
    this.viewPanOffset.set(0, 0, 0);

    // ENLARGE MAP: Bring camera closer so map fills the screen heroically!
    const maxDim = Math.max(level.width, level.height);
    this.cameraOrbitRadius = Math.max(9.5, maxDim * 1.25);

    this.updateTileStates(prevPos);
  }

  private createRealisticFloorTile(x: number, y: number, wx: number, wz: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(wx, 0, wz);
    group.userData = { gridX: x, gridY: y, isWalkable: true, isCollapsed: false };

    const deckGeo = new THREE.BoxGeometry(0.96, 0.16, 0.96);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x1a2436,
      roughness: 0.38,
      metalness: 0.82,
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = -0.08;
    deck.receiveShadow = !this.isSoftwareGl;
    group.add(deck);

    const frameGeo = new THREE.BoxGeometry(0.98, 0.04, 0.98);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.9,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = -0.02;
    group.add(frame);

    const ledCornerGeo = new THREE.CircleGeometry(0.035, 12);
    const ledCornerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const offsets = [
      [-0.4, -0.4],
      [0.4, -0.4],
      [-0.4, 0.4],
      [0.4, 0.4],
    ];
    offsets.forEach(([cx, cz]) => {
      const ledM = new THREE.Mesh(ledCornerGeo, ledCornerMat);
      ledM.rotation.x = -Math.PI / 2;
      ledM.position.set(cx, 0.003, cz);
      group.add(ledM);
    });

    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.9,
    });
    const strutGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6);
    const strut1 = new THREE.Mesh(strutGeo, trussMat);
    strut1.position.set(-0.35, -0.38, -0.35);
    group.add(strut1);

    const strut2 = new THREE.Mesh(strutGeo, trussMat);
    strut2.position.set(0.35, -0.38, 0.35);
    group.add(strut2);

    const hazardRingGeo = new THREE.RingGeometry(0.26, 0.42, 24);
    const hazardRingMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const hazardRing = new THREE.Mesh(hazardRingGeo, hazardRingMat);
    hazardRing.rotation.x = -Math.PI / 2;
    hazardRing.position.y = 0.005;
    hazardRing.name = 'hazardRing';
    group.add(hazardRing);

    return group;
  }

  private createSpacePylon(wx: number, wz: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(wx, 0, wz);
    group.userData = { isWall: true };

    const colGeo = new THREE.BoxGeometry(0.96, 1.1, 0.96);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 0.65,
      metalness: 0.75,
    });
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.y = 0.55;
    col.castShadow = !this.isSoftwareGl;
    col.receiveShadow = !this.isSoftwareGl;
    group.add(col);

    const topGeo = new THREE.BoxGeometry(0.88, 0.08, 0.88);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.9,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 1.14;
    group.add(top);

    const stripeGeo = new THREE.PlaneGeometry(0.8, 0.12);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.5,
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.6, 0.485);
    group.add(stripe);

    return group;
  }

  private createRealisticAirlockModule(wx: number, wz: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(wx, 0, wz);

    const baseGeo = new THREE.CylinderGeometry(0.46, 0.48, 0.2, 24);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.88,
      roughness: 0.22,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    group.add(base);

    const hatchGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 24);
    const hatchMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.18,
    });
    const hatch = new THREE.Mesh(hatchGeo, hatchMat);
    hatch.position.y = 0.22;
    group.add(hatch);

    const wheelGeo = new THREE.TorusGeometry(0.14, 0.02, 12, 24);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.1,
    });
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.y = 0.27;
    group.add(wheel);

    const beaconGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 12, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 1.1;
    beacon.name = 'airlockBeacon';
    group.add(beacon);

    return group;
  }

  private createRealisticQuantumCore(
    wx: number,
    wz: number,
    color: 'gold' | 'cyan' | 'magenta'
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(wx, 0.55, wz);

    const hexColor = color === 'gold' ? 0xf59e0b : color === 'cyan' ? 0x06b6d4 : 0xec4899;

    const coreGeo = new THREE.OctahedronGeometry(0.22, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: hexColor,
      emissive: hexColor,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.9,
      clearcoat: 1.0,
      reflectivity: 1.0,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.name = 'keyCrystal';
    group.add(core);

    const ringGeo = new THREE.TorusGeometry(0.32, 0.018, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.1,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    ring.name = 'keyHalo';
    group.add(ring);

    return group;
  }

  private createRealisticMagneticFieldGate(
    wx: number,
    wz: number,
    color: 'gold' | 'cyan' | 'magenta'
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(wx, 0, wz);

    const hexColor = color === 'gold' ? 0xf59e0b : color === 'cyan' ? 0x06b6d4 : 0xec4899;

    const pylonGeo = new THREE.CylinderGeometry(0.09, 0.12, 1.2, 12);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25,
    });

    const leftPylon = new THREE.Mesh(pylonGeo, pylonMat);
    leftPylon.position.set(-0.44, 0.6, 0);
    group.add(leftPylon);

    const rightPylon = new THREE.Mesh(pylonGeo, pylonMat);
    rightPylon.position.set(0.44, 0.6, 0);
    group.add(rightPylon);

    const capGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const capMat = new THREE.MeshStandardMaterial({
      color: hexColor,
      emissive: hexColor,
      emissiveIntensity: 1.2,
    });
    const leftCap = new THREE.Mesh(capGeo, capMat);
    leftCap.position.set(-0.44, 1.22, 0);
    group.add(leftCap);

    const rightCap = new THREE.Mesh(capGeo, capMat);
    rightCap.position.set(0.44, 1.22, 0);
    group.add(rightCap);

    const plasmaGeo = new THREE.PlaneGeometry(0.86, 1.0);
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const plasma = new THREE.Mesh(plasmaGeo, plasmaMat);
    plasma.position.set(0, 0.6, 0);
    plasma.name = 'laserField';
    group.add(plasma);

    return group;
  }

  private createRealisticEVAConsole(
    wx: number,
    wz: number,
    label: string,
    isActive: boolean
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(wx, 0, wz);
    group.userData = { label };

    const baseGeo = new THREE.CylinderGeometry(0.36, 0.42, 0.1, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.28,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.05;
    group.add(base);

    const plateGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16);
    const plateMat = new THREE.MeshStandardMaterial({
      color: isActive ? 0x10b981 : 0xf59e0b,
      emissive: isActive ? 0x10b981 : 0xf59e0b,
      emissiveIntensity: 0.85,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = isActive ? 0.03 : 0.08;
    plate.name = 'switchCore';
    group.add(plate);

    return group;
  }

  private createRealisticWormholeEmitter(
    wx: number,
    wz: number,
    remainingUses: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(wx, 0, wz);

    const statorGeo = new THREE.CylinderGeometry(0.44, 0.46, 0.08, 24);
    const statorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.15,
    });
    const stator = new THREE.Mesh(statorGeo, statorMat);
    stator.position.y = 0.04;
    group.add(stator);

    const ringGeo = new THREE.RingGeometry(0.24, 0.38, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: remainingUses > 0 ? 0xa855f7 : 0x475569,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.085;
    ring.name = 'tpRing';
    group.add(ring);

    const wellGeo = new THREE.CircleGeometry(0.18, 24);
    const wellMat = new THREE.MeshBasicMaterial({
      color: remainingUses > 0 ? 0x38bdf8 : 0x1e293b,
      side: THREE.DoubleSide,
    });
    const well = new THREE.Mesh(wellGeo, wellMat);
    well.rotation.x = -Math.PI / 2;
    well.position.y = 0.086;
    well.name = 'tpWell';
    group.add(well);

    return group;
  }

  /**
   * Activates or deactivates the Quantum Blink (Teleport Anywhere) targeting reticle
   */
  public setBlinkMode(enabled: boolean) {
    this.isBlinkMode = enabled;
    this.blinkReticleGroup.visible = enabled;
    if (!enabled) {
      this.blinkTargetPos = null;
    }
  }

  public isBlinking(): boolean {
    return this.isBlinkMode;
  }

  /**
   * Triggers Teleport Anywhere with explosive quantum particle burst
   */
  public teleportPlayerTo(targetX: number, targetY: number, prevPos: Position | null) {
    const ox = (this.levelWidth - 1) / 2;
    const oz = (this.levelHeight - 1) / 2;

    const wx = targetX - ox;
    const wz = targetY - oz;

    // 1. Emit departure warp flash particles
    this.emitWarpBurst(this.playerVisualPos.x, this.playerVisualPos.y + 0.5, this.playerVisualPos.z);

    // 2. Instantly update astronaut visual position
    this.playerVisualPos.set(wx, 0, wz);
    this.playerTargetPos.set(wx, 0, wz);
    this.astronautGroup.position.set(wx, 0, wz);
    this.astronautShadow.position.set(wx, 0.02, wz);

    // 3. Emit arrival warp flash particles
    this.emitWarpBurst(wx, 0.5, wz);

    this.isBlinkMode = false;
    this.blinkReticleGroup.visible = false;
    this.updateTileStates(prevPos);
  }

  private emitWarpBurst(x: number, y: number, z: number) {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * (this.warpPositions.length / 3));
      this.warpPositions[idx * 3] = x;
      this.warpPositions[idx * 3 + 1] = y;
      this.warpPositions[idx * 3 + 2] = z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 2.5;
      this.warpVelocities[idx * 3] = Math.cos(angle) * speed;
      this.warpVelocities[idx * 3 + 1] = (Math.random() - 0.2) * 2.0;
      this.warpVelocities[idx * 3 + 2] = Math.sin(angle) * speed;

      this.warpLifetimes[idx] = 1.0;
    }
    this.warpFlashGeo.attributes.position.needsUpdate = true;
  }

  public updateTileStates(prevPos: Position | null) {
    this.currentPrevPos = prevPos;

    this.tileMeshes.forEach((group, key) => {
      if (group.userData.isWall) return;

      const [gx, gy] = key.split(',').map(Number);
      const isCollapsed = prevPos !== null && prevPos.x === gx && prevPos.y === gy;
      group.userData.isCollapsed = isCollapsed;

      const hazard = group.getObjectByName('hazardRing') as THREE.Mesh;
      const deck = group.children[0] as THREE.Mesh;

      if (isCollapsed) {
        group.position.y = -0.36;
        if (hazard) {
          (hazard.material as THREE.MeshBasicMaterial).opacity = 0.95;
        }
        if (deck && deck.material) {
          (deck.material as THREE.MeshStandardMaterial).color.setHex(0x381216);
          (deck.material as THREE.MeshStandardMaterial).emissive.setHex(0x991b1b);
          (deck.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
        }
      } else {
        group.position.y = 0;
        if (hazard) {
          (hazard.material as THREE.MeshBasicMaterial).opacity = 0;
        }
        if (deck && deck.material) {
          (deck.material as THREE.MeshStandardMaterial).color.setHex(0x1a2436);
          (deck.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          (deck.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        }
      }
    });
  }

  public removeKeyMesh(x: number, y: number) {
    const key = `${x},${y}`;
    const mesh = this.keyMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      this.keyMeshes.delete(key);
    }
  }

  public openGateMesh(x: number, y: number) {
    const key = `${x},${y}`;
    const mesh = this.gateMeshes.get(key);
    if (mesh) {
      const laser = mesh.getObjectByName('laserField') as THREE.Mesh;
      if (laser) {
        (laser.material as THREE.MeshBasicMaterial).opacity = 0.05;
      }
    }
  }

  public setSwitchActive(switchId: string, isActive: boolean) {
    const swMesh = this.switchMeshes.get(switchId);
    if (swMesh) {
      const core = swMesh.getObjectByName('switchCore') as THREE.Mesh;
      if (core) {
        core.position.y = isActive ? 0.03 : 0.08;
        const mat = core.material as THREE.MeshStandardMaterial;
        mat.color.setHex(isActive ? 0x10b981 : 0xf59e0b);
        mat.emissive.setHex(isActive ? 0x10b981 : 0xf59e0b);
      }
    }
  }

  public setTeleporterUses(teleporterId: string, remainingUses: number) {
    const tpMesh = this.teleporterMeshes.get(teleporterId);
    if (tpMesh) {
      const ring = tpMesh.getObjectByName('tpRing') as THREE.Mesh;
      if (ring) {
        (ring.material as THREE.MeshBasicMaterial).color.setHex(
          remainingUses > 0 ? 0xa855f7 : 0x475569
        );
      }
    }
  }

  private emitRCSPuff(x: number, y: number, z: number, dirX: number, dirZ: number) {
    for (let i = 0; i < 8; i++) {
      const idx = Math.floor(Math.random() * (this.rcsPositions.length / 3));
      this.rcsPositions[idx * 3] = x + (Math.random() - 0.5) * 0.1;
      this.rcsPositions[idx * 3 + 1] = y + 0.6 + (Math.random() - 0.5) * 0.1;
      this.rcsPositions[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.1;

      this.rcsVelocities[idx * 3] = -dirX * 1.5 + (Math.random() - 0.5) * 0.8;
      this.rcsVelocities[idx * 3 + 1] = (Math.random() - 0.5) * 0.4;
      this.rcsVelocities[idx * 3 + 2] = -dirZ * 1.5 + (Math.random() - 0.5) * 0.8;

      this.rcsLifetimes[idx] = 1.0;
    }
    this.rcsGeo.attributes.position.needsUpdate = true;
  }

  public movePlayerTo(x: number, y: number, prevPos: Position | null) {
    const ox = (this.levelWidth - 1) / 2;
    const oz = (this.levelHeight - 1) / 2;

    const wx = x - ox;
    const wz = y - oz;

    const dx = wx - this.playerVisualPos.x;
    const dz = wz - this.playerVisualPos.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      this.playerTargetAngle = Math.atan2(dx, dz);
      this.emitRCSPuff(this.playerVisualPos.x, this.playerVisualPos.y, this.playerVisualPos.z, dx, dz);
    }

    this.playerTargetPos.set(wx, 0, wz);
    this.isMoving = true;
    this.updateTileStates(prevPos);
  }

  public snapPlayerTo(x: number, y: number, prevPos: Position | null) {
    const ox = (this.levelWidth - 1) / 2;
    const oz = (this.levelHeight - 1) / 2;

    const wx = x - ox;
    const wz = y - oz;

    this.playerVisualPos.set(wx, 0, wz);
    this.playerTargetPos.set(wx, 0, wz);
    this.astronautGroup.position.set(wx, 0, wz);
    this.astronautShadow.position.set(wx, 0.02, wz);
    this.isMoving = false;

    this.updateTileStates(prevPos);
  }

  public getCameraAzimuth(): number {
    return this.cameraOrbitAzimuth;
  }

  public zoomIn() {
    this.cameraOrbitRadius = Math.max(6.0, this.cameraOrbitRadius - 1.8);
  }

  public zoomOut() {
    this.cameraOrbitRadius = Math.min(26.0, this.cameraOrbitRadius + 1.8);
  }

  /**
   * Smoothly pans the camera view across the arena relative to current camera heading.
   * "The arrow keys should move the view accordingly, forward, backward, right, and left, and function as described."
   */
  public panView(direction: 'forward' | 'backward' | 'left' | 'right', distance: number = 1.4) {
    // Camera is looking along (-sin(azimuth), -cos(azimuth))
    const fwdX = -Math.sin(this.cameraOrbitAzimuth);
    const fwdZ = -Math.cos(this.cameraOrbitAzimuth);
    const rightX = -fwdZ;
    const rightZ = fwdX;

    if (direction === 'forward') {
      this.viewPanOffset.x += fwdX * distance;
      this.viewPanOffset.z += fwdZ * distance;
    } else if (direction === 'backward') {
      this.viewPanOffset.x -= fwdX * distance;
      this.viewPanOffset.z -= fwdZ * distance;
    } else if (direction === 'right') {
      this.viewPanOffset.x += rightX * distance;
      this.viewPanOffset.z += rightZ * distance;
    } else if (direction === 'left') {
      this.viewPanOffset.x -= rightX * distance;
      this.viewPanOffset.z -= rightZ * distance;
    }

    // Keep view pan bounded so player never loses track of the arena
    const maxPan = Math.max(this.levelWidth, this.levelHeight) * 0.9;
    this.viewPanOffset.x = Math.max(-maxPan, Math.min(maxPan, this.viewPanOffset.x));
    this.viewPanOffset.z = Math.max(-maxPan, Math.min(maxPan, this.viewPanOffset.z));
  }

  /**
   * Snaps the camera view focus back onto Commander Vance.
   */
  public resetViewPan() {
    this.viewPanOffset.set(0, 0, 0);
  }

  /**
   * Smoothly rotates the orbital camera around the focus target.
   */
  public orbitView(dAzimuth: number, dElevation: number = 0) {
    this.cameraOrbitAzimuth += dAzimuth;
    this.cameraOrbitElevation = Math.max(0.2, Math.min(1.42, this.cameraOrbitElevation + dElevation));
    if (this.callbacks.onCameraChange) {
      this.callbacks.onCameraChange(this.cameraOrbitAzimuth);
    }
    if (!this.isMoving) {
      this.playerTargetAngle = -this.cameraOrbitAzimuth + Math.PI;
    }
  }

  private clearLevelObjects() {
    this.tileMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.tileMeshes.clear();

    this.keyMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.keyMeshes.clear();

    this.gateMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.gateMeshes.clear();

    this.switchMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.switchMeshes.clear();

    this.teleporterMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.teleporterMeshes.clear();

    if (this.exitMesh) {
      this.scene.remove(this.exitMesh);
      this.exitMesh = null;
    }

    this.stationSuperstructure.clear();
    this.stationBeaconMats = [];
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.isDraggingCamera = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.dragDistance = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDraggingCamera) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.dragDistance += Math.abs(dx) + Math.abs(dy);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        // Orbit camera around center with intuitive direct-manipulation responsiveness
        this.cameraOrbitAzimuth -= dx * 0.0055;
        this.cameraOrbitElevation = Math.max(
          0.2,
          Math.min(1.42, this.cameraOrbitElevation - dy * 0.0055)
        );

        // Notify callback of camera change
        if (this.callbacks.onCameraChange) {
          this.callbacks.onCameraChange(this.cameraOrbitAzimuth);
        }

        // DYNAMIC CHARACTER ALIGNMENT: When changing sides, astronaut turns smoothly to face view
        if (!this.isMoving) {
          this.playerTargetAngle = -this.cameraOrbitAzimuth + Math.PI;
        }
      }

      // Update Quantum Blink Reticle position on hovered tile
      if (this.isBlinkMode) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        for (const hit of intersects) {
          let parent: THREE.Object3D | null = hit.object;
          while (parent && parent !== this.scene) {
            if (parent.userData && parent.userData.isWalkable && parent.userData.gridX !== undefined) {
              const ox = (this.levelWidth - 1) / 2;
              const oz = (this.levelHeight - 1) / 2;
              this.blinkReticleGroup.position.set(parent.userData.gridX - ox, 0, parent.userData.gridY - oz);
              this.blinkReticleGroup.visible = true;
              this.blinkTargetPos = { x: parent.userData.gridX, y: parent.userData.gridY };
              return;
            }
            parent = parent.parent;
          }
        }
      }
    };

    const onPointerUp = () => {
      this.isDraggingCamera = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.cameraOrbitRadius = Math.max(6.0, Math.min(26.0, this.cameraOrbitRadius + e.deltaY * 0.02));
    };

    const onClick = (e: MouseEvent) => {
      // If user was dragging significantly, ignore click to avoid accidental move
      if (this.dragDistance > 8) return;

      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      for (const hit of intersects) {
        let parent: THREE.Object3D | null = hit.object;
        while (parent && parent !== this.scene) {
          if (parent.userData && parent.userData.isWalkable && parent.userData.gridX !== undefined) {
            const gx = parent.userData.gridX;
            const gy = parent.userData.gridY;

            if (this.isBlinkMode && this.callbacks.onBlinkTargetSelect) {
              this.callbacks.onBlinkTargetSelect(gx, gy);
              return;
            }

            this.callbacks.onTileClick(gx, gy);
            return;
          }
          parent = parent.parent;
        }
      }
    };

    const onResize = () => {
      if (!this.container || this.isDisposed) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    this.domCleanup = () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
    };
  }

  public resetCameraView(isometric: boolean = true) {
    if (isometric) {
      this.cameraOrbitAzimuth = Math.PI * 0.28;
      this.cameraOrbitElevation = 0.82;
      this.cameraOrbitRadius = Math.max(8.5, Math.max(this.levelWidth, this.levelHeight) * 1.35);
    } else {
      this.cameraOrbitAzimuth = 0;
      this.cameraOrbitElevation = 1.48;
      this.cameraOrbitRadius = Math.max(9.0, Math.max(this.levelWidth, this.levelHeight) * 1.45);
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const time = this.clock.getElapsedTime();

      // 1. Astronaut Locomotion Interpolation
      const distToTarget = this.playerVisualPos.distanceTo(this.playerTargetPos);
      if (distToTarget > 0.02) {
        this.isMoving = true;
        const dampFactor = 1 - Math.exp(-9 * dt);
        this.playerVisualPos.lerp(this.playerTargetPos, dampFactor);
        this.walkCyclePhase += dt * 8.5;
      } else {
        this.isMoving = false;
        this.walkCyclePhase = 0;
      }

      // Smooth facing angle
      let diffAngle = this.playerTargetAngle - this.playerFacingAngle;
      while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
      while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
      this.playerFacingAngle += diffAngle * (1 - Math.exp(-12 * dt));

      // 2. Anatomical Human Space-Walking Kinematics
      const legAngle = Math.sin(this.walkCyclePhase) * 0.42;
      const armAngle = -Math.sin(this.walkCyclePhase) * 0.35;
      const torsoBob = Math.abs(Math.sin(this.walkCyclePhase)) * 0.04;
      const idleHover = Math.sin(time * 2.2) * 0.015;

      this.astronautLeftLeg.rotation.x = this.isMoving ? legAngle : 0;
      this.astronautRightLeg.rotation.x = this.isMoving ? -legAngle : 0;
      this.astronautLeftArm.rotation.x = this.isMoving ? armAngle : 0;
      this.astronautRightArm.rotation.x = this.isMoving ? -armAngle : 0;

      this.astronautTorso.rotation.x = this.isMoving ? 0.08 : 0;
      this.astronautTorso.position.y = 0.58 + (this.isMoving ? torsoBob : idleHover);

      this.astronautGroup.position.set(
        this.playerVisualPos.x,
        this.playerVisualPos.y,
        this.playerVisualPos.z
      );
      this.astronautGroup.rotation.y = this.playerFacingAngle;

      this.astronautShadow.position.set(this.playerVisualPos.x, 0.02, this.playerVisualPos.z);
      const shadowScale = 1 - (this.isMoving ? torsoBob : idleHover) * 1.5;
      this.astronautShadow.scale.set(shadowScale, shadowScale, 1);

      // Animate Quantum Blink Reticle
      if (this.isBlinkMode && this.blinkReticleGroup.visible) {
        const ring = this.blinkReticleGroup.getObjectByName('reticleRing');
        if (ring) {
          ring.rotation.z += dt * 3.5;
        }
      }

      // 3. Update Particles
      for (let i = 0; i < this.rcsLifetimes.length; i++) {
        if (this.rcsLifetimes[i] > 0) {
          this.rcsLifetimes[i] -= dt * 2.5;
          this.rcsPositions[i * 3] += this.rcsVelocities[i * 3] * dt;
          this.rcsPositions[i * 3 + 1] += this.rcsVelocities[i * 3 + 1] * dt;
          this.rcsPositions[i * 3 + 2] += this.rcsVelocities[i * 3 + 2] * dt;
        } else {
          this.rcsPositions[i * 3] = 9999;
        }
      }
      this.rcsGeo.attributes.position.needsUpdate = true;

      // Update Warp Flash Particles
      for (let i = 0; i < this.warpLifetimes.length; i++) {
        if (this.warpLifetimes[i] > 0) {
          this.warpLifetimes[i] -= dt * 2.2;
          this.warpPositions[i * 3] += this.warpVelocities[i * 3] * dt;
          this.warpPositions[i * 3 + 1] += this.warpVelocities[i * 3 + 1] * dt;
          this.warpPositions[i * 3 + 2] += this.warpVelocities[i * 3 + 2] * dt;
        } else {
          this.warpPositions[i * 3] = 9999;
        }
      }
      this.warpFlashGeo.attributes.position.needsUpdate = true;

      // 4. Distant Planet Rotation
      if (this.gasGiantMesh) {
        this.gasGiantMesh.rotation.y += dt * 0.005;
      }

      // Animate Objects
      this.keyMeshes.forEach((mesh) => {
        const crystal = mesh.getObjectByName('keyCrystal');
        if (crystal) {
          crystal.rotation.y += dt * 1.5;
          crystal.position.y = Math.sin(time * 2.8) * 0.05;
        }
        const halo = mesh.getObjectByName('keyHalo');
        if (halo) {
          halo.rotation.z += dt * 2.0;
        }
      });

      this.teleporterMeshes.forEach((mesh) => {
        const ring = mesh.getObjectByName('tpRing');
        if (ring) {
          ring.rotation.z -= dt * 2.5;
        }
      });

      // Animate Orbital Superstructure
      if (this.commsDishGroup) {
        this.commsDishGroup.rotation.y += dt * 0.04;
      }
      if (this.solarWingLeft) {
        this.solarWingLeft.rotation.z += dt * 0.015;
      }
      if (this.solarWingRight) {
        this.solarWingRight.rotation.z += dt * 0.015;
      }
      const strobeAlpha = 0.45 + Math.sin(time * 5.0) * 0.45;
      this.stationBeaconMats.forEach((mat) => {
        mat.opacity = strobeAlpha;
      });

      // 5. Camera Tracking with Zero Parallax Drift
      this.cameraTargetLookAt.set(
        this.playerVisualPos.x + this.viewPanOffset.x,
        0.45,
        this.playerVisualPos.z + this.viewPanOffset.z
      );

      const camX =
        this.cameraTargetLookAt.x +
        this.cameraOrbitRadius * Math.sin(this.cameraOrbitAzimuth) * Math.cos(this.cameraOrbitElevation);
      const camY =
        this.cameraTargetLookAt.y +
        this.cameraOrbitRadius * Math.sin(this.cameraOrbitElevation);
      const camZ =
        this.cameraTargetLookAt.z +
        this.cameraOrbitRadius * Math.cos(this.cameraOrbitAzimuth) * Math.cos(this.cameraOrbitElevation);

      _targetCameraPos.set(camX, camY, camZ);

      // Synchronous exponential damping for BOTH position and lookAt point:
      // Completely eliminates lateral shift / rightward skewing during camera angle changes!
      const camDamp = 1 - Math.exp(-9 * dt);
      this.camera.position.lerp(_targetCameraPos, camDamp);
      this.cameraCurrentLookAt.lerp(this.cameraTargetLookAt, camDamp);
      this.camera.lookAt(this.cameraCurrentLookAt);

      // 6. Render
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl) {
      this.animationFrameId = window.setTimeout(cb, 40);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animationFrameId = window.setTimeout(poll, 6);
      } else {
        if (sync) gl.deleteSync(sync);
        this.animationFrameId = window.setTimeout(cb, 40);
      }
    };
    this.animationFrameId = window.setTimeout(poll, 6);
  }

  public dispose() {
    this.isDisposed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      clearTimeout(this.animationFrameId);
    }
    if (this.domCleanup) {
      this.domCleanup();
      this.domCleanup = null;
    }
    this.clearLevelObjects();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
