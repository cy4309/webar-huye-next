/** @description Mediapipe 的封裝，初始化並持續處理臉部追蹤（Landmarker）的結果，供其他模組使用。 */

import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

class FaceLandmarkManager {
  private static instance: FaceLandmarkManager = new FaceLandmarkManager();
  private results!: FaceLandmarkerResult;
  faceLandmarker!: FaceLandmarker | null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): FaceLandmarkManager {
    return FaceLandmarkManager.instance;
  }

  async initializeModel() {
    if (this.isInitialized) return; // 防止重複初始化
    this.faceLandmarker = null;

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );

    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "VIDEO",
      numFaces: 1,
    });

    this.isInitialized = true;
  }

  getResults = () => {
    return this.results;
  };

  reset = () => {
    this.results = null as any;
  };

  detectLandmarks = (
    videoElement: HTMLVideoElement,
    time: number
  ): FaceLandmarkerResult | undefined => {
    if (!this.faceLandmarker) return;
    if (
      videoElement.readyState < 2 || // HAVE_CURRENT_DATA
      videoElement.videoWidth === 0 ||
      videoElement.videoHeight === 0
    ) {
      return; // 防止 Mediapipe 報錯
    }

    const results = this.faceLandmarker.detectForVideo(videoElement, time);
    this.results = results;
    return results;
  };

  drawLandmarks = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !this.results?.faceLandmarks) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(ctx);

    const lineWidth = 1.3;
    for (const landmarks of this.results.faceLandmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: "#C0C0C070", lineWidth }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        { color: "#FF3030", lineWidth }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        { color: "#FF3030", lineWidth }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        { color: "#30FF30", lineWidth }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        { color: "#30FF30", lineWidth }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        { color: "#E0E0E0", lineWidth }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LIPS,
        { color: "#E0E0E0", lineWidth }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
        { color: "#FF3030", lineWidth }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        { color: "#30FF30", lineWidth }
      );
    }
  };
}

export default FaceLandmarkManager;
