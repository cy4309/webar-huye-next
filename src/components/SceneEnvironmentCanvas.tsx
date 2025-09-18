import { useState, useRef, useMemo } from "react";
import { ARAnchor, ARView } from "react-three-mind";
//@ts-ignore
import { ambientLight, pointLight } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils";
import { Group } from "three";
import * as THREE from "three";
import NavCameraFacing from "@/components/NavCameraFacing";
import Image from "next/image";

interface SceneEnvironmentCanvasProps {
  onToggleCameraFacing: () => void;
}

const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 768;
const isPhone = isMobile || isSmallScreen;

const ARModel = ({ groupRef }: { groupRef: React.RefObject<Group> }) => {
  const { scene: rawScene } = useGLTF("/models/huye.glb");

  const clonedScene = useMemo(() => clone(rawScene), [rawScene]);

  return (
    <group
      ref={groupRef}
      scale={[-1, 1, 1]}
      rotation={[0, Math.PI + 45, 0]}
      dispose={null}
    >
      {/* <axesHelper args={[0.5]} /> */}
      <primitive object={clonedScene} />
    </group>
  );
};

const SceneEnvironmentCanvas = ({
  onToggleCameraFacing,
}: SceneEnvironmentCanvasProps) => {
  const [found, setFound] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const mvRef = useRef<any>(null);
  const modelGroupRef = useRef<THREE.Group>(null);

  const handleARButtonClick = async (
    e: React.MouseEvent<HTMLButtonElement>,
    mvRef: React.RefObject<any>
  ) => {
    e.stopPropagation();
    const mv = mvRef.current;
    if (!mv) return;

    try {
      // model-viewer cdn
      if (mv.canActivateAR) {
        // await mv.activateAR(); // 原生 AR viewer

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          setShowNotice(true);
          setTimeout(() => {
            setShowNotice(false);
            window.open("/models/0916t10.usdz", "_blank");
          }, 4000);
        } else {
          const glb = encodeURIComponent(
            new URL("/models/0916t10.glb", window.location.href).toString()
          );
          const fallback = encodeURIComponent(window.location.href);
          window.location.href =
            `intent://arvr.google.com/scene-viewer/1.0?file=${glb}&mode=ar_preferred` +
            `#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;` +
            `S.browser_fallback_url=${fallback};end;`;
        }
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          // window.open("/models/t.uz", "_blank");

          // window.location.href = "/models/t.uz";

          // const link = document.createElement("a");
          // link.setAttribute("rel", "ar");
          // link.setAttribute("href", "/models/t.uz");
          // link.click();

          // alert("即將開啟模型預覽頁，請關閉預覽後手動回到此頁面繼續操作。");
          // setTimeout(() => {
          //   window.open("/models/t.uz", "_blank");
          // }, 1000);
          setShowNotice(true);
          setTimeout(() => {
            setShowNotice(false);
            window.open("/models/0916t10.usdz", "_blank");
          }, 4000);
        } else {
          const glb = encodeURIComponent(
            new URL("/models/0916t10.glb", window.location.href).toString()
          );
          const fallback = encodeURIComponent(window.location.href);
          window.location.href =
            `intent://arvr.google.com/scene-viewer/1.0?file=${glb}&mode=ar_preferred` +
            `#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;` +
            `S.browser_fallback_url=${fallback};end;`;
        }
      }
    } catch (err) {
      console.warn("activateAR failed:", err);
    }
  };

  return (
    <>
      <div className="w-full h-full relative flex flex-col items-center">
        {showNotice && (
          <div className="fixed w-full top-5 left-0 text-center text-white bg-black px-4 py-2 rounded shadow-lg z-[9999] animate-fade-in-out">
            即將開啟模型預覽頁，關閉後請手動回來本頁
          </div>
        )}

        {/* AR背景始終顯示 */}
        <ARView
          imageTargets="/models/targets.mind"
          // filterMinCF={1}
          // filterBeta={10000}
          filterMinCF={0.001} // 降低信心值門檻
          filterBeta={0.009} // 平滑程度建議調成比較小的數值
          missTolerance={5}
          warmupTolerance={0}
          // uiError={false}
          // uiLoading={false}
          // uiScanning={false}
        >
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <ARAnchor
            target={0}
            onAnchorFound={() => setFound(true)}
            onAnchorLost={() => setFound(false)}
          >
            <ARModel groupRef={modelGroupRef} />
          </ARAnchor>
        </ARView>

        {/* Nav始終顯示 */}
        {/* <div className="w-full absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"> */}
        {/* <div className="w-full h-full relative flex flex-col items-center"> */}
        <NavCameraFacing onToggleCameraFacing={onToggleCameraFacing} />
        {/* </div> */}

        {/* 提示畫面（只在未找到 target 時顯示） */}
        {!found && (
          <div className="bg-[url(/assets/images/back_plane.png)] w-[300px] h-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center bg-no-repeat bg-contain bg-center">
            <Image
              src="/assets/images/back_plane_a_tiger.png"
              alt="huye_demo"
              className="w-[180px] h-auto mt-6"
              width={180}
              height={180} // 可略為保守填一下，幫助 LCP 評估
            />

            {/* 第一步字圖：請將鏡頭與圖標保持平行 */}
            <Image
              src="/assets/images/back_plane_wording_step2.png"
              alt="Step 2"
              width={260}
              height={50}
              className="mt-4"
            />

            {/* 第二步字圖：請將相機對準圖標 */}
            <Image
              src="/assets/images/back_plane_wording_step1.png"
              alt="Step 1"
              width={260}
              height={50}
              className="mt-1"
            />

            {/* 啟動 AR 按鈕圖 */}
            <button className="mt-4">
              <Image
                src="/assets/images/btn_play_ar.png"
                alt="Start AR"
                width={140}
                height={140}
              />
            </button>
            {/* <p className="font-bold mt-4">請將相機對準此圖標</p>
            <p className="text-center">
              為了獲得最佳的 AR 體驗
              <br /> 請將相機鏡頭與現場的辨識圖標保持平行
            </p> */}
          </div>
        )}

        {/* 啟動 AR 模式按鈕（當掃到圖標時出現） */}
        {isPhone && found && (
          <>
            <model-viewer
              ref={mvRef}
              ios-src="/models/0916t10.usdz"
              src="/models/0916t10.glb"
              ar
              ar-modes="scene-viewer webxr quick-look"
              camera-controls
              auto-rotate
              autoplay
              animation-loop
              shadow-intensity="1"
              style={{
                visibility: "hidden",
                width: 0,
                height: 0,
                position: "absolute",
              }}
            />

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
              <button
                className="bg-white/80 backdrop-blur-sm text-blue-600 border-gray-400 border py-3 px-3 rounded-2xl shadow-xl"
                onClick={(e) => handleARButtonClick(e, mvRef)}
              >
                🚀 啟動 AR 模式
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default SceneEnvironmentCanvas;
