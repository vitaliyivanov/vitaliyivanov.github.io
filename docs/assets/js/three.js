let camera, scene, renderer, video;

init();
animate();

function init() {
    // Create a video element to capture the camera feed
    video = document.getElementById('video');
    video.autoplay = true;
    video.playsInline = true;


    // Create a Three.js scene and camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 0.01;

    // Create a plane to display the camera feed
    const geometry = new THREE.PlaneGeometry(16, 9);
    geometry.scale( 0.5, 0.5, 0.5 );
    const material = new THREE.MeshBasicMaterial({ map: new THREE.VideoTexture(video) });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.lookAt( camera.position );
    scene.add(mesh);

    // Create a renderer and add it to the DOM
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize );

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
                    video.srcObject = stream;
                    video.play();
                    }).catch( function ( error ) {

                                            console.error( 'Unable to access the camera/webcam.', error );

                                        } );
}

// Render the scene
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight);
}

