import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function HomeScene({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const textureLoader = new THREE.TextureLoader();
    
    // Sizes
    const getParentSize = () => ({
      width: canvas.parentElement?.clientWidth || 300,
      height: canvas.parentElement?.clientHeight || 200
    });
    const sizes = getParentSize();

    // Base camera - Zoomed out slightly more for 360 rotation
    const camera = new THREE.PerspectiveCamera(12, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(12, 8, 24);
    scene.add(camera);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enableZoom = false; // Disable zoom for the header version
    controls.enablePan = false; // Disable pan for the header version
    
    // Auto Rotate settings
    controls.autoRotate = false;
    
    // Zoom constraints
    controls.minDistance = 25;
    controls.maxDistance = 60;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.2;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Modern Three.js uses outputColorSpace
    if ('outputColorSpace' in renderer) {
      (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    } else {
      (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
    }

    // Materials & Texture Optimization
    const bakedTexture = textureLoader.load('https://rawcdn.githack.com/ricardoolivaalonso/ThreeJS-Room13/47b05e2db4e49eec33d63729e920894a906cb693/static/baked.jpg');
    bakedTexture.flipY = false;
    
    // Texture Optimization to prevent flickering
    bakedTexture.minFilter = THREE.LinearFilter;
    bakedTexture.magFilter = THREE.LinearFilter;
    
    // Anisotropy helps with textures at sharp angles
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    bakedTexture.anisotropy = maxAnisotropy;

    if ('colorSpace' in bakedTexture) {
      (bakedTexture as any).colorSpace = THREE.SRGBColorSpace;
    } else {
      (bakedTexture as any).encoding = (THREE as any).sRGBEncoding;
    }

    const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture });

    // Input Tracking
    const mouse = new THREE.Vector2();
    
    const updateInput = (x: number, y: number) => {
      mouse.x = (x / window.innerWidth) * 2 - 1;
      mouse.y = -(y / window.innerHeight) * 2 + 1;
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateInput(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        updateInput(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });

    // Loader
    const loader = new GLTFLoader();
    let model: THREE.Group | null = null;
    loader.load(
      'https://rawcdn.githack.com/ricardoolivaalonso/ThreeJS-Room13/47b05e2db4e49eec33d63729e920894a906cb693/static/model.glb',
      (gltf) => {
        model = gltf.scene;
        model.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = bakedMaterial;
          }
        });
        scene.add(model);
        scene.position.set(0, 0.2, 0);
        setIsLoading(false);
      },
      (xhr) => {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      }
    );

    // Resize handler
    const handleResize = () => {
      if (!canvas.parentElement) return;
      const newSizes = getParentSize();
      camera.aspect = newSizes.width / newSizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(newSizes.width, newSizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // Animation
    const minPan = new THREE.Vector3(-2, -0.5, -2);
    const maxPan = new THREE.Vector3(2, 0.5, 2);

    let animationFrameId: number;
    const tick = () => {
      controls.update();
      controls.target.clamp(minPan, maxPan);

      // Look effect
      if (model) {
        // Tilt based on input position - fixed inversion
        const targetRotationX = -mouse.y * 0.4;
        const targetRotationY = mouse.x * 0.4;
        
        model.rotation.x += (targetRotationX - model.rotation.x) * 0.1;
        model.rotation.y += (targetRotationY - model.rotation.y) * 0.1;
      }

      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(tick);
    };

    tick();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-[8px] font-bold uppercase tracking-[0.3em] animate-pulse opacity-40">
            ...
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="webgl w-full h-full block outline-none" />
    </div>
  );
}
