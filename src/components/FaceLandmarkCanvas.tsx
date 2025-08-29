"use client";
/** @description 確認好R3F Canvas 在相機 metadata 尚未完整時提早 render，會導致整體掛掉。 */
/** @description 包含整體邏輯的容器元件：開啟攝影機、取得媒體串流、切換 view、初始化 AvatarManager、呼叫動畫 loop、拍照/錄影（合成輸出）等。 */

import { useEffect, useRef, useState } from "react";
// import DrawLandmarkCanvas from "@/components/DrawLandmarkCanvas";
import AvatarCanvas from "@/components/AvatarCanvas";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import ReadyPlayerCreator from "@/components/ReadyPlayerCreator";
import AvatarManager from "@/classes/AvatarManager";
import SceneEnvironmentCanvas from "@/components/SceneEnvironmentCanvas";
import Nav from "@/components/Nav";
import { FaArrowsSpin } from "react-icons/fa6";

function pickMime(): string {
  const cand = [
    "video/mp4;codecs=h264,aac", // iOS/Safari 優先
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of cand) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  }
  return "";
}

const FaceLandmarkCanvas = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef(0);

  // const [avatarView, setAvatarView] = useState(true);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [modelUrl, setModelUrl] = useState("/models/tiger-hat2.glb");
  const [videoSize, setVideoSize] = useState<{
    width: number;
    height: number;
  }>();
  const [isRenderReady, setIsRenderReady] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mirrored, setMirrored] = useState(true);
  const [cameraMode, setCameraMode] = useState<"user" | "environment">("user");

  // ===== 合成需要：抓 R3F 與 Landmark 的 canvas（有 onCanvasReady 更穩；否則 fallback DOM 查找） =====
  const r3fCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ===== 錄影狀態 =====
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recTimerRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  // 合成錄影用的 canvas 與 loop
  const composeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const composeCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const composeRafRef = useRef<number | null>(null);
  const capturedStreamRef = useRef<MediaStream | null>(null);

  // 取得串流（含切換）
  const streamRef = useRef<MediaStream | null>(null);
  const setupCamera = async (mode: "user" | "environment", retry = 0) => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: mode } },
        audio: false,
      };
      let stream = await navigator.mediaDevices.getUserMedia(constraints);

      // 一些桌機/Android 不吃 facingMode，fallback enumerateDevices
      const track = stream.getVideoTracks()[0];
      if (track.getSettings().facingMode !== mode) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videos = devices.filter((d) => d.kind === "videoinput");
          const pick =
            videos.find((d) =>
              mode === "environment"
                ? /back|rear|environment/i.test(d.label)
                : /front|user|face/i.test(d.label)
            ) || videos[0];
          if (pick) {
            stream.getTracks().forEach((t) => t.stop());
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: pick.deviceId } },
              audio: false,
            });
          }
        } catch (e) {
          console.log(e);
          alert("Failed to enumerate devices or switch camera.");
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMirrored(mode === "user");
      setIsCameraReady(true);
    } catch (e) {
      console.log(e);
      if (retry < 2) {
        setTimeout(() => setupCamera(mode, retry + 1), 500); // 自動重試
      } else {
        alert("Failed to setup camera.");
      }
    }
  };

  // 初次與切換時呼叫
  useEffect(() => {
    setupCamera(facing);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [facing]);

  useEffect(() => {
    const getUserCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            updateVideoSize();
            setIsCameraReady(true);
            videoRef.current!.play();
          };
        }
      } catch (e) {
        console.log(e);
        alert("Failed to load webcam!");
      }
    };
    getUserCamera();
    window.addEventListener("resize", updateVideoSize);
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener("resize", updateVideoSize);
    };
  }, []);

  // 初始化 Mediapipe 模型（camera ready 後）
  useEffect(() => {
    if (isCameraReady) {
      (async () => {
        try {
          await FaceLandmarkManager.getInstance().initializeModel();
        } catch (e) {
          console.error("臉部偵測模型載入失敗", e);
          alert("臉部偵測模型載入失敗，請稍後再試");
        }
      })();
    }
  }, [isCameraReady]);

  useEffect(() => {
    if (isCameraReady && videoRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsRenderReady(true);
          requestRef.current = requestAnimationFrame(animate);
        });
      });
    }
  }, [isCameraReady]);

  // const toggleAvatarView = () => setAvatarView((prev) => !prev);

  const toggleAvatarCreatorView = () => setShowAvatarCreator((prev) => !prev);
  const handleAvatarCreationComplete = (url: string) => {
    setModelUrl(url);
    toggleAvatarCreatorView();
  };

  const updateVideoSize = () => {
    if (videoRef.current) {
      const width = videoRef.current.offsetWidth;
      const height = videoRef.current.offsetHeight;
      setVideoSize({ width, height });
    }
  };

  const animate = () => {
    if (
      videoRef.current &&
      videoRef.current.currentTime !== lastVideoTimeRef.current
    ) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      try {
        const faceLandmarkManager = FaceLandmarkManager.getInstance();
        faceLandmarkManager.detectLandmarks(videoRef.current, Date.now());
      } catch (e) {
        console.log(e);
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  // ========== 合成功能：抓 R3F / Landmark Canvas 的 DOM fallback（若子元件未提供 onCanvasReady） ==========
  const ensureR3FCanvas = () => {
    if (r3fCanvasRef.current && r3fCanvasRef.current.isConnected)
      return r3fCanvasRef.current;
    // Drei/R3F 的 canvas 會是 WebGL canvas，常見是 data-engine="three.js"
    const c = document.querySelector(
      'canvas[data-engine="three.js"]'
    ) as HTMLCanvasElement | null;
    if (c) r3fCanvasRef.current = c;
    return r3fCanvasRef.current;
  };
  const ensureOverlayCanvas = () => {
    if (overlayCanvasRef.current && overlayCanvasRef.current.isConnected)
      return overlayCanvasRef.current;
    // 你的 DrawLandmarkCanvas 本身就是 <canvas>，可以加個 id 或 class 方便找
    const c = document.querySelector(
      "#landmark-overlay"
    ) as HTMLCanvasElement | null;
    if (c) overlayCanvasRef.current = c;
    return overlayCanvasRef.current;
  };

  // ========== 拍照（輸出合成 PNG） ==========
  const handleShootPhoto = async () => {
    try {
      const v = videoRef.current;
      if (!v) return;
      const W = v.videoWidth || v.clientWidth;
      const H = v.videoHeight || v.clientHeight;

      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d")!;

      ctx.save();
      if (mirrored) {
        ctx.scale(-1, 1);
        ctx.drawImage(v, -W, 0, W, H);
      } else {
        ctx.drawImage(v, 0, 0, W, H);
      }
      ctx.restore();

      const r3f = ensureR3FCanvas();
      if (r3f) ctx.drawImage(r3f, 0, 0, W, H);

      const overlay = ensureOverlayCanvas();
      if (overlay) ctx.drawImage(overlay, 0, 0, W, H);

      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `photo_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (e) {
      console.log(e);
      alert("Failed to take photo.");
    }
  };

  // ========== 錄影（輸出合成影片） ==========
  const startCompositeRecording = async () => {
    try {
      const v = videoRef.current;
      if (!v) return alert("找不到相機");

      composeCanvasRef.current = document.createElement("canvas");
      composeCtxRef.current = composeCanvasRef.current.getContext("2d", {
        alpha: true,
      });
      const W = v.videoWidth || v.clientWidth;
      const H = v.videoHeight || v.clientHeight;
      composeCanvasRef.current.width = W;
      composeCanvasRef.current.height = H;

      const draw = () => {
        if (!composeCtxRef.current) return;
        const ctx = composeCtxRef.current;

        ctx.clearRect(0, 0, W, H);
        ctx.save();
        if (mirrored) {
          ctx.scale(-1, 1);
          ctx.drawImage(v, -W, 0, W, H);
        } else {
          ctx.drawImage(v, 0, 0, W, H);
        }
        ctx.restore();

        const r3f = ensureR3FCanvas();
        if (r3f) ctx.drawImage(r3f, 0, 0, W, H);
        const overlay = ensureOverlayCanvas();
        if (overlay) ctx.drawImage(overlay, 0, 0, W, H);

        composeRafRef.current = requestAnimationFrame(draw);
      };
      composeRafRef.current = requestAnimationFrame(draw);

      capturedStreamRef.current = composeCanvasRef.current.captureStream(30);

      recordedChunksRef.current = [];
      const mime = pickMime();
      const mr = mime
        ? new MediaRecorder(capturedStreamRef.current, { mimeType: mime })
        : new MediaRecorder(capturedStreamRef.current);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        try {
          const type =
            (mr as any).mimeType ||
            (recordedChunksRef.current[0] as any)?.type ||
            "video/webm";
          const isMp4 = /mp4/i.test(type);
          const blob = new Blob(recordedChunksRef.current, { type });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `record_${Date.now()}.${isMp4 ? "mp4" : "webm"}`;
          a.click();
          URL.revokeObjectURL(url);
          capturedStreamRef.current?.getTracks().forEach((t) => t.stop());
          capturedStreamRef.current = null;
          if (composeRafRef.current) {
            cancelAnimationFrame(composeRafRef.current);
            composeRafRef.current = null;
          }
          composeCtxRef.current = null;
          composeCanvasRef.current = null;
        } catch (e) {
          console.log(e);
          alert("Failed to save recording.");
        }
      };

      mr.start();
      setIsRecording(true);
      setRecTime(0);

      const start = performance.now();
      const tick = (t: number) => {
        setRecTime(Math.floor((t - start) / 1000));
        recTimerRef.current = requestAnimationFrame(tick);
      };
      recTimerRef.current = requestAnimationFrame(tick);
    } catch (e) {
      console.log(e);
      alert("Failed to start recording.");
    }
  };

  const stopCompositeRecording = () => {
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    )
      return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recTimerRef.current) {
      cancelAnimationFrame(recTimerRef.current);
      recTimerRef.current = null;
    }
  };

  const handleToggleRecord = async () => {
    try {
      if (isRecording) stopCompositeRecording();
      else await startCompositeRecording();
    } catch (e) {
      console.log(e);
      alert("Failed to toggle recording.");
    }
  };

  // 秒數顯示 00:00
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  const handleSwitchCamera = async (facing: "user" | "environment") => {
    const mirrored = facing === "user";
    const animationManager = AvatarManager.getInstance();
    setCameraMode(facing);

    if (facing === "user") {
      await animationManager.loadModel("/models/tiger-hat2.glb", [
        "/assets/images/foods_roulette.png",
      ]);
    } else {
      // await animationManager.loadModel("/tiger-grandpa.glb", "trees-1.png");
      await animationManager.clearScene?.();
    }
    return mirrored;
  };

  const handleToggleCameraFacing = () => {
    // 清除動畫
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = 0;
    }

    // 清除 landmark 結果
    FaceLandmarkManager.getInstance().reset();

    // 停止目前 stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // 切換鏡頭方向 + 初始化對應動畫
    setFacing((prevFacing) => {
      const newFacing = prevFacing === "user" ? "environment" : "user";

      // 強制重設 camera 狀態
      setIsCameraReady(false);

      // 切換模型邏輯包進 function 中處理
      handleSwitchCamera(newFacing).then((mirrored) => {
        setMirrored(mirrored);
      });

      return newFacing;
    });
  };

  return (
    <div className="w-full h-full flex flex-col items-center">
      {cameraMode === "user" ? (
        <>
          <div className="w-full h-full flex justify-center items-center">
            <video
              className={`w-full h-full object-cover ${
                mirrored ? "scale-x-[-1]" : ""
              }`}
              ref={videoRef}
              loop
              muted
              autoPlay
              playsInline
            />

            {!isRenderReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-lg bg-black/40">
                Loading camera & model...
              </div>
            )}

            {videoSize && isRenderReady && modelUrl && (
              <>
                {showAvatarCreator && (
                  <ReadyPlayerCreator
                    width={videoSize.width}
                    height={videoSize.height}
                    handleComplete={handleAvatarCreationComplete}
                  />
                )}
                {/* Avatar 視圖：建議在 AvatarCanvas 裡加 onCanvasReady={(el)=> r3fCanvasRef.current=el} */}
                <AvatarCanvas
                  width={videoSize.width}
                  height={videoSize.height}
                  // url={modelUrl}
                  url="/models/tiger-hat2.glb"
                  // @ts-ignore 若你的 AvatarCanvas 還沒加這個 prop，不影響執行；會走 DOM fallback
                  onCanvasReady={(el: HTMLCanvasElement) =>
                    (r3fCanvasRef.current = el)
                  }
                />
                {/* {avatarView ? (
              <AvatarCanvas
                width={videoSize.width}
                height={videoSize.height}
                // url={modelUrl}
                url="/models/tiger-hat2.glb"
                // @ts-ignore 若你的 AvatarCanvas 還沒加這個 prop，不影響執行；會走 DOM fallback
                onCanvasReady={(el: HTMLCanvasElement) =>
                  (r3fCanvasRef.current = el)
                }
              />
            ) : (
              <DrawLandmarkCanvas
                width={videoSize.width}
                height={videoSize.height}
                // @ts-ignore 同上，先讓它可回傳 canvas；若未實作會走 DOM fallback
                onCanvasReady={(el: HTMLCanvasElement) => {
                  el.id = "landmark-overlay"; // 也放個 id，fallback 會找得到
                  overlayCanvasRef.current = el;
                }}
              />
            )} */}
              </>
            )}
          </div>

          <button
            className="absolute z-50 top-8 left-1/2 -translate-x-1/2 px-4 py-4 rounded-full bg-white/60 text-black font-bold"
            onClick={() => {
              AvatarManager.getInstance().startSpin();
            }}
          >
            {/* <FaArrowsSpin /> */}
            點擊開始
          </button>

          {/* iOS 相機風底部工具列 */}
          <Nav
            isRecording={isRecording}
            recTime={fmt(recTime)}
            onShootPhoto={handleShootPhoto}
            onToggleRecord={handleToggleRecord}
            onToggleCameraFacing={handleToggleCameraFacing}
          />
        </>
      ) : (
        <SceneEnvironmentCanvas
          onToggleCameraFacing={handleToggleCameraFacing}
        />
      )}
    </div>
  );
};

export default FaceLandmarkCanvas;
