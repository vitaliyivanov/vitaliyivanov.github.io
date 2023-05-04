// Create a video element to capture the camera feed
const video = document.createElement('video');
video.autoplay = true;
video.playsInline = true;

// Create a Three.js scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create a plane to display the camera feed
const geometry = new THREE.PlaneGeometry(4, 3);
const material = new THREE.MeshBasicMaterial({ map: new THREE.VideoTexture(video) });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Set up the WebXR session
let xrSession = null;
navigator.xr.requestSession('immersive-ar', {
  requiredFeatures: ['hit-test']
}).then(session => {
  xrSession = session;

  // Create a reference space and add it to the session
  xrSession.requestReferenceSpace('viewer').then(referenceSpace => {
    xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(xrSession, renderer)
    });

    // Add the camera feed to the scene
    scene.add(mesh);

    // Start rendering the scene in the WebXR session
    function render(timestamp, frame) {
      const pose = frame.getViewerPose(referenceSpace);

      if (pose) {
        const view = pose.views[0];
        camera.projectionMatrix.fromArray(view.projectionMatrix);
        camera.matrix.fromArray(view.transform.matrix);
        camera.updateMatrixWorld();

        // Update the video texture with the camera feed
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          videoTexture.needsUpdate = true;
        }

        renderer.render(scene, camera);
      }

      xrSession.requestAnimationFrame(render);
    }

    xrSession.requestAnimationFrame(render);
  });
}).catch(console.error);

// Create a renderer and add it to the DOM
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
