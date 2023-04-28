// Load the model
//const model = await tf.loadGraphModel('model.json');
const model = await mobilenet.load();

// Get the video feed from the camera
const video = document.getElementById('video');
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
video.srcObject = stream;

// Get the canvas for rendering
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

// Create a WebGL context for rendering in WebXR
const gl = canvas.getContext('webgl', { xrCompatible: true });

// Create a WebXR session
const xrSession = await navigator.xr.requestSession('immersive-ar', {
  requiredFeatures: ['hit-test'],
});

// Create a hit test source
const hitTestSource = await xrSession.requestHitTestSource({ space: 'local' });

// Start the rendering loop
xrSession.requestAnimationFrame(render);

function render(t, frame) {
  // Get the pose of the camera
  const pose = frame.getViewerPose(xrSession.referenceSpace);

  // Perform hit testing to detect objects in the real world
  const hitTestResults = frame.getHitTestResults(hitTestSource);

  // Loop through the hit test results and render objects if they are detected
  for (const hitTestResult of hitTestResults) {
    // Get the position and orientation of the hit test result
    const { transform } = hitTestResult;

    // Apply the position and orientation to a 3D object
    const object = new THREE.Object3D();
    object.position.set(transform.position.x, transform.position.y, transform.position.z);
    object.quaternion.set(transform.orientation.x, transform.orientation.y, transform.orientation.z, transform.orientation.w);

    // Use TensorFlow.js to detect objects in the video feed
    const image = tf.browser.fromPixels(video);
    const predictions = model.execute({ image });

    // Loop through the predictions and render bounding boxes around the detected objects
    const boxes = predictions[0].dataSync();
    const scores = predictions[1].dataSync();
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > 0.5) {
        const [ymin, xmin, ymax, xmax] = boxes.slice(i * 4, (i + 1) * 4);
        const width = xmax - xmin;
        const height = ymax - ymin;
        const box = new THREE.Box3(new THREE.Vector3(xmin, ymax, 0), new THREE.Vector3(xmax, ymin, 0));
        const boxHelper = new THREE.Box3Helper(box, 0xffff00);
        object.add(boxHelper);
      }
    }

    // Add the object to the scene
    scene.add(object);
  }

  // Render the scene
  renderer.render(scene, camera);

  // Continue the rendering loop
  xrSession.requestAnimationFrame(render);
}