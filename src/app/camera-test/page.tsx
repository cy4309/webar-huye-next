"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [isReady, setIsReady] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);

  // 初始化或切換相機
  const setupCamera = async (mode: "user" | "environment", retry = 0) => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;

      let stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();

      // fallback: enumerateDevices
      if (!settings.facingMode || settings.facingMode !== mode) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videos = devices.filter((d) => d.kind === "videoinput");
        const pick =
          videos.find((d) =>
            mode === "environment"
              ? /back|rear|environment/i.test(d.label)
              : /front|user|face/i.test(d.label)
          ) || videos[videos.length - 1];

        if (pick) {
          stream.getTracks().forEach((t) => t.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: pick.deviceId } },
            audio: false,
          });
        }
      }

      // 綁定到 video
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          console.warn("⚠️ 自動播放失敗，請用戶手動點擊互動");
        });
      }

      const activeTrack = stream.getVideoTracks()[0];
      setVideoInfo({
        deviceId: activeTrack.getSettings().deviceId,
        label: activeTrack.label,
        facingMode: activeTrack.getSettings().facingMode,
      });

      setIsReady(true);
    } catch (err) {
      console.error("❌ setupCamera error:", err);
      if (retry < 2) {
        setTimeout(() => setupCamera(mode, retry + 1), 500);
      } else {
        alert("Failed to setup camera.");
      }
    }
  };

  // 啟動與切換
  useEffect(() => {
    setupCamera(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  // 把 video 畫到 canvas
  useEffect(() => {
    let animationId: number;
    const drawLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === 4) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          if (facing === "user") {
            // ✅ 前鏡頭：做鏡射
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();
          } else {
            // ✅ 後鏡頭：正常顯示
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        }
      }
      animationId = requestAnimationFrame(drawLoop);
    };
    drawLoop();
    return () => cancelAnimationFrame(animationId);
  }, [facing]);

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-black text-white gap-4">
      <h1 className="text-xl font-bold">📷 Camera Test Page</h1>

      {/* 隱藏原始 video */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      {/* 顯示 canvas */}
      <canvas
        ref={canvasRef}
        className="w-full max-w-md bg-gray-800 rounded-lg"
      />

      {/* 一顆切換按鈕 */}
      <button
        onClick={() =>
          setFacing((prev) => (prev === "user" ? "environment" : "user"))
        }
        className="px-6 py-2 bg-blue-500 rounded"
      >
        🔄 切換鏡頭 ({facing})
      </button>

      {/* Debug Info */}
      <div className="mt-4 text-sm bg-gray-900 p-3 rounded w-full max-w-md text-left">
        <p>狀態: {isReady ? "✅ Camera ready" : "⏳ Initializing..."}</p>
        {videoInfo && (
          <>
            <p>🎥 DeviceId: {videoInfo.deviceId}</p>
            <p>🏷 Label: {videoInfo.label || "(no label)"}</p>
            <p>📌 FacingMode: {videoInfo.facingMode || "(unknown)"}</p>
          </>
        )}
      </div>
    </div>
  );
}
