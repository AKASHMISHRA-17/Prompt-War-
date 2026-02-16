/**
 * Subway Surfers: Zero-G Evolution
 * Core Game Logic - Vanilla JS + Three.js
 */

// --- Configuration ---
const CONFIG = {
    TUNNEL_RADIUS: 8,
    TUNNEL_LENGTH: 120,
    SPEED_BASE: 0.8,
    SPEED_MAX: 2.0,
    LANE_ANGLE: Math.PI / 4, // 45 degrees for wider spacing
    GRAVITY_LANES: [0, 1, 2, 3], // Bottom, Right, Top, Left
    COLORS: {
        BG: 0x020205,
        GRID: 0x00f3ff,
        GRID_SECONDARY: 0x220033,
        PLAYER: 0xff00ff,
        OBSTACLE: 0xff3333,
        FOG: 0x020205
    }
};

class Game {
    constructor() {
        this.container = document.getElementById('canvas-container');

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(CONFIG.COLORS.FOG, 0.04);
        this.scene.background = new THREE.Color(CONFIG.COLORS.BG);

        // Camera
        this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 8);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance opt
        this.container.appendChild(this.renderer.domElement);

        // State
        this.isPlaying = false;
        this.score = 0;
        this.speed = 0;
        this.tunnelSegments = [];
        this.particles = [];

        // Player State
        this.currentLane = 0; // -1, 0, 1 relative to gravity
        this.gravityIndex = 0; // 0=Bottom, 1=Right, 2=Top, 3=Left
        this.targetRotation = 0; // For camera/world rotation
        this.playerY = 0; // Vertical hop position
        this.isJumping = false;
        this.velocityY = 0;

        this.initWorld();
        this.initPlayer();
        this.initInputs();

        // Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    initWorld() {
        // Lighting - Made Brighter
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased from 0.4
        this.scene.add(ambientLight);

        this.tubeLight = new THREE.PointLight(CONFIG.COLORS.GRID, 1.5, 60); // Softer point light
        this.tubeLight.position.set(0, 5, -5); // Moved up
        this.scene.add(this.tubeLight);

        // Add specific directional light for depth
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        this.scene.add(dirLight);

        // Group for the entire tunnel world to rotate around player
        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);

        // Initial Tunnel
        for (let i = 0; i < 20; i++) {
            this.createTunnelSegment(i * 20);
        }
    }

    createTunnelSegment(zPos) {
        const geometry = new THREE.CylinderGeometry(
            CONFIG.TUNNEL_RADIUS,
            CONFIG.TUNNEL_RADIUS,
            20,
            8,
            1,
            true
        );

        const material = new THREE.MeshBasicMaterial({
            color: CONFIG.COLORS.GRID,
            wireframe: true,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending
        });

        const segment = new THREE.Mesh(geometry, material);
        segment.rotation.x = -Math.PI / 2;
        segment.position.z = -zPos - 10;

        this.worldGroup.add(segment); // Add to group instead of scene
        this.tunnelSegments.push(segment);

        // Add some random "Neon Lines" to segments for speed feeling
        if (Math.random() > 0.5) {
            const lineGeo = new THREE.BoxGeometry(0.2, 0.2, 10);
            const lineMat = new THREE.MeshBasicMaterial({ color: CONFIG.COLORS.GRID_SECONDARY });
            const line = new THREE.Mesh(lineGeo, lineMat);
            // Random position on the wall
            const angle = Math.random() * Math.PI * 2;
            const r = CONFIG.TUNNEL_RADIUS - 0.5;
            line.position.x = Math.sin(angle) * r;
            line.position.y = Math.cos(angle) * r;
            line.lookAt(0, 0, segment.position.z + 100); // Align with Z
            segment.add(line);
        }

        // Chance to spawn obstacle
        if (zPos > 50 && Math.random() > 0.3) {
            this.createObstacle(segment.position.z);
        }
    }

    createObstacle(zPos) {
        // Random Lane (-1, 0, 1) relative to *current* gravity interaction
        // But since we rotate the world, we can just place them on the "floor" of the segment
        // And the player rotates to finding them.

        // Actually, for a tunnel runner, obstacles should be on specific panels.
        // Let's place obstacles on random panels (0-7 for octagon) 
        // to show off the 360 nature.

        const angleIdx = Math.floor(Math.random() * 8);
        const angle = (angleIdx / 8) * Math.PI * 2;

        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshStandardMaterial({
            color: CONFIG.COLORS.OBSTACLE,
            emissive: 0x550000
        });

        const obstacle = new THREE.Mesh(geometry, material);
        const r = CONFIG.TUNNEL_RADIUS - 1;

        obstacle.position.x = Math.sin(angle) * r;
        obstacle.position.y = Math.cos(angle) * r;
        obstacle.position.z = zPos;

        obstacle.rotation.z = -angle;

        this.worldGroup.add(obstacle);

        // Track collision
        obstacle.userData = { isObstacle: true, angleIdx: angleIdx };
    }

    initPlayer() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: CONFIG.COLORS.PLAYER,
            emissive: CONFIG.COLORS.PLAYER,
            emissiveIntensity: 0.8
        });
        this.player = new THREE.Mesh(geometry, material);
        this.scene.add(this.player); // Player stays in scene root, world rotates around

        const light = new THREE.PointLight(CONFIG.COLORS.PLAYER, 1.5, 20);
        this.player.add(light);
    }

    initInputs() {
        document.addEventListener('keydown', (e) => {
            if (!this.isPlaying) return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                    this.changeLane(-1);
                    break;
                case 'ArrowRight':
                case 'd':
                    this.changeLane(1);
                    break;
                case ' ':
                case 'ArrowUp':
                case 'w':
                    this.jump();
                    break;
                case 'q':
                    this.rotateGravity(1); // Rotate World Left
                    break;
                case 'e':
                    this.rotateGravity(-1); // Rotate World Right
                    break;
            }
        });
    }

    rotateGravity(dir) {
        // Rotate the world target angle
        // 8 segments = 45 degrees (PI/4)
        this.targetRotation += dir * (Math.PI / 4);
    }

    changeLane(dir) {
        this.currentLane = Math.max(-1, Math.min(1, this.currentLane + dir));
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.velocityY = 0.6;
        }
    }

    updatePlayer() {
        // Player X (Lane)
        const targetX = this.currentLane * 2.0;
        this.player.position.x += (targetX - this.player.position.x) * 0.2;

        // Jump Y
        if (this.isJumping) {
            this.playerY += this.velocityY;
            this.velocityY -= 0.04;
            if (this.playerY <= 0) {
                this.playerY = 0;
                this.isJumping = false;
                this.velocityY = 0;
            }
        }

        // Player stays visually at bottom of screen, World rotates
        // But we simulate running on surface:
        const surfaceY = -CONFIG.TUNNEL_RADIUS + 1.5;
        this.player.position.y = surfaceY + this.playerY;

        // Player Tilt
        this.player.rotation.z = -this.player.position.x * 0.1;

        // World Rotation (Smooth)
        // Lerp world rotation to target
        this.worldGroup.rotation.z += (this.targetRotation - this.worldGroup.rotation.z) * 0.1;
    }

    checkCollisions() {
        // Raycast or simple box check?
        // Simple Box Check relative to World Group children is hard because hierarchy.
        // Let's do simple distance check against obstacles in "local" player space.

        // Iterate children of WorldGroup that are obstacles
        // We need to transform obstacle position to World Space to check against Player
        // OR transform Player to WorldGroup Space.

        // Easier: Transform Player to WorldGroup space
        // Player World Pos is (player.x, player.y, player.z) (Z is 0 usually if we move world)
        // Wait, we move segments Z, player Z stays 0?
        // No, current logic: segment.position.z += speed.

        // So Player Z = 0.
        // Check obstacles with Z near 0.

        for (let child of this.worldGroup.children) {
            if (child.userData.isObstacle) {
                // Get world position of obstacle
                // We can't trust .position because parent is rotated.

                // Optimization: Only check if z is close
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);

                if (Math.abs(worldPos.z - this.player.position.z) < 1.0) {
                    // Check X/Y distance
                    const dx = worldPos.x - this.player.position.x;
                    const dy = worldPos.y - this.player.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 1.2) {
                        this.gameOver();
                    }
                }
            }
        }
    }

    updateTunnel() {
        for (let i = this.tunnelSegments.length - 1; i >= 0; i--) {
            const segment = this.tunnelSegments[i];
            segment.position.z += this.speed;

            if (segment.position.z > 20) {
                // Recycle
                segment.position.z -= 400; // 20 segments * 20 length

                // Respawn obstacle logic could go here if we were recycling objects properly
                // For now, simple loop, obstacles might just disappear or repeat.
                // Better: Destroy obstacles that pass camera
            }
        }

        // Cleanup obstacles
        for (let i = this.worldGroup.children.length - 1; i >= 0; i--) {
            const child = this.worldGroup.children[i];
            if (child.userData.isObstacle) {
                child.position.z += this.speed;
                if (child.position.z > 20) {
                    this.worldGroup.remove(child);
                    // Add new one far back?
                    this.createObstacle(child.position.z - 400);
                }
            }
        }
    }

    gameOver() {
        this.isPlaying = false;
        document.getElementById('game-over').style.display = 'block';
        document.getElementById('final-score').innerText = document.getElementById('score-val').innerText;
        document.getElementById('hud').style.display = 'none';
    }

    start() {
        this.isPlaying = true;
        this.speed = CONFIG.SPEED_BASE;
        document.getElementById('start-btn').blur();

        // Reset score logic
        this.score = 0;
        document.getElementById('score-val').innerText = "0000";

        // Initialize Gemini (Demo Mode Only now)
        this.gemini = new window.GeminiService(null);

        // Apply Selected Environment
        const selectedTheme = document.getElementById('theme-select').value;
        this.setInitialTheme(selectedTheme);
    }

    setInitialTheme(themeName) {
        const themes = {
            'google': { bg: 0xf5f8fc, grid: 0x4285F4, fog: 0xffffff, obstacle: 0xEA4335 }, // Brighter White/Blue
            'cyberpunk': { bg: 0x020205, grid: 0x00f3ff, fog: 0x020205, obstacle: 0xff3333 },
            'mars': { bg: 0x220500, grid: 0xff4400, fog: 0x220500, obstacle: 0xffcc00 },
            'ocean': { bg: 0x001133, grid: 0x00ffff, fog: 0x001133, obstacle: 0x0088ff },
            'classic': { bg: 0x222222, grid: 0x88cc88, fog: 0x222222, obstacle: 0xff0000 }
        };

        const theme = themes[themeName] || themes['google'];
        this.applyTheme(theme);

        // Fix fog for bright themes
        if (themeName === 'google') {
            this.scene.fog = new THREE.FogExp2(theme.fog, 0.015); // Less fog for clarity
        }
    }

    applyTheme(theme) {
        if (!theme) return;

        // Smooth transition could be added here, currently instant
        this.scene.background = new THREE.Color(theme.bg);
        this.scene.fog = new THREE.FogExp2(theme.fog, 0.04);

        // Update Grid Materials
        this.tunnelSegments.forEach(seg => {
            if (seg.material) seg.material.color.setHex(theme.grid);
        });

        // Update Lights
        if (this.tubeLight) this.tubeLight.color.setHex(theme.grid);
    }

    animate(time) {
        requestAnimationFrame(this.animate);

        if (this.isPlaying) {
            this.updatePlayer();
            this.updateTunnel();
            this.checkCollisions();

            this.speed += 0.0001; // Accel
            this.score += 1;

            if (this.score % 10 === 0) {
                document.getElementById('score-val').innerText = this.score.toString().padStart(4, '0');
            }

            // Trigger AI Theme Change every 500 points
            if (this.score > 0 && this.score % 500 === 0) {
                this.gemini.generateTheme(this.score).then(theme => this.applyTheme(theme));
            }

            this.camera.position.x = this.player.position.x * 0.2 + Math.sin(time * 0.005) * 0.2;
        }

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('hud').style.display = 'flex';
        window.game.start();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        window.location.reload();
    });
});
