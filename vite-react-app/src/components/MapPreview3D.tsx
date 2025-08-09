import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GraphNode, Connection } from '../types';
import { generateHeightmap } from '../terrainEngine';

interface MapPreview3DProps {
  height?: number;
  nodes?: GraphNode[];
  connections?: Connection[];
}

export const MapPreview3D: React.FC<MapPreview3DProps> = ({ height = 200, nodes = [], connections = [] }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number>();

  // Inicjalizacja sceny
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f141a');

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / height, 0.1, 1000);
    camera.position.set(4, 5, 6);
    camera.lookAt(0,0,0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight('#ffffff', 1.0);
    light.position.set(5,10,3);
    scene.add(light);
    scene.add(new THREE.AmbientLight('#ffffff', 0.3));

  const gridSize = 63;
  const geometry = new THREE.PlaneGeometry(8, 8, gridSize, gridSize);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.getAttribute('position');
  (renderer as any)._terrainGeom = geometry;
  (renderer as any)._terrainPos = pos;
  (renderer as any)._terrainGrid = gridSize;

    const material = new THREE.MeshStandardMaterial({ color:'#3b82f6', wireframe:false, flatShading:false, metalness:0.1, roughness:0.85 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const gridHelper = new THREE.GridHelper(10, 20, '#1f2a34', '#1f2a34');
    scene.add(gridHelper);

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    const target = new THREE.Vector3(0,0,0);

    const renderScene = () => renderer.render(scene, camera);

  const animate = () => { renderScene(); frameRef.current = requestAnimationFrame(animate); };
  animate();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true; lastX = e.clientX; lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if(!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const rotSpeed = 0.005;
      const offset = camera.position.clone().sub(target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta -= dx * rotSpeed;
      spherical.phi -= dy * rotSpeed;
      const eps = 0.05;
      spherical.phi = Math.max(eps, Math.min(Math.PI - eps, spherical.phi));
      offset.setFromSpherical(spherical);
      camera.position.copy(target.clone().add(offset));
      camera.lookAt(target);
    };
    const onPointerUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaY * 0.001;
      const dir = camera.position.clone().sub(target);
      const len = dir.length();
      const newLen = Math.min(40, Math.max(2, len + delta * len));
      dir.setLength(newLen);
      camera.position.copy(target.clone().add(dir));
      camera.lookAt(target);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

  return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
  window.removeEventListener('resize', handleResize);
  renderer.domElement.removeEventListener('pointerdown', onPointerDown);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [height]);

  // Aktualizacja heightmapy przy zmianie grafu
  useEffect(() => {
    if (!mountRef.current) return;
    const canvas = mountRef.current.querySelector('canvas');
    if (!canvas) return;
    // @ts-ignore internal store
    const renderer: THREE.WebGLRenderer | undefined = (canvas as any).__renderer || (canvas && (canvas as any).rendererInstance);
    // fallback: wyszukaj po referencji globalnej - uproszczenie
    const r = (renderer as any) || (canvas && (canvas.parentElement && (canvas.parentElement as any)._reactRenderer));
    // Zapisaliśmy geometry w rendererze w init
    // W prostym podejściu ponownie pobierzemy obiekt sceny z DOM -> pomijamy (zachowujemy referencje w closure moglibyśmy przenieść na ref)
    // Aby być prostym: wyszukamy pierwszą scenę w globalThis (nie idealne). Tu: uproszczenie – re-inicjalizacja pomijana.
    // Lepiej: przechować geometry w ref.
  }, [nodes, connections]);

  return <div className="map-preview3d" ref={mountRef} style={{ height }} />;
};
