import React, { useEffect, useRef } from 'react';
import styles from './HeroTurfScene.module.css';

type Point = { x: number; y: number };

const FIELD_LENGTH = 8;
const FIELD_WIDTH = 4.8;

const polygon = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
};

const strokeLocalLine = (
  ctx: CanvasRenderingContext2D,
  project: (x: number, z: number, y?: number) => Point,
  points: Array<[number, number]>,
) => {
  ctx.beginPath();
  points.forEach(([x, z], index) => {
    const point = project(x, z, 0.04);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
};

const drawLocalCircle = (
  ctx: CanvasRenderingContext2D,
  project: (x: number, z: number, y?: number) => Point,
  cx: number,
  cz: number,
  radius: number,
) => {
  const points: Array<[number, number]> = [];
  for (let step = 0; step <= 64; step += 1) {
    const angle = (step / 64) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius]);
  }
  strokeLocalLine(ctx, project, points);
};

const HeroTurfScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId = 0;
    let width = 0;
    let height = 0;
    const textureSeeds = Array.from({ length: 360 }, (_, index) => {
      const x = (((index * 47) % 800) / 800 - 0.5) * FIELD_LENGTH;
      const z = (((index * 83) % 480) / 480 - 0.5) * FIELD_WIDTH;
      const alpha = 0.07 + (((index * 29) % 40) / 1000);
      return { x, z, alpha };
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(rect.width, 320);
      height = Math.max(rect.height, 280);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const project = (x: number, z: number, y = 0): Point => {
      const scale = Math.min(width / 9.55, height / 5.25);
      const cx = width * 0.51;
      const cy = height * 0.48;
      return {
        x: cx + (x * 0.98 + z * 0.52) * scale,
        y: cy + (z * 0.44 - y * 0.92 + x * 0.02) * scale,
      };
    };

    const drawGoal = (x: number, direction: -1 | 1) => {
      const postZ = 0.78;
      const goalDepth = 0.46 * direction;
      const yTop = 0.48;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      [-postZ, postZ].forEach((z) => {
        const bottom = project(x, z, 0.08);
        const top = project(x, z, yTop);
        ctx.beginPath();
        ctx.moveTo(bottom.x, bottom.y);
        ctx.lineTo(top.x, top.y);
        ctx.stroke();
      });

      const leftTop = project(x, -postZ, yTop);
      const rightTop = project(x, postZ, yTop);
      ctx.beginPath();
      ctx.moveTo(leftTop.x, leftTop.y);
      ctx.lineTo(rightTop.x, rightTop.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i += 1) {
        const z = -postZ + (i / 5) * postZ * 2;
        const front = project(x, z, yTop);
        const back = project(x + goalDepth, z, yTop * 0.55);
        ctx.beginPath();
        ctx.moveTo(front.x, front.y);
        ctx.lineTo(back.x, back.y);
        ctx.stroke();
      }
      for (let i = 0; i <= 3; i += 1) {
        const y = (i / 3) * yTop;
        const left = project(x + goalDepth, -postZ, y);
        const right = project(x + goalDepth, postZ, y);
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawFence = () => {
      const posts: Array<[number, number]> = [];
      for (let i = 0; i <= 10; i += 1) {
        const x = -FIELD_LENGTH / 2 + (i / 10) * FIELD_LENGTH;
        posts.push([x, -FIELD_WIDTH / 2]);
        posts.push([x, FIELD_WIDTH / 2]);
      }
      for (let i = 1; i < 6; i += 1) {
        const z = -FIELD_WIDTH / 2 + (i / 6) * FIELD_WIDTH;
        posts.push([-FIELD_LENGTH / 2, z]);
        posts.push([FIELD_LENGTH / 2, z]);
      }

      ctx.save();
      ctx.strokeStyle = 'rgba(18, 55, 42, 0.18)';
      ctx.lineWidth = 1.4;
      posts.forEach(([x, z]) => {
        const base = project(x, z, 0.03);
        const top = project(x, z, 0.52);
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(top.x, top.y);
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(18, 55, 42, 0.15)';
      ctx.lineWidth = 1;
      const edges: Array<Array<[number, number]>> = [
        [[-4, -2.4], [4, -2.4]],
        [[-4, 2.4], [4, 2.4]],
        [[-4, -2.4], [-4, 2.4]],
        [[4, -2.4], [4, 2.4]],
      ];
      [0.24, 0.52].forEach((railY) => {
        edges.forEach((edge) => {
          const start = project(edge[0][0], edge[0][1], railY);
          const end = project(edge[1][0], edge[1][1], railY);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        });
      });
      ctx.restore();
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const t = time / 1000;
      const float = prefersReducedMotion ? 0 : Math.sin(t * 0.7) * 0.035;

      const top = [
        project(-4, -2.35, float),
        project(4, -2.35, float),
        project(4, 2.35, float),
        project(-4, 2.35, float),
      ];
      const soil = [
        project(-4, -2.35, -0.2 + float),
        project(4, -2.35, -0.2 + float),
        project(4, 2.35, -0.2 + float),
        project(-4, 2.35, -0.2 + float),
      ];
      const gravel = [
        project(-4, -2.35, -0.42 + float),
        project(4, -2.35, -0.42 + float),
        project(4, 2.35, -0.42 + float),
        project(-4, 2.35, -0.42 + float),
      ];

      ctx.save();
      ctx.fillStyle = 'rgba(18, 55, 42, 0.18)';
      ctx.filter = 'blur(12px)';
      ctx.beginPath();
      ctx.ellipse(width * 0.53, height * 0.74, width * 0.37, height * 0.12, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(18, 55, 42, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i += 1) {
        const x = width * (0.04 + i * 0.055);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.18);
        ctx.lineTo(x + 46, height * 0.12 + i * 10);
        ctx.lineTo(x + 92, height * 0.17 + i * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 4; i += 1) {
        const x = width * (0.78 + i * 0.045);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.2 + i * 8);
        ctx.lineTo(x + 32, height * 0.15);
        ctx.lineTo(x + 76, height * 0.18 + i * 7);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      polygon(ctx, [soil[0], soil[1], gravel[1], gravel[0]]);
      ctx.fillStyle = '#8a6a42';
      ctx.fill();
      polygon(ctx, [soil[1], soil[2], gravel[2], gravel[1]]);
      ctx.fillStyle = '#9b8c6f';
      ctx.fill();
      polygon(ctx, [soil[2], soil[3], gravel[3], gravel[2]]);
      ctx.fillStyle = '#6f7f69';
      ctx.fill();
      polygon(ctx, [top[0], top[1], soil[1], soil[0]]);
      ctx.fillStyle = '#1b7d45';
      ctx.fill();
      polygon(ctx, [top[1], top[2], soil[2], soil[1]]);
      ctx.fillStyle = '#2f8f59';
      ctx.fill();
      polygon(ctx, [top[2], top[3], soil[3], soil[2]]);
      ctx.fillStyle = '#176a3d';
      ctx.fill();
      ctx.restore();

      ctx.save();
      polygon(ctx, top);
      ctx.clip();
      const grassGradient = ctx.createLinearGradient(top[0].x, top[0].y, top[2].x, top[2].y);
      grassGradient.addColorStop(0, '#158047');
      grassGradient.addColorStop(0.48, '#32a55d');
      grassGradient.addColorStop(1, '#12713f');
      ctx.fillStyle = grassGradient;
      ctx.fillRect(0, 0, width, height);

      for (let stripe = 0; stripe < 10; stripe += 1) {
        const x1 = -4 + stripe * 0.8;
        const x2 = x1 + 0.8;
        const points = [
          project(x1, -2.35, float + 0.01),
          project(x2, -2.35, float + 0.01),
          project(x2, 2.35, float + 0.01),
          project(x1, 2.35, float + 0.01),
        ];
        polygon(ctx, points);
        ctx.fillStyle = stripe % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)';
        ctx.fill();
      }

      textureSeeds.forEach((seed) => {
        const point = project(seed.x, seed.z, float + 0.02);
        ctx.fillStyle = `rgba(255, 255, 255, ${seed.alpha})`;
        ctx.fillRect(point.x, point.y, 1, 1);
      });

      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.86)';
      ctx.lineWidth = 2.2;
      strokeLocalLine(ctx, project, [[-3.75, -2.08], [3.75, -2.08], [3.75, 2.08], [-3.75, 2.08], [-3.75, -2.08]]);
      strokeLocalLine(ctx, project, [[0, -2.08], [0, 2.08]]);
      drawLocalCircle(ctx, project, 0, 0, 0.68);
      strokeLocalLine(ctx, project, [[-3.75, -0.9], [-2.65, -0.9], [-2.65, 0.9], [-3.75, 0.9]]);
      strokeLocalLine(ctx, project, [[3.75, -0.9], [2.65, -0.9], [2.65, 0.9], [3.75, 0.9]]);
      ctx.restore();

      drawFence();
      drawGoal(-3.75, -1);
      drawGoal(3.75, 1);

      if (!prefersReducedMotion) {
        frameId = window.requestAnimationFrame(draw);
      }
    };

    resize();
    draw(0);
    if (!prefersReducedMotion) frameId = window.requestAnimationFrame(draw);
    const observer = new ResizeObserver(() => {
      resize();
      draw(0);
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
};

export default HeroTurfScene;
