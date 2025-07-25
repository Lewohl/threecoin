import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const SAMPLE_PATH = 'https://raw.githubusercontent.com/materialx/MaterialX/main/resources/Materials/Examples/StandardSurface/';

const samples = [
	'standard_surface_gold.mtlx'
];

let camera, scene, renderer, cardMesh, cardMesh2, cardMesh3, cardGroup;
let normalMapTexture;
let controls;
let dynamicNormalMap, dynamicNormalMapTexture;
let craterRadius = 60; // pixels
let craterDepth = 200.0; // strength of the crater (increase for deeper)
let craterBlur = 1; // pixel blur to steepen crater edges
let rimStrength = 0.8; // 0-1 how bright the rim terrace appears (increase for more pronounced rim)
let isHoveringCard = false; // Track hover state
let mewNormalMapTexture; // For the second card

// Add raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Animation variables for spinning
let spinningCards = new Set();
let animationId;

// Load crater shape normal map
const craterNormalImg = new Image();
// Enable CORS for images loaded from external domains
craterNormalImg.crossOrigin = 'anonymous';
craterNormalImg.src = './normal_map.png';

// Preload base normal map image
let baseNormalImg = new window.Image();
baseNormalImg.crossOrigin = 'anonymous';
baseNormalImg.src = './normal_map.png';

init();

async function init() {

	const container = document.createElement( 'div' );
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 50 );
	camera.position.set( 0, 0, 12 ); // Move back to see all three coins

	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.toneMapping = THREE.LinearToneMapping;
	renderer.toneMappingExposure = 1.2;
	renderer.setAnimationLoop( render );
	container.appendChild( renderer.domElement );

	//

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.enablePan = false;
	controls.minDistance = 8;
	controls.maxDistance = 25;
	controls.enableZoom = true;
	controls.minPolarAngle = 0;
	controls.maxPolarAngle = Math.PI;
	controls.minAzimuthAngle = -Infinity;
	controls.maxAzimuthAngle = Infinity;

	// Add group to hold all cards for collective movement
	cardGroup = new THREE.Group();
	scene.add(cardGroup);

	// Create texture loader once for all cards
	const textureLoader = new THREE.TextureLoader();
	textureLoader.setCrossOrigin( 'anonymous' );

	//

	const directionalLight = new THREE.DirectionalLight( 0xffffff, 2.0 );
	directionalLight.position.set( 10, 5, 10 );
	directionalLight.castShadow = true;
	scene.add( directionalLight );

	const ambientLight = new THREE.AmbientLight( 0x404040, 0.5 );
	scene.add( ambientLight );

	// Create dynamic normal map canvas and texture
	dynamicNormalMap = createDynamicNormalMap(512);
	dynamicNormalMapTexture = new THREE.CanvasTexture( dynamicNormalMap );
	dynamicNormalMapTexture.wrapS = THREE.ClampToEdgeWrapping;
	dynamicNormalMapTexture.wrapT = THREE.ClampToEdgeWrapping;
	dynamicNormalMapTexture.repeat.set( 0.3, 0.3 );
	dynamicNormalMapTexture.offset.set( 0.5, 0.5 );

	new RGBELoader()
		.setPath( './' )
		.load( 'san_giuseppe_bridge_2k.hdr', async ( texture ) => {

			texture.mapping = THREE.EquirectangularReflectionMapping;
			scene.background = new THREE.Color( 0xf5f6fa );
			scene.environment = texture;

			// Create credit card geometry and material (gold card)
			cardMesh = createCreditCardGeometry();
			const goldMaterial = new THREE.MeshPhysicalMaterial({
				color: 0xffd700,
				metalness: 1.0,
				roughness: 0.0,
				envMapIntensity: 1.0
			});

			// Load normal_map.png as normal map for gold card
			console.log('Loading normal_map.png as normal map for gold card...');
			textureLoader.load('./normal_map.png', function(tex) {
				console.log('normal_map.png loaded for gold card:', tex);
				tex.wrapS = THREE.ClampToEdgeWrapping;
				tex.wrapT = THREE.ClampToEdgeWrapping;
				tex.repeat.set(0.3, 0.3);
				tex.offset.set(0.5, 0.5);
				goldMaterial.normalMap = tex;
				goldMaterial.normalScale.set(1, 1);
				goldMaterial.needsUpdate = true;
				cardMesh.material = goldMaterial;
			});

			cardMesh.material = goldMaterial;
			cardMesh.position.x = -2; // Move left
			cardMesh.position.y = 2; // Move up
			cardGroup.add( cardMesh );

			// Create second card (silver, mew normal map)
			cardMesh2 = createCreditCardGeometry();
			const silverMaterial = new THREE.MeshPhysicalMaterial({
				color: 0xc0c0c0,
				metalness: 1.0,
				roughness: 0.1,
				envMapIntensity: 1.0
			});

			// Load normal_map.png as normal map using TextureLoader
			console.log('Loading normal_map.png as normal map for silver card...');
			textureLoader.load('./normal_map.png', function(tex) {
				console.log('normal_map.png loaded:', tex);
				tex.wrapS = THREE.ClampToEdgeWrapping;
				tex.wrapT = THREE.ClampToEdgeWrapping;
				tex.repeat.set(0.3, 0.3);
				tex.offset.set(0.5, 0.5);
				silverMaterial.normalMap = tex;
				silverMaterial.normalScale.set(1, 1); // realistic value
				silverMaterial.needsUpdate = true;
				cardMesh2.material = silverMaterial;
			});
			// preload placeholder
			silverMaterial.normalScale.set(1,1);
			cardMesh2.material = silverMaterial;
			cardMesh2.position.x = 2; // Move right
			cardMesh2.position.y = 2; // Move up
			cardGroup.add(cardMesh2);

            // Create third card (bronze)
            cardMesh3 = createCreditCardGeometry();
            const bronzeMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xcd7f32, // Bronze color
                metalness: 1.0,
                roughness: 0.2,
                envMapIntensity: 1.0
            });

            // Load normal_map.png as normal map for bronze card
            console.log('Loading normal_map.png as normal map for bronze card...');
            textureLoader.load('./normal_map.png', function(tex) {
                console.log('normal_map.png loaded:', tex);
                tex.wrapS = THREE.ClampToEdgeWrapping;
                tex.wrapT = THREE.ClampToEdgeWrapping;
                tex.repeat.set(0.3, 0.3); // Same as other coins
                tex.offset.set(0.5, 0.5); // Same as other coins
                bronzeMaterial.normalMap = tex;
                bronzeMaterial.normalScale.set(4000, 4000); // Same as other coins
                bronzeMaterial.needsUpdate = true;
                cardMesh3.material = bronzeMaterial;
            });

            cardMesh3.material = bronzeMaterial;
            cardMesh3.position.x = 0; // Center
            cardMesh3.position.y = -2; // Move up (still below but higher)
            cardGroup.add(cardMesh3);
		} );

	window.addEventListener( 'resize', onWindowResize );
}

function createCreditCardGeometry() {
	// Square card dimensions (in units)
	const size = 3.0; // Square size
	const thickness = 0.125; // Medium thickness
	// Make the corner radius as large as possible for a pill/oval shape
	const cornerRadius = size / 2; // Fully rounded corners
	
	// Create a rounded rectangle geometry
	const shape = new THREE.Shape();
	
	// Start from top-left corner
	shape.moveTo( -size/2 + cornerRadius, size/2 );
	
	// Top edge
	shape.lineTo( size/2 - cornerRadius, size/2 );
	
	// Top-right corner
	shape.quadraticCurveTo( size/2, size/2, size/2, size/2 - cornerRadius );
	
	// Right edge
	shape.lineTo( size/2, -size/2 + cornerRadius );
	
	// Bottom-right corner
	shape.quadraticCurveTo( size/2, -size/2, size/2 - cornerRadius, -size/2 );
	
	// Bottom edge
	shape.lineTo( -size/2 + cornerRadius, -size/2 );
	
	// Bottom-left corner
	shape.quadraticCurveTo( -size/2, -size/2, -size/2, -size/2 + cornerRadius );
	
	// Left edge
	shape.lineTo( -size/2, size/2 - cornerRadius );
	
	// Top-left corner
	shape.quadraticCurveTo( -size/2, size/2, -size/2 + cornerRadius, size/2 );
	
	// Extrude the shape to create thickness
	const extrudeSettings = {
		steps: 1,
		depth: thickness,
		bevelEnabled: true,
		bevelThickness: 0.02,
		bevelSize: 0.02,
		bevelOffset: 0,
		bevelSegments: 3
	};
	
	const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	
	// Create mesh with placeholder material
	const mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial() );
	
	// Rotate each card 180 degrees around Y axis (90 degrees to the right from current position)
	mesh.rotation.y = Math.PI;
	
	return mesh;
}

function createDynamicNormalMap(size = 512) {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext('2d');
	// Draw base normal map immediately if loaded
	if (baseNormalImg.complete) {
		ctx.drawImage(baseNormalImg, 0, 0, size, size);
	} else {
		baseNormalImg.onload = () => {
			ctx.drawImage(baseNormalImg, 0, 0, size, size);
			if ( dynamicNormalMapTexture ) dynamicNormalMapTexture.needsUpdate = true;
		};
	}
	return canvas;
}

function drawCraterOnNormalMap(x, y) {
	const ctx = dynamicNormalMap.getContext('2d');
	// Always redraw base normal map first
	ctx.clearRect(0, 0, dynamicNormalMap.width, dynamicNormalMap.height);
	ctx.drawImage(baseNormalImg, 0, 0, dynamicNormalMap.width, dynamicNormalMap.height);

	// If the crater normal map is not yet loaded, wait until it loads then redraw
	if (!craterNormalImg.complete) {
		craterNormalImg.onload = () => drawCraterOnNormalMap(x, y);
		return;
	}

	// Draw the pikabolt normal map at the crater position, blending it in
	const size = craterRadius * 2;
	ctx.save();
	ctx.globalAlpha = 1.0; // Full strength
	ctx.globalCompositeOperation = 'multiply'; // Blend mode for normal map effect
	ctx.filter = `blur(${craterBlur}px)`;
	ctx.drawImage(craterNormalImg, x - craterRadius, y - craterRadius, size, size);
	ctx.restore();

	dynamicNormalMapTexture.needsUpdate = true;
}

function createMaterialFromSample( sample ) {
	// Extract material name from filename
	const materialName = sample.replace( '.mtlx', '' );
	
	// Create materials that mimic the MaterialX materials
	let material;
	switch ( materialName ) {
		case 'standard_surface_brass_tiled':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0xb5a642,
				metalness: 0.8,
				roughness: 0.2,
				envMapIntensity: 1.0
			} );
			break;
		
		case 'standard_surface_brick_procedural':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0x8b4513,
				metalness: 0.0,
				roughness: 0.8,
				envMapIntensity: 0.5
			} );
			break;
		
		case 'standard_surface_carpaint':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0xff0000,
				metalness: 0.0,
				roughness: 0.1,
				clearcoat: 1.0,
				clearcoatRoughness: 0.1,
				envMapIntensity: 1.0
			} );
			break;
		
		case 'standard_surface_chrome':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0xffffff,
				metalness: 1.0,
				roughness: 0.0,
				envMapIntensity: 1.0
			} );
			break;
		
		case 'standard_surface_copper':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0xb87333,
				metalness: 0.9,
				roughness: 0.1,
				envMapIntensity: 1.0
			} );
			break;
		
		case 'standard_surface_gold':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0xffd700,
				metalness: 1.0,
				roughness: 0.0,
				envMapIntensity: 1.0
			} );
			break;
		
		case 'standard_surface_jade':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0x00a86b,
				metalness: 0.0,
				roughness: 0.3,
				transmission: 0.8,
				thickness: 0.5,
				envMapIntensity: 0.8
			} );
			break;
		
		case 'standard_surface_marble_solid':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0xf5f5dc,
				metalness: 0.0,
				roughness: 0.1,
				envMapIntensity: 0.7
			} );
			break;
		
		case 'standard_surface_metal_brushed':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0x808080,
				metalness: 0.8,
				roughness: 0.4,
				envMapIntensity: 0.8
			} );
			break;
		
		case 'standard_surface_plastic':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0x00ff00,
				metalness: 0.0,
				roughness: 0.3,
				envMapIntensity: 0.5
			} );
			break;
		
		case 'standard_surface_velvet':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0x800080,
				metalness: 0.0,
				roughness: 0.9,
				envMapIntensity: 0.3
			} );
			break;
		
		case 'standard_surface_wood_tiled':
			material = new THREE.MeshPhysicalMaterial( {
				color: 0x8b4513,
				metalness: 0.0,
				roughness: 0.7,
				envMapIntensity: 0.4
			} );
			break;
		
		default:
			// Fallback to a random colored material
			material = new THREE.MeshPhysicalMaterial( {
				color: Math.random() * 0xffffff,
				metalness: Math.random() * 0.5,
				roughness: Math.random() * 0.8,
				envMapIntensity: 0.7
			} );
			break;
	}
	
	// Add normal map to all materials
	if ( dynamicNormalMapTexture ) {
		material.normalMap = dynamicNormalMapTexture;
		material.normalScale.set( 4000, 4000 ); // Much deeper normal map intensity
		
		// Center the normal map perfectly on each card
		material.normalMap.wrapS = THREE.ClampToEdgeWrapping;
		material.normalMap.wrapT = THREE.ClampToEdgeWrapping;
		material.normalMap.repeat.set( 0.3, 0.3 ); // Make it smaller for better centering
		material.normalMap.offset.set( 0.5, 0.5 ); // Move right and down
	}
	
	return material;
}

function resetNormalMap() {
	const ctx = dynamicNormalMap.getContext('2d');
	ctx.clearRect(0, 0, dynamicNormalMap.width, dynamicNormalMap.height);
	ctx.drawImage(baseNormalImg, 0, 0, dynamicNormalMap.width, dynamicNormalMap.height);
	dynamicNormalMapTexture.needsUpdate = true;
}

//

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {
	controls.update();
	renderer.render( scene, camera );
}

// Removed mouse over crater effect event listeners.

// Add drag functionality for the card group




// Add click event listener for spinning coins
renderer.domElement.addEventListener('click', function(event) {
	// Calculate mouse position in normalized device coordinates
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	// Update the picking ray with the camera and mouse position
	raycaster.setFromCamera(mouse, camera);

	// Create an array of all clickable objects
	const clickableObjects = [cardMesh, cardMesh2, cardMesh3];

	// Calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObjects(clickableObjects);

	if (intersects.length > 0) {
		const clickedCard = intersects[0].object;
		
		// Only spin if not already spinning
		if (!spinningCards.has(clickedCard)) {
			spinningCards.add(clickedCard);
			spinCard(clickedCard);
		}
	}
});

// Function to spin a card with negative pre-spin then full 360 with overshoot
function spinCard(card) {
	const startRotation = card.rotation.y;
	const negativeSpin = -Math.PI * 0.3; // Small negative spin first
	const fullSpin = Math.PI * 2.1; // Full 360 + slight overshoot (further reduced)
	const totalDuration = 2000; // 2 seconds total (increased for smoother end)
	const negativeDuration = 300; // 300ms for negative spin
	const positiveDuration = 1700; // 1700ms for positive spin (increased)
	const startTime = Date.now();

	function animate() {
		const elapsed = Date.now() - startTime;
		const totalProgress = Math.min(elapsed / totalDuration, 1);
		
		let currentRotation;
		
		if (elapsed < negativeDuration) {
			// Phase 1: Negative spin
			const negativeProgress = elapsed / negativeDuration;
			const easeOutQuart = 1 - Math.pow(1 - negativeProgress, 4);
			currentRotation = startRotation + negativeSpin * easeOutQuart;
		} else {
			// Phase 2: Positive spin with smooth easing to final position
			const positiveProgress = (elapsed - negativeDuration) / positiveDuration;
			
			// Use easeOutExpo for very smooth deceleration
			const easeOutExpo = positiveProgress === 1 ? 1 : 1 - Math.pow(2, -10 * positiveProgress);
			
			// Calculate the target rotation (exactly 360 degrees from start)
			const targetRotation = startRotation + Math.PI * 2;
			
			// Start from the negative spin position and smoothly go to target
			const startPos = startRotation + negativeSpin;
			currentRotation = startPos + (targetRotation - startPos) * easeOutExpo;
		}
		
		card.rotation.y = currentRotation;
		
		if (totalProgress < 1) {
			animationId = requestAnimationFrame(animate);
		} else {
			// Animation complete, remove from spinning set
			spinningCards.delete(card);
		}
	}
	
	animate();
} 