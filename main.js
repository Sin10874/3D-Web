import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ====== 粒子模型生成器 ======
class ParticleModelGenerator {
    static getPointCount(count) {
        return 20000; // 进一步增加粒子数以获得更好的密度
    }

    static heart(count) {
        count = this.getPointCount(count);
        const positions = [];
        const colors = [];
        const c1 = new THREE.Color(0xff0033); // 鲜艳的红
        const c2 = new THREE.Color(0xff99cc); // 柔和的粉
        const c3 = new THREE.Color(0xffffff); // 高光点缀

        let i = 0;
        // 使用拒绝采样生成完美的实心 3D 爱心
        // 公式: (x^2 + (9/4)z^2 + y^2 - 1)^3 - x^2*y^3 - (9/80)z^2*y^3 <= 0
        // 其中 y 是垂直轴
        while (i < count) {
            const x = Math.random() * 3 - 1.5;
            const y = Math.random() * 3 - 1.5;
            const z = Math.random() * 3 - 1.5;

            const x2 = x * x;
            const y2 = y * y;
            const z2 = z * z;
            const y3 = y * y * y;

            // 调整系数 2.25 -> 5.0 让爱心变得很薄，更像2.5D剪纸风格
            // z系数越大，z方向允许的范围越小，从而越薄
            const zCoef = 5.0; 
            
            const a = x2 + zCoef * z2 + y2 - 1;
            const term2 = x2 * y3;
            const term3 = (9/80) * z2 * y3;

            if (a * a * a - term2 - term3 <= 0) {
                const scale = 8;
                positions.push(x * scale, y * scale, z * scale);

                // 颜色渐变：
                // 内部深红，外部粉红，顶部带一点高光
                const dist = Math.sqrt(x2 + z2); // 水平距离
                const h = (y + 1) / 2.5; // 高度因子
                
                const col = c1.clone();
                // 基于高度和边缘混合粉色
                col.lerp(c2, h * 0.5 + dist * 0.3);
                
                colors.push(col.r, col.g, col.b);
                i++;
            }
        }
        return { positions, colors };
    }

    static butterfly(count) { 
        count = this.getPointCount(count);
        const positions = [];
        const colors = [];
        const cBody = new THREE.Color(0x111111);
        const cWing = new THREE.Color(0xff00cc);
        const cWingEdge = new THREE.Color(0x00ffff);

        for (let i = 0; i < count; i++) {
            const r = Math.random();
            
            if (r < 0.1) { // 身体 (细长)
                const t = Math.random() * 2 - 1; // -1 to 1
                const x = 0;
                const y = t * 4;
                const z = (Math.random() - 0.5) * 0.5;
                positions.push(x, y, z);
                colors.push(cBody.r, cBody.g, cBody.b);
            } else { // 翅膀
                // 使用更精准的参数方程
                // 参考蝴蝶曲线 (Butterfly Curve) 但做调整以适应 3D 粒子
                const t = Math.random() * 12 * Math.PI; // 增加 t 的范围
                
                // 核心形状公式
                const part1 = Math.exp(Math.cos(t));
                const part2 = 2 * Math.cos(4 * t);
                const part3 = Math.pow(Math.sin(t / 12), 5);
                const rBase = part1 - part2 + part3;
                
                // 随机填充
                const fill = Math.sqrt(Math.random()) * 2.5; // 缩放系数
                
                const x = Math.sin(t) * rBase * fill;
                const y = Math.cos(t) * rBase * fill;
                
                // Z轴: 增加翅膀的立体折叠感 (V型)
                // 越靠近中心(x=0) z越小，越靠外 z越大
                const z = Math.abs(x) * 0.5 + (Math.random()-0.5)*0.2;

                positions.push(x * 1.5, y * 1.5, z); // 整体放大一点
                
                const dist = Math.sqrt(x*x + y*y);
                const c = cWing.clone().lerp(cWingEdge, dist/5); // 颜色随距离渐变
                colors.push(c.r, c.g, c.b);
            }
        }
        return { positions, colors };
    }

    static saturn(count) { // 银河 (Galaxy)
        count = this.getPointCount(count);
        const positions = [];
        const colors = [];
        const cCore = new THREE.Color(0xffddaa);
        const cArm = new THREE.Color(0x4466ff);

        for (let i = 0; i < count; i++) {
            // 螺旋星系
            const arms = 5;
            const armIndex = i % arms;
            const radius = Math.random() * 20;
            const angle = (armIndex / arms) * Math.PI * 2 + (radius / 20) * Math.PI * 4;
            
            // 增加随机散布
            const spread = (Math.random() - 0.5) * (radius / 2);
            
            const x = Math.cos(angle) * radius + spread;
            const z = Math.sin(angle) * radius + spread;
            const y = (Math.random() - 0.5) * (20 / (radius + 1)); // 中心厚

            positions.push(x, y, z);

            const t = Math.min(1, radius / 18);
            const c = cCore.clone().lerp(cArm, t);
            colors.push(c.r, c.g, c.b);
        }
        return { positions, colors };
    }
    
    static water(count) { // 新增：水流/瀑布
        count = this.getPointCount(count);
        const positions = [];
        const colors = [];
        const c1 = new THREE.Color(0x00ffff);
        const c2 = new THREE.Color(0x0044ff);

        for (let i = 0; i < count; i++) {
            // 模拟瀑布下落轨迹
            const t = Math.random(); 
            const y = (t - 0.5) * 30; // 高度
            
            // x, z 随 y 变化，模拟散开
            const spread = (1 - t) * 5; 
            const x = (Math.random() - 0.5) * (5 + spread * spread);
            const z = (Math.random() - 0.5) * (2 + spread);
            
            // 增加一点波动
            const wave = Math.sin(y * 0.5) * 2;

            positions.push(x + wave, y, z);
            
            const c = c1.clone().lerp(c2, t);
            colors.push(c.r, c.g, c.b);
        }
        return { positions, colors };
    }

    static firework(count) { // 不规则烟花
        count = this.getPointCount(count);
        const positions = [];
        const colors = [];
        
        for (let i = 0; i < count; i++) {
            // 多个爆炸中心，模拟不规则
            const centers = [
                {x: 0, y: 0, z: 0, r: 15, c: new THREE.Color(0xff0000)},
                {x: 5, y: 5, z: 5, r: 10, c: new THREE.Color(0xffff00)},
                {x: -5, y: -3, z: 2, r: 8, c: new THREE.Color(0x00ff00)}
            ];
            
            const center = centers[Math.floor(Math.random() * centers.length)];
            
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = Math.pow(Math.random(), 0.5) * center.r;
            
            // 添加"重力"拖尾效果
            const g = Math.random() * 2;

            const x = center.x + r * Math.sin(phi) * Math.cos(theta);
            const y = center.y + r * Math.sin(phi) * Math.sin(theta) - g;
            const z = center.z + r * Math.cos(phi);

            positions.push(x, y, z);
            colors.push(center.c.r, center.c.g, center.c.b);
        }
        return { positions, colors };
    }

    static cat(count) { // 替换 Buddha 为猫头
        count = this.getPointCount(count);
        const positions = [];
        const colors = [];
        const cFur = new THREE.Color(0xdddddd);
        const cEar = new THREE.Color(0xffaaaa);
        const cEye = new THREE.Color(0x00ff00);

        for (let i = 0; i < count; i++) {
            const r = Math.random();
            let x, y, z;
            let c = cFur;

            if (r < 0.6) { // 脸部 (扁球体)
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const rad = 6;
                x = rad * Math.sin(phi) * Math.cos(theta) * 1.2; // 宽脸
                y = rad * Math.sin(phi) * Math.sin(theta) * 0.9;
                z = rad * Math.cos(phi) * 0.8;
            } else if (r < 0.8) { // 耳朵 (两个圆锥)
                const side = Math.random() > 0.5 ? 1 : -1;
                const h = Math.random() * 4;
                const rad = (4 - h) * 0.5;
                const theta = Math.random() * Math.PI * 2;
                
                // 耳朵位置
                const bx = 4 * side;
                const by = 3;
                
                x = bx + rad * Math.cos(theta);
                y = by + h;
                z = rad * Math.sin(theta);
                
                if (z > 0.2) c = cEar; // 耳朵内部粉色
            } else if (r < 0.9) { // 眼睛
                const side = Math.random() > 0.5 ? 1 : -1;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const rad = 1.2;
                
                x = side * 2.5 + rad * Math.sin(phi) * Math.cos(theta);
                y = 0 + rad * Math.sin(phi) * Math.sin(theta);
                z = 4 + rad * Math.cos(phi);
                c = cEye;
            } else { // 鼻子和胡须
                 const part = Math.random();
                 if (part < 0.3) { // 鼻子
                     x = (Math.random()-0.5);
                     y = -1.5 + (Math.random()-0.5);
                     z = 5 + (Math.random()-0.5);
                     c = cEar;
                 } else { // 胡须
                     const side = Math.random() > 0.5 ? 1 : -1;
                     const t = Math.random();
                     x = side * (2 + t * 4);
                     y = -2 + (Math.random() - 0.5) + (side * t * (Math.random()-0.5));
                     z = 4;
                 }
            }

            positions.push(x, y, z);
            colors.push(c.r, c.g, c.b);
        }
        return { positions, colors };
    }

    static cloud(count) { // 云朵
        count = this.getPointCount(count);
        const positions = [];
        const colors = [];
        const white = new THREE.Color(0xffffff);
        const grey = new THREE.Color(0x8899aa);
        
        // 多个球体叠加模拟云团
        const spheres = [
            {x: 0, y: 0, z: 0, r: 8},
            {x: 6, y: 2, z: 0, r: 6},
            {x: -6, y: 1, z: 2, r: 7},
            {x: 3, y: 4, z: -2, r: 5},
            {x: -2, y: -2, z: 3, r: 5}
        ];

        for (let i = 0; i < count; i++) {
            const s = spheres[Math.floor(Math.random() * spheres.length)];
            
            // 随机点在球体内
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = Math.pow(Math.random(), 0.3) * s.r; // 边缘模糊
            
            const x = s.x + r * Math.sin(phi) * Math.cos(theta);
            const y = s.y + r * Math.sin(phi) * Math.sin(theta);
            const z = s.z + r * Math.cos(phi);
            
            // 底部平整化
            if (y < -3) continue;

            positions.push(x, y * 0.8, z); // 压扁一点
            
            // 阴影颜色
            const shadow = (y + 5) / 15;
            const c = grey.clone().lerp(white, shadow);
            colors.push(c.r, c.g, c.b);
        }
        return { positions, colors };
    }

    static doraemon(count) { // 哆啦A梦
        count = this.getPointCount(count);
        const positions = [];
        const colors = [];
        
        const blue = new THREE.Color(0x0099ff); // 哆啦A梦蓝
        const white = new THREE.Color(0xffffff);
        const red = new THREE.Color(0xdd0000);
        const gold = new THREE.Color(0xffcc00);
        const black = new THREE.Color(0x111111);

        for (let i = 0; i < count; i++) {
            const r = Math.random();
            let x, y, z;
            let color = blue;

            if (r < 0.35) { 
                // 头部 (蓝色大球)
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const rad = 4.2;
                x = rad * Math.sin(phi) * Math.cos(theta);
                y = rad * Math.sin(phi) * Math.sin(theta);
                z = rad * Math.cos(phi);
                
                // 脸部白色区域 (前面的部分，稍微压扁一点的椭球切片)
                // 面部在 z 轴正向，稍微偏下
                if (z > 1.5 && y < 1.2) {
                    color = white;
                }
            } else if (r < 0.42) {
                 // 眼睛 (两个白球)
                 const side = Math.random() > 0.5 ? 1 : -1;
                 const theta = Math.random() * Math.PI * 2;
                 const phi = Math.acos(Math.random() * 2 - 1);
                 const rad = 1.0;
                 // 眼睛位置
                 x = side * 1.0 + rad * Math.sin(phi) * Math.cos(theta);
                 y = 1.6 + rad * Math.sin(phi) * Math.sin(theta);
                 z = 3.6 + rad * Math.cos(phi);
                 
                 // 瞳孔 (前端黑色)
                 if (z > 4.3 && Math.abs(x - side * 1.0) < 0.3 && Math.abs(y - 1.6) < 0.4) {
                     color = black;
                 } else {
                     color = white;
                 }
            } else if (r < 0.44) {
                // 鼻子 (红球)
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const rad = 0.45;
                x = 0 + rad * Math.sin(phi) * Math.cos(theta);
                y = 0.8 + rad * Math.sin(phi) * Math.sin(theta);
                z = 4.0 + rad * Math.cos(phi);
                color = red;
            } else if (r < 0.75) {
                // 身体 (蓝色圆柱/球体混合)
                const theta = Math.random() * Math.PI * 2;
                const h = Math.random(); 
                const rad = 3.6; 
                
                // 简单的身体形状
                x = rad * Math.cos(theta) * (0.9 + 0.1*Math.random());
                y = -2.5 - h * 4.5; // 从 -2.5 到 -7
                z = rad * Math.sin(theta) * (0.9 + 0.1*Math.random());
                
                // 肚子白色区域 (前方椭圆)
                // 在 z 正向，且 x 范围适中
                if (z > 2.0 && Math.abs(x) < 2.5 && y > -6) {
                    color = white;
                } else {
                    color = blue;
                }
            } else if (r < 0.82) {
                // 项圈 (红色环)
                const theta = Math.random() * Math.PI * 2;
                const rad = 3.4;
                const tube = 0.25;
                const tr = Math.random() * tube;
                const ta = Math.random() * Math.PI * 2;
                
                x = (rad + tr * Math.cos(ta)) * Math.cos(theta);
                y = -2.6 + tr * Math.sin(ta);
                z = (rad + tr * Math.cos(ta)) * Math.sin(theta);
                color = red;
            } else if (r < 0.85) {
                // 铃铛 (金色球)
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const rad = 0.6;
                x = 0 + rad * Math.sin(phi) * Math.cos(theta);
                y = -3.4 + rad * Math.sin(phi) * Math.sin(theta);
                z = 3.6 + rad * Math.cos(phi);
                color = gold;
            } else {
                // 手脚 (白色圆球)
                const part = Math.random();
                if (part < 0.5) {
                    // 手 (两边)
                    const side = Math.random() > 0.5 ? 1 : -1;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(Math.random() * 2 - 1);
                    const rad = 1.0;
                    x = side * 4.2 + rad * Math.sin(phi) * Math.cos(theta);
                    y = -3.5 + rad * Math.sin(phi) * Math.sin(theta);
                    z = 0.5 + rad * Math.cos(phi);
                    color = white;
                } else {
                    // 脚 (底部)
                    const side = Math.random() > 0.5 ? 1 : -1;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(Math.random() * 2 - 1);
                    const rad = 1.3;
                    x = side * 1.8 + rad * Math.sin(phi) * Math.cos(theta);
                    y = -7.2 + rad * Math.sin(phi) * Math.sin(theta) * 0.5; // 压扁
                    z = 0.5 + rad * Math.cos(phi) * 1.8; // 拉长
                    color = white;
                }
            }

            positions.push(x, y, z);
            colors.push(color.r, color.g, color.b);
        }
        return { positions, colors };
    }
}

// ====== 主应用类 ======
class ParticleSystem {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null; // 后处理合成器
        this.particles = null;
        this.particleCount = 15000; // 默认增加粒子数
        this.currentModel = 'heart';
        this.basePositions = [];
        this.baseColors = []; // 保存初始颜色
        this.hands = null;
        this.targetScale = 1.2;
        this.currentScale = 1.2;
        this.targetRotation = new THREE.Euler(0, 0, 0);
        this.isHandDetected = false;

        this.init();
        this.setupHandTracking();
        this.setupUI();
        this.animate();
    }

    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510); // 深色背景
        this.scene.fog = new THREE.FogExp2(0x050510, 0.02); // 添加雾效增加深度感

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            60, // 减小视场角减少畸变
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 40;

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false, // Post-processing 推荐关闭 MSAA
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比优化性能
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // 后处理配置 (Bloom)
        const renderScene = new RenderPass(this.scene, this.camera);
        
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            2.0, // strength (higher for neon effect)
            0.5, // radius
            0.2  // threshold (lower to make more particles glow)
        );

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);

        // 创建粒子系统
        this.createParticles('heart');

        // 窗口大小调整
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createParticles(modelType) {
        // 移除旧粒子
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }

        // 获取模型数据 (位置和颜色)
        const data = ParticleModelGenerator[modelType](this.particleCount);
        this.basePositions = data.positions;
        this.baseColors = data.colors;

        // 创建几何体
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.basePositions), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.baseColors), 3));

        // 改进的纹理生成 (更锐利的科技感光点)
        const canvas = document.createElement('canvas');
        canvas.width = 128; // 增加分辨率
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(200, 255, 255, 0.8)'); // 青色核心
        gradient.addColorStop(0.3, 'rgba(0, 200, 255, 0.3)');   // 蓝色光晕
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        const texture = new THREE.CanvasTexture(canvas);

        // 创建材质
        const material = new THREE.PointsMaterial({
            size: 0.4, // 稍微减小尺寸以配合高密度
            map: texture,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending, // 加法混合产生发光感
            depthWrite: false,
            vertexColors: true // 启用顶点颜色
        });

        // 创建粒子系统
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        this.currentModel = modelType;
    }

    updateParticleColor(hexColor) {
        // 用户手动选色时，覆盖所有粒子颜色
        if (this.particles) {
            const color = new THREE.Color(hexColor);
            const colors = this.particles.geometry.attributes.color;
            const count = colors.count;
            
            for (let i = 0; i < count; i++) {
                colors.setXYZ(i, color.r, color.g, color.b);
            }
            colors.needsUpdate = true;
        }
    }

    updateParticleScale() {
        // 平滑过渡 (增加阻尼，更平滑)
        this.currentScale += (this.targetScale - this.currentScale) * 0.05;

        if (this.particles) {
            this.particles.scale.set(this.currentScale, this.currentScale, this.currentScale);
        }
    }

    setupHandTracking() {
        const videoElement = document.getElementById('video');
        const loadingElement = document.getElementById('loading');

        // 隐藏加载屏幕的函数
        const hideLoading = () => {
            if (loadingElement) {
                loadingElement.style.opacity = '0';
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                }, 500);
            }
        };

        try {
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => this.onHandsResults(results));

            const camera = new Camera(videoElement, {
                onFrame: async () => {
                    try {
                        await this.hands.send({ image: videoElement });
                    } catch (e) {
                        console.warn('Hand tracking frame error:', e);
                    }
                },
                width: 640,
                height: 480
            });

            camera.start().then(() => {
                console.log('Camera started successfully');
                hideLoading();
            }).catch((err) => {
                console.warn('Camera failed to start:', err);
                hideLoading(); // 即使摄像头失败也隐藏加载
            });

            // 备用：3秒后强制隐藏加载屏幕
            setTimeout(hideLoading, 3000);

        } catch (error) {
            console.warn('Hand tracking setup failed:', error);
            hideLoading(); // 手势追踪失败也隐藏加载
        }
    }

    onHandsResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length >= 1) {
            this.isHandDetected = true;
            const hand = results.multiHandLandmarks[0];

            // 算法优化：计算所有指尖到手掌中心的平均距离
            // 手掌中心估算：(0号点手腕 + 9号点中指根部) / 2
            const cx = (hand[0].x + hand[9].x) / 2;
            const cy = (hand[0].y + hand[9].y) / 2;

            let totalDist = 0;
            const tips = [4, 8, 12, 16, 20]; // 拇指、食指...小指尖
            
            tips.forEach(idx => {
                const dx = hand[idx].x - cx;
                const dy = hand[idx].y - cy;
                totalDist += Math.sqrt(dx*dx + dy*dy);
            });
            
            const avgDist = totalDist / 5;

            // 映射逻辑优化
            // 握拳时 avgDist 约 0.05-0.08
            // 张开时 avgDist 约 0.25-0.35
            // 线性映射到 0.2 (最小) ~ 3.5 (最大)
            const minSpread = 0.08;
            const maxSpread = 0.3;
            
            let factor = (avgDist - minSpread) / (maxSpread - minSpread);
            factor = Math.max(0, Math.min(1, factor)); // clamp 0-1
            
            // 逻辑反转：张开(factor=1) -> 收缩(Scale小)
            // 闭合(factor=0) -> 扩散(Scale大)
            this.targetScale = 0.2 + (1 - factor) * 3.3;

            // --- 旋转控制 ---
            // 1. Z轴旋转 (Roll): 基于手腕(0)到中指根部(9)的向量角度
            // 屏幕坐标系: x向右, y向下. atan2(y, x)
            // 我们希望手垂直向上时角度为0. 向量 0->9: dx = p9.x-p0.x, dy = p9.y-p0.y
            const p0 = hand[0];
            const p9 = hand[9];
            const p5 = hand[5];
            const p17 = hand[17];

            // 计算手掌在屏幕平面的倾斜角
            // dy取反因为屏幕坐标y向下，我们习惯y向上为正
            const angleZ = -Math.atan2(p9.x - p0.x, -(p9.y - p0.y));

            // 2. Y轴旋转 (Yaw): 基于食指根部(5)到小指根部(17)的水平投影
            // 判断手掌正反面或左右旋转
            // 简单的估算：利用 5->17 的水平跨度来映射 Y 轴旋转
            const dx_width = p5.x - p17.x; 
            // 乘一个系数来放大旋转效果，使其更灵敏
            const angleY = dx_width * 5; 

            // 设置目标旋转
            // 这里我们累加基础旋转还是直接设定绝对旋转？
            // 用户希望"手翻转的时候，模型方向也翻转"，这意味着绝对映射比较好
            this.targetRotation.set(0, angleY, angleZ);

        } else {
            // 没有检测到手
            this.isHandDetected = false;
            // 恢复默认缩放
            this.targetScale = 1.2;
        }
    }

    setupUI() {
        // 模型选择
        const modelButtons = document.querySelectorAll('.model-btn');
        modelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modelButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const model = btn.dataset.model;
                this.createParticles(model);
            });
        });

        // 颜色选择
        const colorPicker = document.getElementById('colorPicker');
        colorPicker.addEventListener('input', (e) => {
            this.updateParticleColor(e.target.value);
        });

        // 全屏按钮
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const controlPanel = document.querySelector('.control-panel');
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                controlPanel.classList.add('hidden');
            } else {
                document.exitFullscreen();
                controlPanel.classList.remove('hidden');
            }
        });

        // 监听全屏状态变化（用户按ESC退出）
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                controlPanel.classList.remove('hidden');
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 更新粒子缩放
        this.updateParticleScale();

        // 旋转粒子系统
        if (this.particles) {
            if (this.isHandDetected) {
                // 手势控制模式：平滑插值到目标旋转
                // 使用 lerp 平滑过渡
                const lerpFactor = 0.1;
                this.particles.rotation.x += (this.targetRotation.x - this.particles.rotation.x) * lerpFactor;
                this.particles.rotation.y += (this.targetRotation.y - this.particles.rotation.y) * lerpFactor;
                this.particles.rotation.z += (this.targetRotation.z - this.particles.rotation.z) * lerpFactor;
            } else {
                // 自动旋转模式
                this.particles.rotation.y += 0.001; // 更优雅的慢速旋转
            }
            
            // 添加呼吸浮动效果
            this.particles.position.y = Math.sin(Date.now() * 0.0005) * 1.5;
        }

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// 启动应用
new ParticleSystem();
