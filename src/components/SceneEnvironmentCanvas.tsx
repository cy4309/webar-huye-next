import { useState, useRef } from "react";
import { ARAnchor, ARView } from "react-three-mind";
//@ts-ignore
import { ambientLight, pointLight } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import Nav from "@/components/Nav";
import Image from "next/image";

interface SceneEnvironmentCanvasProps {
  onToggleCameraFacing: () => void;
}

const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
const isSmallScreen = window.innerWidth < 768;
const isPhone = isMobile || isSmallScreen;

const ARModel = () => {
  const { scene } = useGLTF("/models/huye.glb");
  return (
    <group scale={[-1, 1, 1]} rotation={[0, Math.PI + 45, 0]}>
      {/* <axesHelper args={[0.5]} /> */}
      <primitive object={scene} />
    </group>
  );
};

const SceneEnvironmentCanvas = ({
  onToggleCameraFacing,
}: SceneEnvironmentCanvasProps) => {
  const [found, setFound] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const mvRef = useRef<any>(null);

  const handleARButtonClick = async (
    e: React.MouseEvent<HTMLButtonElement>,
    mvRef: React.RefObject<any>
  ) => {
    e.stopPropagation();
    const mv = mvRef.current;
    if (!mv) return;

    try {
      if (mv.canActivateAR) {
        await mv.activateAR(); // 原生 AR viewer
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
          setShowNotice(true); // 顯示通知
          setTimeout(() => {
            setShowNotice(false); // 自動隱藏通知
            window.open("/models/tiger-0911.usdz", "_blank");
          }, 4000);
        } else {
          const glb = encodeURIComponent(
            new URL("/models/tiger-0912.glb", window.location.href).toString()
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
      <div className={`w-full h-full relative`}>
        {showNotice && (
          <div className="fixed w-full top-5 left-0 text-center text-white bg-black px-4 py-2 rounded shadow-lg z-[9999] animate-fade-in-out">
            即將開啟模型預覽頁，關閉後請手動回來本頁
          </div>
        )}

        {/* AR背景始終顯示 */}
        <ARView
          imageTargets="/models/targets.mind"
          filterMinCF={1}
          filterBeta={10000}
          missTolerance={0}
          warmupTolerance={0}
        >
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <ARAnchor
            target={0}
            onAnchorFound={() => setFound(true)}
            onAnchorLost={() => setFound(false)}
          >
            <ARModel />
          </ARAnchor>
        </ARView>

        {/* Nav始終顯示 */}
        <div className="w-full absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <Nav onToggleCameraFacing={onToggleCameraFacing} />
        </div>

        {/* 提示畫面（只在未找到 target 時顯示） */}
        {!found && (
          <div className="w-[300px] border absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center bg-white/50 backdrop-blur-sm p-6 rounded-lg z-20">
            {/* <img className="w-[180px]" src="/assets/images/mk_pizza.png" alt="mk_pizza" /> */}
            <Image
              src="/assets/images/huye-demo.png"
              alt="huye_demo"
              width={180}
              height={180} // 可略為保守填一下，幫助 LCP 評估
              className="w-[180px] h-auto"
            />
            <p className="font-bold mt-4">請將相機對準此圖標</p>
            <p className="text-center">
              為了獲得最佳的 AR 體驗
              <br /> 請將相機鏡頭與現場的辨識圖標保持平行
            </p>
          </div>
        )}

        {/* 啟動 AR 模式按鈕（當掃到圖標時出現） */}
        {isPhone && found && (
          <>
            <model-viewer
              ref={mvRef}
              ios-src="/models/tiger-0911.usdz"
              src="/models/tiger-0912.glb"
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
