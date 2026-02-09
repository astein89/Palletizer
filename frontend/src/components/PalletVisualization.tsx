import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Arrangement } from '../types';

interface PalletVisualizationProps {
  arrangement: Arrangement;
  palletDimensions?: { length: number; width: number; height: number; max_length: number; max_width: number; max_height: number; max_overhang?: number };
}

type ViewMode = '3d' | 'front' | 'side' | 'layer';

export interface PalletVisualizationHandle {
  captureImages: (width?: number, height?: number) => Promise<{ view3d: string; front: string; side: string; layer: string }>;
}

const PalletVisualization = forwardRef<PalletVisualizationHandle, PalletVisualizationProps>(({ arrangement, palletDimensions }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [currentLayer, setCurrentLayer] = useState<number>(arrangement.layers.length); // Start showing all layers
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverhang, setShowOverhang] = useState(false); // Hide overhang by default
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // Update currentLayer when arrangement changes to show all layers by default
  useEffect(() => {
    const totalLayers = arrangement.layers.length;
    if (totalLayers > 0) {
      setCurrentLayer(totalLayers);
    }
  }, [arrangement.layers.length, arrangement.totalLayers]);

  // Calculate bounding box for auto-framing (needed by both useEffect and captureImages)
  const calculateBounds = (filterLayer?: number) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    arrangement.layers.forEach((layer) => {
      if (filterLayer !== undefined && layer.layerNumber !== filterLayer) {
        return;
      }
      
      layer.boxes.forEach((box) => {
        const halfWidth = box.boxWidth / 2;
        const halfLength = box.boxLength / 2;

        minX = Math.min(minX, box.x);
        maxX = Math.max(maxX, box.x + box.boxWidth);
        minY = Math.min(minY, box.y);
        maxY = Math.max(maxY, box.y + box.boxLength);
        minZ = Math.min(minZ, box.z);
        maxZ = Math.max(maxZ, box.z + box.boxHeight);
      });
    });

    // If no boxes, use base pallet dimensions
    // Note: In algorithm, x = width, y = length, z = height
    const basePalletLength = palletDimensions?.length || 48;
    const basePalletWidth = palletDimensions?.width || 40;
    if (minX === Infinity) {
      return {
        minX: 0,
        maxX: basePalletWidth,  // width direction
        minY: 0,
        maxY: basePalletLength,  // length direction
        minZ: 0,
        maxZ: (palletDimensions?.height || 6) + 10
      };
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
  };

  // Expose captureImages method via ref
  useImperativeHandle(ref, () => ({
    captureImages: async (width = 800, height = 600): Promise<{ view3d: string; front: string; side: string; layer: string }> => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !containerRef.current) {
        throw new Error('Visualization not ready');
      }

      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const originalSize = { width: renderer.domElement.width, height: renderer.domElement.height };
      const originalViewMode = viewMode;
      const originalCurrentLayer = currentLayer;

      // Temporarily resize renderer for image capture
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const images: { view3d: string; front: string; side: string; layer: string } = {
        view3d: '',
        front: '',
        side: '',
        layer: ''
      };

      // Helper function to set camera for a specific view
      const setCameraForView = (mode: ViewMode, layerNum?: number) => {
        if (!palletDimensions) return;

        const basePalletLength = palletDimensions.length || 48;
        const basePalletWidth = palletDimensions.width || 40;
        const palletHeight = palletDimensions.height || 6;

        // Calculate bounds
        const bounds = calculateBounds(layerNum);
        const center = new THREE.Vector3(
          (bounds.minX + bounds.maxX) / 2,
          (bounds.minY + bounds.maxY) / 2,
          (bounds.minZ + bounds.maxZ) / 2
        );

        const size = Math.max(
          bounds.maxX - bounds.minX || basePalletWidth,
          bounds.maxY - bounds.minY || basePalletLength,
          bounds.maxZ - bounds.minZ || 10
        );

        const fov = camera.fov * (Math.PI / 180);
        const aspect = width / height;
        const padding = mode === 'front' || mode === 'side' ? 1.4 * 1.3 : 1.4;
        const requiredSize = mode === '3d' 
          ? Math.sqrt(Math.pow(bounds.maxX - bounds.minX, 2) + Math.pow(bounds.maxZ - bounds.minZ, 2) + Math.pow(bounds.maxY - bounds.minY, 2)) * 1.0
          : mode === 'front' || mode === 'side'
          ? Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)
          : Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        
        const viewportSize = mode === '3d' ? requiredSize : Math.max(requiredSize, requiredSize / aspect);
        const baseDistance = (viewportSize / 2) / Math.tan(fov / 2);
        const distance = baseDistance * padding;

        switch (mode) {
          case 'front':
            camera.position.set(center.x, center.y, center.z + distance);
            controlsRef.current?.target.copy(center);
            break;
          case 'side':
            camera.position.set(center.x + distance, center.y, center.z);
            controlsRef.current?.target.copy(center);
            break;
          case 'layer':
            const topVisibleLayer = arrangement.layers[layerNum !== undefined ? layerNum - 1 : arrangement.layers.length - 1];
            const layerZ = topVisibleLayer?.boxes[0]?.z || 0;
            const layerCenter = new THREE.Vector3(
              center.x,
              layerZ + palletHeight + (topVisibleLayer?.boxes[0]?.boxHeight || 0) / 2,
              center.z
            );
            camera.position.set(layerCenter.x, layerCenter.y + distance, layerCenter.z);
            controlsRef.current?.target.copy(layerCenter);
            break;
          case '3d':
          default:
            const isometricDistance = distance * 1.0;
            camera.position.set(
              center.x + isometricDistance * 0.7,
              center.y + isometricDistance * 0.7,
              center.z + isometricDistance * 0.7
            );
            controlsRef.current?.target.copy(center);
            break;
        }
        camera.updateProjectionMatrix();
        controlsRef.current?.update();
      };

      // Capture 3D view
      setCameraForView('3d');
      renderer.render(scene, camera);
      images.view3d = renderer.domElement.toDataURL('image/png');

      // Capture front view
      setCameraForView('front');
      renderer.render(scene, camera);
      images.front = renderer.domElement.toDataURL('image/png');

      // Capture side view
      setCameraForView('side');
      renderer.render(scene, camera);
      images.side = renderer.domElement.toDataURL('image/png');

      // Capture layer view (top layer)
      setCameraForView('layer', arrangement.layers.length);
      renderer.render(scene, camera);
      images.layer = renderer.domElement.toDataURL('image/png');

      // Restore original size
      renderer.setSize(originalSize.width, originalSize.height);
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      
      // Restore camera position for original view
      setCameraForView(originalViewMode, originalCurrentLayer);
      renderer.render(scene, camera);

      return images;
    }
  }), [arrangement, palletDimensions, viewMode, currentLayer, showOverhang]);

  // Get pallet dimensions - use base dimensions for visualization
  const basePalletLength = palletDimensions?.length || 48;
  const basePalletWidth = palletDimensions?.width || 40;
  const palletHeight = palletDimensions?.height || 6;
  // Max dimensions for overhang checking
  const maxPalletLength = palletDimensions?.max_length || basePalletLength;
  const maxPalletWidth = palletDimensions?.max_width || basePalletWidth;

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add OrbitControls for interactive camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.minDistance = 10;
    controls.maxDistance = 1000;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(50, 100, 50);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);

    // Draw pallet base
    // In algorithm: x = width direction (columns), y = length direction (rows), z = height
    // In Three.js: X = width, Y = height, Z = length (depth)
    // So: basePalletWidth -> X, basePalletLength -> Z, palletHeight -> Y
    
    // Calculate pallet positioning
    // Boxes are always centered on base pallet dimensions to ensure even overhang distribution
    // The pallet should be centered on base dimensions to align with where boxes are positioned
    // Always center pallet on base dimensions (boxes are centered on base, not max)
    const palletCenterX = basePalletWidth / 2;
    const palletCenterZ = basePalletLength / 2;
    
    const palletGeometry = new THREE.BoxGeometry(basePalletWidth, palletHeight, basePalletLength);
    const palletMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      roughness: 0.8,
      metalness: 0.2
    });
    const pallet = new THREE.Mesh(palletGeometry, palletMaterial);
    // Center the pallet to align with box positions
    pallet.position.set(palletCenterX, palletHeight / 2, palletCenterZ);
    pallet.receiveShadow = true;
    scene.add(pallet);

    // Add pallet edges for better visibility
    const edges = new THREE.EdgesGeometry(palletGeometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x654321, linewidth: 2 })
    );
    line.position.copy(pallet.position);
    scene.add(line);

    // Color palette for distinguishing boxes
    const layerColors = [
      0x3b82f6, // Blue
      0x10b981, // Green
      0xf59e0b, // Amber
      0xef4444, // Red
      0x8b5cf6, // Purple
      0xec4899, // Pink
      0x06b6d4, // Cyan
      0x84cc16, // Lime
    ];

    // Draw boxes with better distinction
    const boxMeshes: THREE.Mesh[] = [];
    arrangement.layers.forEach((layer, layerIndex) => {
      // Show layers from bottom up: show layers 1 through currentLayer
      // currentLayer = number of layers to show (1 = only first layer, N = all layers)
      if (layer.layerNumber > currentLayer) {
        return;
      }

      const layerColor = layerColors[layerIndex % layerColors.length];
      
      layer.boxes.forEach((box, boxIndex) => {
        // Check for overhang relative to base pallet dimensions
        const baseWidth = palletDimensions?.width || basePalletWidth;
        const baseLength = palletDimensions?.length || basePalletLength;
        const maxHeight = palletDimensions?.max_height || 84;
        
        // Calculate overhang amounts for each side (with small threshold to avoid floating point issues)
        const threshold = 0.001;
        // Left: how much extends to the left of pallet (x < 0)
        const leftOverhang = box.x < -threshold ? Math.abs(box.x) : 0;
        // Right: how much extends beyond base width
        const rightOverhang = (box.x + box.boxWidth) > (baseWidth + threshold) ? (box.x + box.boxWidth) - baseWidth : 0;
        // Front: how much extends to the front of pallet (y < 0)
        const frontOverhang = box.y < -threshold ? Math.abs(box.y) : 0;
        // Back: how much extends beyond base length
        const backOverhang = (box.y + box.boxLength) > (baseLength + threshold) ? (box.y + box.boxLength) - baseLength : 0;
        // Top: how much extends beyond max height
        const topOverhang = (box.z + box.boxHeight) > (maxHeight + threshold) ? (box.z + box.boxHeight) - maxHeight : 0;
        
        // Calculate overhang amounts for rendering red portions (when showOverhang is true)
        // These are used only for the red overhang visualization
        
        // Calculate the actual Y range for left/right overhangs (accounting for front/back overhangs)
        const leftRightOverhangYStart = box.y;
        const leftRightOverhangYLength = box.boxLength;
        
        // Calculate the actual X range for front/back overhangs (accounting for left/right overhangs)
        const frontBackOverhangXStart = box.x;
        const frontBackOverhangXLength = box.boxWidth;
        
        // Use different shades for boxes in the same layer
        const colorVariation = (boxIndex % 3) * 0.1;
        const color = new THREE.Color(layerColor);
        color.offsetHSL(0, 0, colorVariation - 0.1);
        
        // Always draw the full box (regardless of overhang)
        const boxGeometry = new THREE.BoxGeometry(box.boxWidth, box.boxHeight, box.boxLength);
        const boxMaterial = new THREE.MeshStandardMaterial({ 
          color,
          roughness: 0.7,
          metalness: 0.1,
        });
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        
        // Position the full box at its actual position
        boxMesh.position.set(
          box.x + box.boxWidth / 2,
          box.z + box.boxHeight / 2 + palletHeight,
          box.y + box.boxLength / 2
        );
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        scene.add(boxMesh);
        boxMeshes.push(boxMesh);
        
        // Add edges/outline to clearly show box boundaries
        const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ 
          color: 0x000000, // Black outline for clear visibility
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edges.position.copy(boxMesh.position);
        scene.add(edges);
        boxMeshes.push(edges as any); // Store for cleanup
        
        // Draw overhanging portions in red (only if showOverhang is enabled)
        if (showOverhang) {
          const overhangColor = 0xef4444; // Red
          
          // Left overhang
          if (leftOverhang > 0) {
            const leftGeometry = new THREE.BoxGeometry(leftOverhang, box.boxHeight, leftRightOverhangYLength);
            const leftMaterial = new THREE.MeshStandardMaterial({ 
              color: overhangColor,
              roughness: 0.7,
              metalness: 0.1,
              emissive: 0x330000,
            });
            const leftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
            leftMesh.position.set(
              box.x + leftOverhang / 2,
              box.z + box.boxHeight / 2 + palletHeight,
              leftRightOverhangYStart + leftRightOverhangYLength / 2
            );
            leftMesh.castShadow = true;
            scene.add(leftMesh);
            boxMeshes.push(leftMesh);
          }
          
          // Right overhang
          if (rightOverhang > 0) {
            const rightGeometry = new THREE.BoxGeometry(rightOverhang, box.boxHeight, leftRightOverhangYLength);
            const rightMaterial = new THREE.MeshStandardMaterial({ 
              color: overhangColor,
              roughness: 0.7,
              metalness: 0.1,
              emissive: 0x330000,
            });
            const rightMesh = new THREE.Mesh(rightGeometry, rightMaterial);
            rightMesh.position.set(
              baseWidth + rightOverhang / 2,
              box.z + box.boxHeight / 2 + palletHeight,
              leftRightOverhangYStart + leftRightOverhangYLength / 2
            );
            rightMesh.castShadow = true;
            scene.add(rightMesh);
            boxMeshes.push(rightMesh);
          }
          
          // Front overhang
          if (frontOverhang > 0) {
            const frontGeometry = new THREE.BoxGeometry(frontBackOverhangXLength, box.boxHeight, frontOverhang);
            const frontMaterial = new THREE.MeshStandardMaterial({ 
              color: overhangColor,
              roughness: 0.7,
              metalness: 0.1,
              emissive: 0x330000,
            });
            const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
            frontMesh.position.set(
              frontBackOverhangXStart + frontBackOverhangXLength / 2,
              box.z + box.boxHeight / 2 + palletHeight,
              box.y + frontOverhang / 2
            );
            frontMesh.castShadow = true;
            scene.add(frontMesh);
            boxMeshes.push(frontMesh);
          }
          
          // Back overhang
          if (backOverhang > 0) {
            const backGeometry = new THREE.BoxGeometry(frontBackOverhangXLength, box.boxHeight, backOverhang);
            const backMaterial = new THREE.MeshStandardMaterial({ 
              color: overhangColor,
              roughness: 0.7,
              metalness: 0.1,
              emissive: 0x330000,
            });
            const backMesh = new THREE.Mesh(backGeometry, backMaterial);
            backMesh.position.set(
              frontBackOverhangXStart + frontBackOverhangXLength / 2,
              box.z + box.boxHeight / 2 + palletHeight,
              baseLength + backOverhang / 2
            );
            backMesh.castShadow = true;
            scene.add(backMesh);
            boxMeshes.push(backMesh);
          }
          
          // Top overhang
          if (topOverhang > 0) {
            const topGeometry = new THREE.BoxGeometry(box.boxWidth, topOverhang, box.boxLength);
            const topMaterial = new THREE.MeshStandardMaterial({ 
              color: overhangColor,
              roughness: 0.7,
              metalness: 0.1,
              emissive: 0x330000,
            });
            const topMesh = new THREE.Mesh(topGeometry, topMaterial);
            topMesh.position.set(
              box.x + box.boxWidth / 2,
              maxHeight + topOverhang / 2 + palletHeight,
              box.y + box.boxLength / 2
            );
            topMesh.castShadow = true;
            scene.add(topMesh);
            boxMeshes.push(topMesh);
          }
        }
      });
    });

    // Calculate bounds and frame the scene (show layers up to currentLayer)
    // Recalculate bounds for only visible layers (1 through currentLayer)
    let visibleMinX = Infinity, visibleMaxX = -Infinity;
    let visibleMinY = Infinity, visibleMaxY = -Infinity;
    let visibleMinZ = Infinity, visibleMaxZ = -Infinity;
    
    arrangement.layers.forEach((layer) => {
      if (layer.layerNumber <= currentLayer) {
        layer.boxes.forEach((box) => {
          visibleMinX = Math.min(visibleMinX, box.x);
          visibleMaxX = Math.max(visibleMaxX, box.x + box.boxWidth);
          visibleMinY = Math.min(visibleMinY, box.y);
          visibleMaxY = Math.max(visibleMaxY, box.y + box.boxLength);
          visibleMinZ = Math.min(visibleMinZ, box.z);
          visibleMaxZ = Math.max(visibleMaxZ, box.z + box.boxHeight);
        });
      }
    });
    
    // If no visible boxes, use base pallet dimensions
    if (visibleMinX === Infinity) {
      visibleMinX = 0;
      visibleMaxX = basePalletWidth;
      visibleMinY = 0;
      visibleMaxY = basePalletLength;
      visibleMinZ = 0;
      visibleMaxZ = palletHeight + 10;
    }
    
    const bounds = {
      minX: visibleMinX,
      maxX: visibleMaxX,
      minY: visibleMinY,
      maxY: visibleMaxY,
      minZ: visibleMinZ,
      maxZ: visibleMaxZ
    };
    
    // Coordinate mapping: algorithm x->Three.js X (width), algorithm y->Three.js Z (length), algorithm z->Three.js Y (height)
    // Calculate center of the arrangement
    const center = new THREE.Vector3(
      (bounds.minX + bounds.maxX) / 2,  // X = width direction
      (bounds.minZ + bounds.maxZ) / 2 + palletHeight,  // Y = height direction
      (bounds.minY + bounds.maxY) / 2  // Z = length direction
    );
    const size = Math.max(
      bounds.maxX - bounds.minX || basePalletWidth,
      bounds.maxY - bounds.minY || basePalletLength,
      bounds.maxZ - bounds.minZ || 10
    );

    // Set camera position based on view mode
    const updateCamera = () => {
      if (!cameraRef.current || !controlsRef.current || !containerRef.current) return;
      
      // Calculate distance to fill viewport with padding
      // Use the camera's field of view and aspect ratio to calculate proper distance
      const fov = cameraRef.current.fov * (Math.PI / 180); // Convert to radians
      const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      const padding = 1.4; // 40% padding for comfortable viewing (reduced zoom)
      
      // Calculate the bounding box dimensions in screen space
      const boundsWidth = bounds.maxX - bounds.minX;
      const boundsHeight = bounds.maxZ - bounds.minZ; // Z is depth in 3D view
      const boundsDepth = bounds.maxY - bounds.minY;
      
      // For 3D isometric view, we need to account for the diagonal view
      // The visible size depends on the projection angle
      let requiredSize: number;
      
      if (viewMode === '3d') {
        // For isometric view, calculate the diagonal size
        const diagonalSize = Math.sqrt(
          Math.pow(boundsWidth, 2) + 
          Math.pow(boundsHeight, 2) + 
          Math.pow(boundsDepth, 2)
        );
        // Account for the isometric angle (roughly 45 degrees)
        requiredSize = diagonalSize * 1.0; // Use full diagonal for better fit
      } else {
        // For orthographic views (front, side, layer), use the relevant dimension
        if (viewMode === 'front' || viewMode === 'side') {
          requiredSize = Math.max(boundsWidth, boundsHeight);
        } else {
          // Layer view (top-down)
          requiredSize = Math.max(boundsWidth, boundsDepth);
        }
      }
      
      // Calculate distance: distance = (size / 2) / tan(fov / 2)
      // Account for aspect ratio - use the dimension that fills the viewport
      const viewportSize = viewMode === '3d' 
        ? requiredSize 
        : Math.max(requiredSize, requiredSize / aspect);
      
      const baseDistance = (viewportSize / 2) / Math.tan(fov / 2);
      
      // Apply different padding for different view modes
      let viewPadding = padding;
      if (viewMode === 'front' || viewMode === 'side') {
        viewPadding = padding * 1.3; // Extra zoom out for front/side views
      }
      
      const distance = baseDistance * viewPadding;
      
      switch (viewMode) {
        case 'front':
          // Front view: look from positive Z (length direction)
          camera.position.set(center.x, center.y, center.z + distance);
          controlsRef.current.target.copy(center);
          controlsRef.current.update();
          break;
        case 'side':
          // Side view: look from positive X (width direction)
          camera.position.set(center.x + distance, center.y, center.z);
          controlsRef.current.target.copy(center);
          controlsRef.current.update();
          break;
        case 'layer':
          // Show from top for layer view - show the topmost visible layer
          const topVisibleLayer = arrangement.layers[currentLayer - 1];
          const layerZ = topVisibleLayer?.boxes[0]?.z || 0;
          const layerCenter = new THREE.Vector3(
            center.x,
            layerZ + palletHeight + (topVisibleLayer?.boxes[0]?.boxHeight || 0) / 2,
            center.z
          );
          camera.position.set(layerCenter.x, layerCenter.y + distance, layerCenter.z);
          controlsRef.current.target.copy(layerCenter);
          controlsRef.current.update();
          break;
        case '3d':
        default:
          // Isometric view - position at equal angles
          const isometricDistance = distance * 1.0; // Use full calculated distance
          camera.position.set(
            center.x + isometricDistance * 0.7,
            center.y + isometricDistance * 0.7,
            center.z + isometricDistance * 0.7
          );
          controlsRef.current.target.copy(center);
          controlsRef.current.update();
          break;
      }
      camera.updateProjectionMatrix();
    };

    updateCamera();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update(); // Update controls for damping
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      updateCamera();
    };
    window.addEventListener('resize', handleResize);
    
    // Handle fullscreen change
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      // Resize renderer after fullscreen change
      setTimeout(() => {
        handleResize();
      }, 100);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (containerRef.current && rendererRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          // Element already removed
        }
      }
      rendererRef.current?.dispose();
    };
  }, [arrangement, viewMode, currentLayer, palletDimensions, showOverhang]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-dark-text">3D Visualization</h3>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowOverhang(!showOverhang)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              showOverhang
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-dark-surfaceHover text-dark-textSecondary hover:text-dark-text'
            }`}
            title={showOverhang ? 'Hide overhang indicators' : 'Show overhang indicators'}
          >
            {showOverhang ? '🔴 Overhang' : '⚪ Overhang'}
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === '3d'
                ? 'bg-dark-primary text-white'
                : 'bg-dark-surfaceHover text-dark-textSecondary hover:text-dark-text'
            }`}
          >
            3D
          </button>
          <button
            onClick={() => setViewMode('front')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'front'
                ? 'bg-dark-primary text-white'
                : 'bg-dark-surfaceHover text-dark-textSecondary hover:text-dark-text'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setViewMode('side')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'side'
                ? 'bg-dark-primary text-white'
                : 'bg-dark-surfaceHover text-dark-textSecondary hover:text-dark-text'
            }`}
          >
            Side
          </button>
          <button
            onClick={() => setViewMode('layer')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'layer'
                ? 'bg-dark-primary text-white'
                : 'bg-dark-surfaceHover text-dark-textSecondary hover:text-dark-text'
            }`}
          >
            Layer
          </button>
          <button
            onClick={async () => {
              await toggleFullscreen(fullscreenRef.current, isFullscreen);
            }}
            className="px-3 py-1 text-sm rounded bg-dark-surfaceHover text-dark-textSecondary hover:text-dark-text hover:bg-dark-border transition-colors"
            title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
          >
            {isFullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {/* 3D Visualization */}
      <div 
        ref={fullscreenRef}
        className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-dark-surface' : ''}`}
      >
        <div 
          ref={containerRef} 
          className={`w-full border border-dark-border rounded-md bg-dark-surface ${
            isFullscreen ? 'h-screen' : 'h-[600px]'
          }`} 
        />
        <div className="absolute bottom-2 left-2 bg-dark-surface/80 backdrop-blur-sm px-3 py-2 rounded text-xs text-dark-textSecondary border border-dark-border">
          <div>🖱️ Left click + drag: Rotate</div>
          <div>🖱️ Right click + drag: Pan</div>
          <div>🖱️ Scroll: Zoom</div>
          {isFullscreen && (
            <div className="mt-1 pt-1 border-t border-dark-border">
              <button
                onClick={async () => {
                  try {
                    if (document.exitFullscreen) {
                      await document.exitFullscreen();
                    } else if ((document as any).webkitExitFullscreen) {
                      await (document as any).webkitExitFullscreen();
                    } else if ((document as any).mozCancelFullScreen) {
                      await (document as any).mozCancelFullScreen();
                    } else if ((document as any).msExitFullscreen) {
                      await (document as any).msExitFullscreen();
                    }
                  } catch (error) {
                    console.error('Error exiting fullscreen:', error);
                  }
                }}
                className="text-dark-primary hover:text-dark-primaryHover font-medium"
              >
                Press ESC or click here to exit fullscreen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PalletVisualization.displayName = 'PalletVisualization';

export default PalletVisualization;

function toggleFullscreen(element: HTMLDivElement | null, isFullscreen: boolean): Promise<void> {
  if (!element) return Promise.resolve();

  if (!isFullscreen) {
    // Enter fullscreen
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      return (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      return (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {
      return (element as any).msRequestFullscreen();
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      return (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      return (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      return (document as any).msExitFullscreen();
    }
  }
  return Promise.resolve();
}
