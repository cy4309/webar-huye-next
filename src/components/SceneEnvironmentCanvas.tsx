import { useState, useRef, useMemo, useEffect } from "react";
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
  const [foundTarget, setFoundTarget] = useState<number | null>(null); // 目前0, 1兩個targets
  const [isTigerA, setIsTigerA] = useState(true);
  const [showNotice, setShowNotice] = useState(false);
  const mvRef = useRef<any>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 為防止記憶體洩漏或錯誤觸發
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTigerA((prev) => !prev);
    }, 3000);

    return () => clearInterval(interval); // 清理定時器
  }, []);

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
            window.open("/models/0924.usdz", "_blank");
          }, 4000);
        } else {
          const glb = encodeURIComponent(
            new URL("/models/0924.glb", window.location.href).toString()
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
            window.open("/models/0924.usdz", "_blank");
          }, 4000);
        } else {
          const glb = encodeURIComponent(
            new URL("/models/0924.glb", window.location.href).toString()
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
            onAnchorFound={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              setFoundTarget(0);
            }}
            onAnchorLost={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);

              const duration = 6000; // 6 秒
              timeoutRef.current = setTimeout(() => {
                setFoundTarget(null);
              }, duration);
            }}
          >
            {!isPhone && <ARModel groupRef={modelGroupRef} />}
          </ARAnchor>

          <ARAnchor
            target={1}
            onAnchorFound={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              setFoundTarget(1);
            }}
            onAnchorLost={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);

              const duration = 6000; // 6 秒
              timeoutRef.current = setTimeout(() => {
                setFoundTarget(null);
              }, duration);
            }}
          >
            {!isPhone && <ARModel groupRef={modelGroupRef} />}
          </ARAnchor>
        </ARView>

        {/* Nav始終顯示 */}
        {/* <div className="w-full absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"> */}
        {/* <div className="w-full h-full relative flex flex-col items-center"> */}
        <NavCameraFacing onToggleCameraFacing={onToggleCameraFacing} />
        {/* </div> */}

        {foundTarget === null && (
          <div className="w-[300px] p-8 z-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center bg-no-repeat bg-contain bg-center">
            {/* 背景圖（用 img 放在最底層，opacity 可控） */}
            <Image
              src="/assets/images/back_plane.png"
              alt="Back Plane"
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="opacity-50 object-contain pointer-events-none"
            />

            {/* 前景內容包一層 relative，確保在上方 */}
            <div className="relative z-10 flex flex-col items-center">
              <Image
                src={
                  isTigerA
                    ? "/assets/images/back_plane_a_tiger.png"
                    : "/assets/images/back_plane_b_tiger.png"
                }
                alt="huye_demo"
                className="mt-6"
                width={180}
                height={180} // 可略為保守填一下，幫助 LCP 評估
              />

              <Image
                src="/assets/images/back_plane_wording_step1.png"
                alt="Step 1"
                width={260}
                height={50}
                className="my-4"
              />
            </div>
          </div>
        )}

        {/* 手機：顯示對應板子圖 */}
        {isPhone && foundTarget !== null && (
          <div className="w-[300px] p-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center bg-no-repeat bg-contain bg-center">
            {/* 背景圖（用 img 放在最底層，opacity 可控） */}
            <Image
              src="/assets/images/back_plane.png"
              alt="Back Plane"
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="opacity-50 object-contain pointer-events-none"
            />

            {/* 前景內容包一層 relative，確保在上方 */}
            <div className="relative z-10 flex flex-col items-center">
              <Image
                src={
                  foundTarget === 0
                    ? "/assets/images/back_plane_a_map.png"
                    : "/assets/images/back_plane_b_map.png"
                }
                alt={`Target ${foundTarget}`}
                width={300}
                height={200}
                className="opacity-90"
              />

              <Image
                src="/assets/images/back_plane_wording_step2.png"
                alt="Step 2"
                width={200}
                height={50}
                // className="mt-4"
              />

              <model-viewer
                ref={mvRef}
                ios-src="/models/0924.usdz"
                src="/models/0924.glb"
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

              {/* <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
              <button
                className="bg-white/80 backdrop-blur-sm text-blue-600 border-gray-400 border py-3 px-3 rounded-2xl shadow-xl"
                onClick={(e) => handleARButtonClick(e, mvRef)}
              >
                🚀 啟動 AR 模式
              </button>
            </div> */}

              {/* <div
                className="mt-2 relative w-[230px] h-[230px]"
                style={{
                  transform: "translate(0px, 0px)",
                }}
              >
                <Image
                  src="/assets/images/btn_play_ar.png"
                  alt="btn"
                  width={230}
                  height={230}
                />
                <a
                  href="/models/0924.usdz"
                  rel="ar"
                  className="absolute inset-0 block"
                >
                  <Image
                    alt="btn"
                    width={230}
                    height={230}
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOYAAABCCAYAAABD56pDAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABSSURBVHhe7cExAQAAAMKg9U9tDQ8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBWDe1yAAH1D+hYAAAAAElFTkSuQmCC"
                  />
                </a>
              </div> */}

              <button
                // slot="ar-button"
                className="mt-4"
                onClick={(e) => handleARButtonClick(e, mvRef)}
              >
                <Image
                  src="/assets/images/btn_play_ar.png"
                  alt="Start AR"
                  width={200}
                  height={50}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SceneEnvironmentCanvas;
