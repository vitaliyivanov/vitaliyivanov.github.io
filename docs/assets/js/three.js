import * as THREE from 'three';

let camera, scene, renderer, video, xrSession, model, modelReady, fov_x, fov_y, videoWidth, videoHeight;
let objectsToRemove = [];

//const enableWebcamButton = document.getElementById('enableAR');


// Check to see if there is an XR device available that supports immersive VR
  // presentation (for example: displaying in a headset). If the device has that
  // capability the page will want to add an "Enter VR" button to the page (similar to
  // a "Fullscreen" button) that starts the display of immersive VR content.
  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    if (supported) {
      var enterXrBtn = document.createElement("button");
      enterXrBtn.innerHTML = "Enter AR";
      enterXrBtn.addEventListener("click", beginXRSession);
      document.body.appendChild(enterXrBtn);
    } else {
      console.log("Session not supported: " + reason);
    }
  });


async function beginXRSession() {
    initWebGL();
    await initXR();
    window.addEventListener( 'resize', onWindowResize );
}

function initWebGL() {
    // Get a video element to capture the camera feed
    video = document.getElementById('video');
    video.autoplay = true;
    video.playsInline = true;

    // Create a Three.js scene and camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.z = 1;


    //Creating the plane geometry for camera feed and make it full screen
    let ang_rad = camera.fov * Math.PI / 180;
    fov_y = camera.position.z * Math.tan(ang_rad / 2) * 2;
    fov_x = fov_y * camera.aspect;
    console.log("fov_y * camera.aspect=" + fov_y * camera.aspect + " fov_y="+fov_y);
    const geometry = new THREE.PlaneGeometry(fov_x, fov_y);
    const material = new THREE.MeshBasicMaterial({ map: new THREE.VideoTexture(video) });
    const mesh = new THREE.Mesh(geometry, material);
    //mesh.renderOrder = 0;
    scene.add(mesh);

    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
                                           color: '#cc338b',
                                           transparent: true,
                                           opacity: 0.5,
                                           wireframe: true,
                                         });

    const object = new THREE.Mesh(geo, mat);
//    object.scale.x = 0.8;
//    object.scale.y = 0.8;
    object.position.set(0,0,0);
//    scene.add(object);

    // Create a renderer and add it to the DOM
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    // Start capturing the camera feed
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.addEventListener('loadeddata', initTFModel);
        })
        .catch(error => {
            console.error('Unable to access the camera/webcam.', error);
        });
    video.addEventListener("playing", () => {
            videoWidth = video.videoWidth;
            videoHeight = video.videoHeight;
          });
}
function initTFModel(){
    // Before we can use COCO-SSD class we must wait for it to finish
    // loading. Machine Learning models can be large and take a moment
    // to get everything needed to run.
    // Note: cocoSsd is an external object loaded from our index.html
    // script tag import so ignore any warning in Glitch.
    cocoSsd.load().then(function (loadedModel) {
      model = loadedModel;
      modelReady = true;
      // Show demo section now model is ready to use.
      //demosSection.classList.remove('invisible');
    });
}

async function initXR(){
    // Create a WebXR session
    xrSession = await navigator.xr.requestSession('immersive-ar');

    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, renderer.getContext()) });

    // Wait until the XR session is initialized before creating the plane geometry
    await xrSession.requestReferenceSpace('local').then((refSpace) => {

       // camera.aspect = renderer.domElement.width / renderer.domElement.height;
       // camera.updateProjectionMatrix();

        // Start the rendering loop
        xrSession.requestAnimationFrame(render);
    });
}

function render(t, frame){
    let session = frame.session;

    //Object detection and generate object meshes for scene
    predict();

    // Render the scene
    renderer.render(scene, camera);

    // Continue the rendering loop
    xrSession.requestAnimationFrame(render);
}

function predict(){
    if (modelReady) {
             model.detect(video).then(function (predictions) {

                drawObjectDetected(predictions);
                });
    }
}

function drawObjectDetected(predictions){
    // Remove any highlighting we did previous frame.
    clearScene();
    // Now lets loop through predictions and draw them to the live view if
    // they have a high confidence score.
                for (let n = 0; n < predictions.length; n++) {
                  // If we are over 66% sure we are sure we classified it right, draw it!
                  if (predictions[n].score > 0.66 && predictions[n].class === "person") {
    //                const p = document.createElement('p');
    //              bbox: [x, y, width, height],
                    console.log(predictions[n]);

                   // Add detected objects to the scene
                    const [xmin, ymin, xmax, ymax] = predictions[n].bbox;
                    const x = -fov_x/2 + fov_x * (xmax/2 + xmin) / videoWidth ;
                    const y = -fov_y/2 + fov_y * (ymax/2 + ymin) / videoHeight;
                    const z = -camera.near - 0.1;
                    console.log("xmin:" + xmin + " ymin:" + ymin + " xmax:" + xmax + " ymax:" + ymax);
                    console.log("video.height:" + video.height );
                    const geometry = new THREE.PlaneGeometry(fov_x, fov_y);
                    const material = new THREE.MeshBasicMaterial({
                                       color: '#cc338b',
                                       transparent: true,
                                       opacity: 0.5,
                                       wireframe: true,
                                     });
                    const object = new THREE.Mesh(geometry, material);
                    object.scale.x = xmax/videoWidth;
                    object.scale.y = ymax/videoHeight;
                    console.log("x:" + x + " y:" + y + " z:" + z);
                    object.position.set( x , -y, 0);
                    object.quaternion.copy(camera.quaternion);
                    scene.add(object);
                    objectsToRemove.push(object);
                  }
                }
}

function clearScene(){
    if (objectsToRemove) {
        // Loop through the array and remove each object from the scene
        objectsToRemove.forEach((object) => {
          scene.remove(object);

          //Clear from memory
          object.geometry.dispose();
          object.material.dispose();
        });
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight);
}
