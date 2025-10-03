/** @description 主要用於渲染 R3F 的 Canvas，顯示 3D 模型（帽子）與 FaceDepth 遮罩等。是視覺渲染的主場景。 */

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import AvatarManager from "@/classes/AvatarManager";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import { OrbitControls, Float, Text3D } from "@react-three/drei";
import * as THREE from "three";
import { getStickerFilenames } from "@/utils/getStickerFilenames";

interface AvatarCanvasProps {
  width: number;
  height: number;
  url: string;
  onCanvasReady?: (el: HTMLCanvasElement) => void;
  // mirrored: boolean;
  // videoRef: React.RefObject<HTMLVideoElement>;
}

function CanvasProbe({
  onReady,
}: {
  onReady?: (el: HTMLCanvasElement) => void;
}) {
  const { gl } = useThree();
  useEffect(() => {
    onReady?.(gl.domElement as HTMLCanvasElement);
  }, [gl, onReady]);
  return null;
}

// const VideoPlane = ({ video }: { video: HTMLVideoElement }) => {
//   const texture = new THREE.VideoTexture(video);
//   texture.minFilter = THREE.LinearFilter;
//   texture.magFilter = THREE.LinearFilter;
//   texture.format = THREE.RGBAFormat;

//   return (
//     <mesh position={[0, 0, -0.1]} renderOrder={-1}>
//       <planeGeometry args={[2, 2]} />
//       <meshBasicMaterial map={texture} toneMapped={false} />
//     </mesh>
//   );
// };

const AvatarCanvas = ({
  width,
  height,
  url,
  onCanvasReady,
}: AvatarCanvasProps) => {
  const [scene, setScene] = useState<THREE.Scene | null>();
  const [isLoading, setIsLoading] = useState(true);
  const avatarManagerRef = useRef<AvatarManager>(AvatarManager.getInstance());
  const requestRef = useRef(0);

  const stickerFilenames = getStickerFilenames();

  const animate = () => {
    const results = FaceLandmarkManager.getInstance().getResults();
    avatarManagerRef.current.updateFacialTransforms(results, true);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const avatarManager = AvatarManager.getInstance();
    avatarManager
      .loadModel(url, stickerFilenames)
      .then(() => {
        setScene(avatarManager.getScene());
        setIsLoading(false);
      })
      .catch((e) => {
        alert(e);
      });
  }, [url]);

  if (!width || !height || !url) return null;

  return (
    <div
      className="absolute top-0 left-0"
      style={{ width: width, height: height }}
    >
      <Canvas
        camera={{ fov: 30, position: [0, 0.5, 1] }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          // gl.setSize(width, height); // 👈 設定 canvas 寬高
          // gl.setPixelRatio(1); // 👈 保證不被 DPR 放大
          gl.toneMapping = THREE.NoToneMapping;
          gl.outputColorSpace = THREE.LinearSRGBColorSpace;
        }}
      >
        <CanvasProbe onReady={onCanvasReady} />
        <ambientLight />
        <directionalLight />
        <OrbitControls
          target={[0, 0.6, 0]}
          enableDamping={false}
          enablePan={false}
          enableRotate={false}
          enableZoom={false}
          // enableRotate={true}
          // enableZoom={true}
        />
        {/* {videoRef.current && <VideoPlane video={videoRef.current} mirrored={mirrored} />} */}

        {scene && <primitive object={scene} />}
        {isLoading && (
          <Float floatIntensity={1} speed={1}>
            <Text3D
              font={"/assets/fonts/Open_Sans_Condensed_Bold.json"}
              scale={0.05}
              position={[-0.1, 0.6, 0]}
              bevelEnabled
              bevelSize={0.005}
            >
              Loading...
              <meshStandardMaterial color="#FEE191" />
              {/* <meshNormalMaterial /> */}
            </Text3D>

            <mesh>
              {/* 再額外加一個一模一樣的字，放在背後當描邊線 */}
              <Text3D
                font={"/assets/fonts/Open_Sans_Condensed_Bold.json"}
                scale={0.052} // 稍大一點點
                position={[-0.1, 0.6, 0]}
                bevelEnabled={false}
              >
                Loading...
                <meshBasicMaterial color="black" />
              </Text3D>
            </mesh>
          </Float>
        )}
      </Canvas>
    </div>
  );
};

export default AvatarCanvas;
