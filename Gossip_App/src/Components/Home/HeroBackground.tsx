import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as THREE from "three";
import { RootState } from "../../store/store";

interface HeroBackgroundProps {
  heroRef?: React.RefObject<HTMLElement>;
}

export default function HeroBackground({ heroRef }: HeroBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const themeMode = useSelector((state: RootState) => state.theme.themeMode);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    const width = currentMount.clientWidth || window.innerWidth;
    const height = currentMount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    currentMount.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.PointsMaterial[] = [];
    const textures: THREE.Texture[] = [];

    const getParticlesObject = (numOfParticles: number, image: string) => {
      const particlesGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(numOfParticles * 3);

      for (let i = 0; i < numOfParticles; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }

      const imageTexture = textureLoader.load(image);
      imageTexture.colorSpace = THREE.SRGBColorSpace;
      particlesGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );

      const particlesMaterial = new THREE.PointsMaterial({
        map: imageTexture,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });

      geometries.push(particlesGeometry);
      materials.push(particlesMaterial);
      textures.push(imageTexture);

      return new THREE.Points(particlesGeometry, particlesMaterial);
    };

    const emojiFiles = [
      "/emoji1.png",
      "/emoji2.png",
      "/emoji3.png",
      "/emoji4.png",
      "/emoji5.png",
      "/emoji6.png",
    ];

    const particles = emojiFiles.map((src) => {
      const p = getParticlesObject(100, src);
      scene.add(p);
      return p;
    });

    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;
    const animate = () => {
      for (let i = 0; i < particles.length; i++) {
        particles[i].rotation.x += 0.001;
        particles[i].rotation.y += 0.001;

        particles[i].rotation.x += mouse.y * 0.005;
        particles[i].rotation.y += mouse.x * 0.005;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none -z-10"
      style={{
        backgroundColor:
          themeMode === "white"
            ? "color-mix(in srgb, var(--theme-color) 10%, var(--theme-mode))"
            : "color-mix(in srgb, var(--opposite-theme-mode) 8%, var(--theme-mode))",
      }}
    />
  );
}
