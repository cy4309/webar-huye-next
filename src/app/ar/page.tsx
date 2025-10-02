"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import imgBtnHome from "/public/assets/images/btn_home.png";
import imgBackPlane from "/public/assets/images/back_plane.png";
// import imgBtnPlayAr from "/public/assets/images/btn_play_ar.png";
import imgBackPlaneWordingStep3 from "/public/assets/images/back_plane_wording_step3.png";

export default function ARPage() {
  const mvRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    const initAR = async () => {
      try {
        await import("@google/model-viewer");
        await mvRef.current?.activateAR?.();
      } catch (error) {
        console.error("❌ 無法啟動 AR 模式，導回上一頁", error);
        router.back();
      }
    };

    initAR();
  }, []);

  return (
    <div className="p-6 relative w-full h-[100dvh] flex flex-col items-center justify-center bg-[#f2e18d] text-white">
      <button
        className="absolute top-8 right-8 z-[9999]"
        onClick={() => router.back()}
      >
        <Image src={imgBtnHome} alt="imgBtnHome" width={56} height={56} />
      </button>

      <div className="w-[375px] h-[375px] p-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center bg-no-repeat bg-contain bg-center">
        <Image
          src={imgBackPlane}
          alt="imgBackPlane"
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="opacity-50 object-contain pointer-events-none"
        />

        {/* <h2 className="my-6 text-2xl font-bold">AR 模式頁面</h2>
        <p className="text-center text-sm opacity-60">
          若 AR 已結束，你可以點擊首頁返回。
        </p> */}

        <div className="relative z-10 flex flex-col items-center">
          <Image
            src={imgBackPlaneWordingStep3}
            alt="imgBackPlaneWordingStep3"
            width={240}
            height={50}
          />
        </div>

        <model-viewer
          id="model-viewer"
          ref={mvRef}
          src="/models/0930b.glb"
          ios-src="/models/0930b.usdz"
          alt="3D model"
          ar
          ar-modes="scene-viewer quick-look"
          auto-rotate
          camera-controls
          // style={{
          //   width: "100%",
          //   height: "400px",
          //   maxWidth: "400px",
          //   background: "#000",
          // }}
          style={{ display: "none" }}
        >
          {/* <button
          slot="ar-button"
          className="mt-4"
          // onClick={(e) => handleARButtonClick(e, mvRef)}
        >
          <Image
            src={imgBtnPlayAr}
            alt="imgBtnPlayAr"
            width={200}
            height={50}
          />
        </button> */}
        </model-viewer>
      </div>
    </div>
  );
}
