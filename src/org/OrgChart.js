import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { architectureImage } from '../data/organization.js';
import { createLabelTexture } from './labels.js';

const PLANE_SIZE = 10;
const HALF = PLANE_SIZE / 2;

const RING_VERTEX = `
  varying vec2 vPos;
  void main() {
    vPos = position.xy / ${HALF.toFixed(4)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAGMENT = `
  uniform float uTime;
  uniform float uRadii[4];
  uniform float uAlpha;
  varying vec2 vPos;

  void main() {
    float r = length(vPos);
    float glow = 0.0;
    float spark = 0.0;
    for (int i = 0; i < 4; i++) {
      float radius = uRadii[i];
      if (radius < 0.05) continue;
      float band = exp(-pow((r - radius) / 0.008, 2.0));
      glow += band;
      float ang = atan(vPos.y, vPos.x);
      float travel = fract(uTime * (0.045 + float(i) * 0.012));
      float delta = abs(fract(ang / 6.2831853 - travel) );
      delta = min(delta, 1.0 - delta);
      spark += band * smoothstep(0.08, 0.0, delta);
    }
    vec3 cool = vec3(0.62, 0.82, 0.96);
    vec3 warm = vec3(0.98, 0.86, 0.58);
    vec3 color = mix(cool, warm, clamp(spark, 0.0, 1.0));
    float alpha = clamp((glow * 0.55 + spark) * uAlpha, 0.0, 1.0);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function preferredLabelHeight(node) {
  if (node.radius === 0) return 0.72;
  if (node.ring === 'exec') return 0.38;
  if (node.ring === 'center') return 0.32;
  return 0.26;
}

function minChord(nodes, radius) {
  if (radius === 0 || nodes.length <= 1) return Infinity;
  const angles = nodes.map((node) => node.angle).sort((a, b) => a - b);
  let gap = Infinity;
  for (let i = 0; i < angles.length; i += 1) {
    const current = angles[i];
    const next = angles[(i + 1) % angles.length];
    const delta = i === angles.length - 1 ? next + Math.PI * 2 - current : next - current;
    gap = Math.min(gap, delta);
  }
  return 2 * radius * HALF * Math.sin(gap / 2);
}

export class OrgChart {
  constructor(container, { nodes, onSelect }) {
    this.container = container;
    this.nodes = nodes;
    this.onSelect = onSelect;
    this.selectedId = null;
    this.hoveredId = null;
    this.query = '';
    this.focusedRing = null;
    this.disposed = false;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.pickables = [];
    this.items = new Map();
    this.links = [];
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.drag = null;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x05080e, 1);
    this.renderer.domElement.className = 'org-canvas';
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = Math.PI / 2 - 0.42;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.12;
    this.controls.minAzimuthAngle = -0.55;
    this.controls.maxAzimuthAngle = 0.55;
    this.controls.target.set(0, 0, 0);

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.ready = this.build();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.bindPointer();
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  async build() {
    await document.fonts.ready;
    if (this.disposed) return;
    this.addBackground();
    this.addRingGlow();
    this.addLinks();
    this.addNodes();
    this.applyState();
  }

  addBackground() {
    const geometry = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE);
    const material = new THREE.MeshBasicMaterial({ color: 0x07111c });
    this.background = new THREE.Mesh(geometry, material);
    this.group.add(this.background);

    const loader = new THREE.TextureLoader();
    loader.load(
      architectureImage,
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
        this.backgroundTexture = texture;
        this.container.dispatchEvent(new CustomEvent('org-background', { detail: { ok: true } }));
      },
      undefined,
      () => {
        this.container.dispatchEvent(new CustomEvent('org-background', { detail: { ok: false } }));
      },
    );
  }

  addRingGlow() {
    const radii = [0, 0, 0, 0];
    this.nodes.forEach((node) => {
      const index = ['exec', 'center', 'dept'].indexOf(node.ring);
      if (index >= 0) radii[index] = node.radius;
    });
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uRadii: { value: radii },
        uAlpha: { value: 1 },
      },
      vertexShader: RING_VERTEX,
      fragmentShader: RING_FRAGMENT,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE), material);
    mesh.position.z = 0.02;
    mesh.renderOrder = 1;
    this.group.add(mesh);
    this.ringMaterial = material;
  }

  addLinks() {
    const byId = new Map(this.nodes.map((node) => [node.id, node]));
    for (const node of this.nodes) {
      const parent = byId.get(node.parent);
      if (!parent) continue;
      const start = new THREE.Vector3(parent.x * HALF, parent.y * HALF, 0.05);
      const end = new THREE.Vector3(node.x * HALF, node.y * HALF, 0.05);
      const control = start.clone().add(end).multiplyScalar(0.5);
      control.z = 0.16;
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.012, 5, false),
        new THREE.MeshBasicMaterial({
          color: 0x9fd0ea,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        }),
      );
      mesh.renderOrder = 2;
      mesh.userData = { parentId: parent.id, childId: node.id };
      this.group.add(mesh);
      this.links.push(mesh);
    }
  }

  addNodes() {
    const byRing = new Map();
    for (const node of this.nodes) {
      const list = byRing.get(node.ring) ?? [];
      list.push(node);
      byRing.set(node.ring, list);
    }

    for (const node of this.nodes) {
      const chord = minChord(byRing.get(node.ring) ?? [], node.radius);
      let height = preferredLabelHeight(node);
      const textureInfo = createLabelTexture(node.name, 'normal', { circular: node.radius === 0 });
      const widthFromHeight = height * textureInfo.aspect;
      if (Number.isFinite(chord) && widthFromHeight > chord * 0.92) {
        height = (chord * 0.92) / textureInfo.aspect;
      }
      const texture = new THREE.CanvasTexture(textureInfo.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(material);
      const width = height * textureInfo.aspect;
      sprite.scale.set(width, height, 1);
      sprite.position.set(node.x * HALF, node.y * HALF, 0.12);
      sprite.renderOrder = 4;
      sprite.raycast = () => {};
      this.group.add(sprite);

      const hit = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 24),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.position.copy(sprite.position);
      hit.scale.set(Math.max(width, 0.42), Math.max(height, 0.28), 1);
      hit.userData.nodeId = node.id;
      hit.renderOrder = 5;
      this.group.add(hit);
      this.pickables.push(hit);

      this.items.set(node.id, {
        node,
        sprite,
        material,
        texture,
        width,
        height,
        state: 'normal',
        aspect: textureInfo.aspect,
      });
    }
  }

  setQuery(query) {
    this.query = query.trim().toLowerCase();
    this.applyState();
  }

  setFocusedRing(ringId) {
    this.focusedRing = this.focusedRing === ringId ? null : ringId;
    this.selectedId = null;
    this.applyState();
    this.emitSelection();
  }

  select(id) {
    this.selectedId = id;
    this.focusedRing = null;
    this.applyState();
    this.emitSelection();
  }

  emitSelection() {
    const node = this.nodes.find((item) => item.id === this.selectedId) ?? null;
    this.onSelect?.({
      node,
      ringId: this.focusedRing,
      relatedIds: node ? this.relatedIds(node.id) : [],
    });
  }

  relatedIds(id) {
    const byId = new Map(this.nodes.map((node) => [node.id, node]));
    const ids = new Set([id]);
    let current = byId.get(id);
    while (current?.parent) {
      ids.add(current.parent);
      current = byId.get(current.parent);
    }
    for (const node of this.nodes) {
      if (node.parent === id) ids.add(node.id);
    }
    return ids;
  }

  focusIds() {
    if (this.selectedId) return this.relatedIds(this.selectedId);
    if (this.focusedRing) {
      return new Set(this.nodes.filter((node) => node.ring === this.focusedRing).map((node) => node.id));
    }
    if (this.query) {
      const matched = this.nodes.filter((node) => this.matches(node));
      const ids = new Set();
      for (const node of matched) {
        this.relatedIds(node.id).forEach((id) => ids.add(id));
        ids.add(node.id);
      }
      return ids;
    }
    return null;
  }

  matches(node) {
    const haystack = `${node.name} ${node.duty} ${node.ringName}`.toLowerCase();
    return haystack.includes(this.query);
  }

  stateFor(node, focus) {
    if (node.id === this.hoveredId && (!focus || focus.has(node.id))) return 'hover';
    if (node.id === this.selectedId) return 'active';
    if (!focus) return 'normal';
    if (!focus.has(node.id)) return 'dim';
    if (this.focusedRing && node.ring === this.focusedRing) return 'active';
    return 'related';
  }

  applyState() {
    const focus = this.focusIds();
    for (const item of this.items.values()) {
      const next = this.stateFor(item.node, focus);
      if (next !== item.state) {
        this.redraw(item, next);
      }
      const emphasized = next === 'active' || next === 'hover';
      item.targetScale = emphasized ? 1.08 : 1;
    }
    for (const link of this.links) {
      const active = !focus || (focus.has(link.userData.parentId) && focus.has(link.userData.childId));
      const selected = this.selectedId && (link.userData.parentId === this.selectedId || link.userData.childId === this.selectedId);
      link.material.opacity = !active ? 0.05 : selected ? 0.95 : 0.38;
      link.material.color.set(selected ? 0xf2d48a : 0x9fd0ea);
    }
  }

  redraw(item, state) {
    const info = createLabelTexture(item.node.name, state, { circular: item.node.radius === 0 });
    item.texture.image = info.canvas;
    item.texture.needsUpdate = true;
    item.aspect = info.aspect;
    item.state = state;
    const height = item.height;
    item.sprite.scale.set(height * info.aspect * (item.targetScale || 1), height * (item.targetScale || 1), 1);
  }

  bindPointer() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (event) => {
      this.drag = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointerup', (event) => {
      if (!this.drag) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      this.drag = null;
      if (dx * dx + dy * dy > 16) return;
      const hit = this.pick(event);
      this.select(hit ? hit.userData.nodeId : null);
    });
    canvas.addEventListener('pointermove', (event) => {
      const hit = this.pick(event);
      const next = hit ? hit.userData.nodeId : null;
      canvas.style.cursor = next ? 'pointer' : 'grab';
      if (next !== this.hoveredId) {
        this.hoveredId = next;
        this.applyState();
      }
    });
    canvas.addEventListener('pointerleave', () => {
      if (this.hoveredId) {
        this.hoveredId = null;
        this.applyState();
      }
    });
  }

  pick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    return hits[0]?.object ?? null;
  }

  resize() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.fitCamera();
  }

  fitCamera() {
    const padding = 1.16;
    const half = HALF * padding;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const distanceForHeight = half / Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const distanceForWidth = half / Math.tan(hFov / 2);
    const distance = Math.max(distanceForHeight, distanceForWidth);
    this.camera.position.set(0, -distance * 0.08, distance);
    this.camera.lookAt(0, 0, 0);
    this.controls.minDistance = distance * 0.72;
    this.controls.maxDistance = distance * 1.65;
    this.controls.update();
  }

  frame() {
    if (this.disposed) return;
    const delta = this.clock.getDelta();
    if (!this.reduceMotion) this.elapsed += delta;
    if (this.ringMaterial) this.ringMaterial.uniforms.uTime.value = this.elapsed;
    for (const item of this.items.values()) {
      const target = item.height * (item.targetScale || 1);
      const nextHeight = THREE.MathUtils.lerp(item.sprite.scale.y, target, 0.18);
      item.sprite.scale.set(nextHeight * item.aspect, nextHeight, 1);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    this.backgroundTexture?.dispose();
    this.scene.traverse((object) => {
      object.geometry?.dispose?.();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          material.map?.dispose?.();
          material.dispose?.();
        });
      }
    });
    this.renderer.domElement.remove();
  }
}
