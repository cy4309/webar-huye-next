/** @description 應是用來可視化 debug 臉部關鍵點的 2D canvas 層（非 R3F）。切換到 LandmarkView 時使用。 */

import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import { useEffect, useRef } from "react";

interface DrawLandmarkCanvasProps {
  // width: number;
  // height: number;
  videoWidth: number;
  videoHeight: number;
}
const DrawLandmarkCanvas = ({
  // width,
  // height,
  videoWidth,
  videoHeight,
}: DrawLandmarkCanvasProps) => {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef(0);

  const animate = () => {
    if (drawCanvasRef.current) {
      // 實際 mediapipe video stream 的解析度，用於畫圖對齊 landmark（不能錯），不是使用videoSize.width和videoSize.height
      drawCanvasRef.current.width = videoWidth;
      drawCanvasRef.current.height = videoHeight;
      const faceLandmarkManager = FaceLandmarkManager.getInstance();
      faceLandmarkManager.drawLandmarks(drawCanvasRef.current);
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    // 這層做排版與rwd
    <div
      className="absolute top-0 left-0 w-full h-full"
      style={{ overflow: "hidden" }}
    >
      {/* 這層實際用 video 實體解析度畫圖（不失真） */}
      <canvas
        ref={drawCanvasRef}
        width={videoWidth} // ex: 640
        height={videoHeight} // ex: 480
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        // style={{ width: width, height: height, transform: "scaleX(-1)" }}
      ></canvas>
    </div>
  );
};

export default DrawLandmarkCanvas;
