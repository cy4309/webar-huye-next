"use client";
/** @description 確認好R3F Canvas 在相機 metadata 尚未完整時提早 render，會導致整體掛掉。 */
/** @description 包含整體邏輯的容器元件：開啟攝影機、取得媒體串流、切換 view、初始化 AvatarManager、呼叫動畫 loop、拍照/錄影（合成輸出）等。 */

import { useEffect, useRef, useState, useMemo, createRef } from "react";
import DrawLandmarkCanvas from "@/components/DrawLandmarkCanvas";
import AvatarCanvas from "@/components/AvatarCanvas";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import ReadyPlayerCreator from "@/components/ReadyPlayerCreator";
import AvatarManager from "@/classes/AvatarManager";
import SceneEnvironmentCanvas from "@/components/SceneEnvironmentCanvas";
import Nav from "@/components/Nav";
import NavCameraFacing from "@/components/NavCameraFacing";
// import { FaArrowsSpin } from "react-icons/fa6";
import MediaPreviewModal from "@/components/MediaPreviewModal";
import Image from "next/image";
import imgBtnPlaySpin from "/public/assets/images/btn_play_spin.png";
import imgFrontFrameBotMid from "/public/assets/images/front_frame_bot_mid.png";
import imgFrontFrameBotRight from "/public/assets/images/front_frame_bot_right.png";
import imgFrontFrameBotLeft from "/public/assets/images/front_frame_bot_left.png";
import imgFrontFrameTopLeft from "/public/assets/images/front_frame_top_left.png";
import imgFrontFrameTopRight from "/public/assets/images/front_frame_top_right.png";
import imgFrontFrameTopMid from "/public/assets/images/front_frame_top_mid.png";

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

  const [avatarView, setAvatarView] = useState(true);
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
  const [isSpinning, setIsSpinning] = useState(false);
  // const [facing, setFacing] = useState<"user" | "environment">("environment");
  // const [mirrored, setMirrored] = useState(false);
  // const [cameraMode, setCameraMode] = useState<"user" | "environment">(
  //   "environment"
  // );
  // const [isPortrait, setIsPortrait] = useState(true);

  const frames = useMemo(
    () => [
      // bottom
      {
        ref: createRef<HTMLImageElement>(),
        src: imgFrontFrameBotMid,
        alt: "imgFrontFrameBotMid",
        className:
          "bottom-0 left-1/3 -translate-x-1/2 w-[200px] sm:w-[250px] md:w-[300px] lg:w-[350px] xl:w-[400px] 2xl:w-[650px]",
      },
      {
        ref: createRef<HTMLImageElement>(),
        src: imgFrontFrameBotMid,
        alt: "imgFrontFrameBotMid",
        className:
          "bottom-0 left-2/3 -translate-x-1/2 w-[200px] sm:w-[250px] md:w-[300px] lg:w-[350px] xl:w-[400px] 2xl:w-[650px]",
      },
      {
        ref: createRef<HTMLImageElement>(),
        src: imgFrontFrameBotRight,
        alt: "imgFrontFrameBotRight",
        className:
          "bottom-0 right-0 w-[150px] sm:w-[200px] md:w-[250px] lg:w-[300px] xl:w-[350px] 2xl:w-[400px]",
      },
      {
        ref: createRef<HTMLImageElement>(),
        src: imgFrontFrameBotLeft,
        alt: "imgFrontFrameBotLeft",
        className:
          "bottom-0 left-0 w-[350px] sm:w-[450px] md:w-[550px] lg:w-[650px] xl:w-[750px] 2xl:w-[850px]",
      },
      // top
      {
        ref: createRef<HTMLImageElement>(),
        src: imgFrontFrameTopLeft,
        alt: "imgFrontFrameTopLeft",
        className: "top-0 left-0 w-full max-w-[150px]",
      },
      {
        ref: createRef<HTMLImageElement>(),
        src: imgFrontFrameTopRight,
        alt: "imgFrontFrameTopRight",
        className: "top-0 right-0 w-full max-w-[150px]",
      },
      {
        ref: createRef<HTMLImageElement>(),
        src: imgFrontFrameTopMid,
        alt: "imgFrontFrameTopMid",
        className: "top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px]",
      },
    ],
    []
  );

  function drawFramesToCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    frames.forEach((frame) => {
      const imgEl = frame.ref?.current;
      if (!imgEl) return;

      const rect = imgEl.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      const x = rect.left - canvasRect.left;
      const y = rect.top - canvasRect.top;
      const width = rect.width;
      const height = rect.height;

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = imgEl.src;

      img.onload = () => {
        ctx.drawImage(img, x, y, width, height);
      };
    });
  }

  // ===== 合成需要：抓 R3F 與 Landmark 的 canvas（有 onCanvasReady 更穩；否則 fallback DOM 查找） =====
  const r3fCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");

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
        // await videoRef.current.play();
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn("自動播放失敗，等待使用者互動");
        }
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

  // useEffect(() => {
  //   const handleResize = () => {
  //     setIsPortrait(window.innerHeight >= window.innerWidth);
  //   };
  //   handleResize();
  //   window.addEventListener("resize", handleResize);
  //   return () => window.removeEventListener("resize", handleResize);
  // }, []);

  const handleToggleAvatarView = () => setAvatarView((prev) => !prev);
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

      // ✅ 這裡畫上 frame canvas 的內容
      if (frameCanvasRef.current) {
        frameCanvasRef.current.width = width;
        frameCanvasRef.current.height = height;
        drawFramesToCanvas(frameCanvasRef.current);
      }
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

      const r3f = ensureR3FCanvas();
      const overlay = ensureOverlayCanvas();
      const frameCanvas = frameCanvasRef.current;
      if (!r3f) return alert("找不到 3D 畫布");

      if (r3f) {
        const r = r3f.getBoundingClientRect(); // 取 style 寬高
        const W = r.width;
        const H = r.height;
        const videoW = v.videoWidth;
        const videoH = v.videoHeight;

        const out = document.createElement("canvas");
        out.width = W;
        out.height = H;
        const ctx = out.getContext("2d")!;

        const scale = Math.max(W / videoW, H / videoH);
        const drawW = videoW * scale;
        const drawH = videoH * scale;
        const offsetX = (W - drawW) / 2;
        const offsetY = (H - drawH) / 2;

        ctx.save();
        if (mirrored) {
          ctx.scale(-1, 1);
          ctx.drawImage(v, -drawW - offsetX, offsetY, drawW, drawH);
        } else {
          ctx.drawImage(v, offsetX, offsetY, drawW, drawH);
        }
        ctx.restore();

        if (r3f) ctx.drawImage(r3f, 0, 0, W, H);
        if (overlay) ctx.drawImage(overlay, 0, 0, W, H);
        if (frameCanvas) ctx.drawImage(frameCanvas, 0, 0, W, H);

        out.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewType("image");
          // const a = document.createElement("a");
          // a.href = url;
          // a.download = `photo_${Date.now()}.png`;
          // a.click();
          // URL.revokeObjectURL(url);
        }, "image/png");
      }
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

      const r3f = ensureR3FCanvas();
      const overlay = ensureOverlayCanvas();
      const frameCanvas = frameCanvasRef.current;
      if (!r3f) return alert("找不到 3D 畫布");

      const r = r3f.getBoundingClientRect();
      const W = r.width;
      const H = r.height;
      const videoW = v.videoWidth;
      const videoH = v.videoHeight;

      // 設定 composite canvas
      composeCanvasRef.current = document.createElement("canvas");
      composeCanvasRef.current.width = W;
      composeCanvasRef.current.height = H;
      composeCtxRef.current = composeCanvasRef.current.getContext("2d", {
        alpha: true,
      });

      const draw = () => {
        if (!composeCtxRef.current) return;
        const ctx = composeCtxRef.current;

        ctx.clearRect(0, 0, W, H);

        const scale = Math.max(W / videoW, H / videoH);
        const drawW = videoW * scale;
        const drawH = videoH * scale;
        const offsetX = (W - drawW) / 2;
        const offsetY = (H - drawH) / 2;

        ctx.save();
        if (mirrored) {
          ctx.scale(-1, 1);
          ctx.drawImage(v, -drawW - offsetX, offsetY, drawW, drawH);
        } else {
          ctx.drawImage(v, offsetX, offsetY, drawW, drawH);
        }
        ctx.restore();

        if (r3f) ctx.drawImage(r3f, 0, 0, W, H);
        if (overlay) ctx.drawImage(overlay, 0, 0, W, H);
        if (frameCanvas) ctx.drawImage(frameCanvas, 0, 0, W, H);

        composeRafRef.current = requestAnimationFrame(draw);
      };
      composeRafRef.current = requestAnimationFrame(draw);

      // 把這個 canvas 當作錄影來源（stream）
      capturedStreamRef.current = composeCanvasRef.current.captureStream(30);
      recordedChunksRef.current = [];
      const mime = pickMime();
      const mr = mime
        ? new MediaRecorder(capturedStreamRef.current, { mimeType: mime })
        : new MediaRecorder(capturedStreamRef.current);
      mediaRecorderRef.current = mr;

      // 每段錄影資料推入 chunks
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

          // ✅ 預覽邏輯：先給使用者預覽（避免 iOS 限制強制下載）
          setPreviewUrl(url);
          setPreviewType("video");
          // ✅ 若想同時自動下載也可開啟這段（多數 Android/桌面會生效）
          //         // const a = document.createElement("a");
          //         // a.href = url;
          //         // a.download = `record_${Date.now()}.${isMp4 ? "mp4" : "webm"}`;
          //         // a.click();

          // 清理
          // URL.revokeObjectURL(url);
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

      // 啟動錄影
      mr.start();
      setIsRecording(true);
      setRecTime(0);

      // 記錄錄影時間
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
    await animationManager.clearScene?.();
    setCameraMode(facing);
    // if (facing === "user") {
    //   await animationManager.loadModel(
    //     "/models/tiger-hat2.glb",
    //     stickerFilenames
    //   );
    // } else {
    //   await animationManager.clearScene?.();
    // }
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

  const handleSpin = async () => {
    setIsSpinning(true);
    await AvatarManager.getInstance().startSpin();
    setIsSpinning(false);
  };

  return (
    <>
      {cameraMode === "user" ? (
        <div className="w-full h-full relative flex flex-col items-center">
          {/* ✅ 邊框 PNG，會蓋在最上層，直式手機比例9:16(720*1280)，橫式電腦螢幕比例16:9(1920*1080) */}
          {/* <Image
            src={
              isPortrait
                ? "/assets/images/frame-portrait.png"
                : "/assets/images/frame-landscape.png"
            }
            alt="AR Frame"
            className="absolute inset-0 z-[9999] pointer-events-none"
            fill
          /> */}

          {frames.map((frame, i) => (
            <Image
              key={i}
              ref={frame.ref}
              src={frame.src}
              alt={frame.alt}
              width={300}
              height={300}
              priority
              className={`
                absolute z-[1000] pointer-events-none object-contain ${frame.className}
                `}
            />
          ))}

          <canvas
            ref={frameCanvasRef}
            className="absolute inset-0 z-[999] pointer-events-none"
            width={videoSize?.width}
            height={videoSize?.height}
          />

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
                {avatarView ? (
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
                )}
              </>
            )}
          </div>

          {!isSpinning && (
            <button
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[9999]"
              // onClick={() => {
              //   AvatarManager.getInstance().startSpin();
              // }}
              onClick={handleSpin}
            >
              <Image
                src={imgBtnPlaySpin}
                alt="imgBtnPlaySpin"
                className="w-auto h-auto"
                width={150}
                height={150}
              />
            </button>
          )}

          <NavCameraFacing onToggleCameraFacing={handleToggleCameraFacing} />

          {/* iOS 相機風底部工具列 */}
          <Nav
            avatarView={avatarView}
            isRecording={isRecording}
            recTime={fmt(recTime)}
            onShootPhoto={handleShootPhoto}
            onToggleRecord={handleToggleRecord}
            // onToggleCameraFacing={handleToggleCameraFacing}
            onToggleAvatarView={handleToggleAvatarView}
          />

          {previewUrl && (
            <MediaPreviewModal
              previewUrl={previewUrl}
              type={previewType}
              onClose={() => {
                if (previewUrl?.startsWith("blob:")) {
                  URL.revokeObjectURL(previewUrl); // ✅ 關閉預覽時釋放資源
                }
                setPreviewUrl(null);
              }}
              downloadName={`${Date.now()}`}
            />
          )}
        </div>
      ) : (
        <SceneEnvironmentCanvas
          onToggleCameraFacing={handleToggleCameraFacing}
        />
      )}
    </>
  );
};

export default FaceLandmarkCanvas;
