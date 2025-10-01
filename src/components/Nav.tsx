// import { IoMdCamera } from "react-icons/io";
// import { AiFillVideoCamera } from "react-icons/ai";
// import { LuRefreshCw } from "react-icons/lu";
import Image from "next/image";
import imgBtnCam from "/public/assets/images/btn_cam.png";
import imgBtnVideo from "/public/assets/images/btn_video.png";
import imgBtnVideoStop from "/public/assets/images/btn_video_stop.png";
import imgBtnAvatar from "/public/assets/images/btn_avatar.png";
import imgBtnLandmark from "/public/assets/images/btn_landmark.png";

interface NavProps {
  avatarView?: boolean;
  isRecording?: boolean;
  recTime?: string;
  onShootPhoto?: () => void;
  onToggleRecord?: () => void;
  // onToggleCameraFacing: () => void;
  onToggleAvatarView?: () => void;
}

export default function Nav({
  avatarView,
  isRecording,
  recTime,
  onShootPhoto,
  onToggleRecord,
  // onToggleCameraFacing,
  onToggleAvatarView,
}: NavProps) {
  // if (!onToggleCameraFacing) return null;

  return (
    <>
      <nav className="w-full relative z-[9999]">
        <div className="gap-4 w-full absolute bottom-16 left-0 right-0 flex justify-center">
          {/* 模式切換 */}
          {onToggleAvatarView && (
            // <div className="gap-8 px-6 py-3 flex justify-center items-center rounded-full bg-black/10 backdrop-blur-md border border-white/10">
            // <button onClick={onToggleAvatarView} className="!rounded-full">
            <button
              onClick={onToggleAvatarView}
              className="relative w-20 h-20 rounded-full"
            >
              {avatarView ? (
                <Image
                  src={imgBtnLandmark}
                  alt="imgBtnLandmark"
                  fill
                  sizes="80px"
                />
              ) : (
                <Image
                  src={imgBtnAvatar}
                  alt="imgBtnAvatar"
                  fill
                  sizes="80px"
                />
              )}
              {/* <span className="text-white/90 text-sm tracking-wide">
                  {avatarView ? "Avatar" : "Landmark"}
                </span> */}
            </button>
            // </div>
          )}

          {/* 拍照（合成輸出） */}
          {onShootPhoto && avatarView && (
            <button
              onClick={onShootPhoto}
              aria-label="Shutter"
              className="relative w-20 h-20 rounded-full"
            >
              {/* <span className="absolute inset-0 rounded-full border-4 border-white/90"></span> */}
              {/* <span className="absolute inset-1.5 rounded-full bg-white/90"></span> */}
              {/* <IoMdCamera className="absolute inset-0 m-auto text-black text-2xl" /> */}
              <Image src={imgBtnCam} alt="imgBtnCam" fill sizes="80px" />
            </button>
          )}

          {/* 錄影（合成輸出） */}
          {onToggleRecord && avatarView && (
            <button
              onClick={onToggleRecord}
              aria-label="Record"
              className="relative w-20 h-20 rounded-full"
            >
              <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
              <span className="absolute inset-1.5 rounded-full bg-white/90"></span>
              <span
                className={`absolute inset-3 rounded-md transition-all duration-200 ${
                  isRecording
                    ? "bg-red-600 rounded-md"
                    : "bg-transparent rounded-full"
                }`}
              />
              {/* <AiFillVideoCamera className="absolute inset-0 m-auto text-black text-2xl" /> */}
              {isRecording ? (
                <Image
                  src={imgBtnVideoStop}
                  alt="imgBtnVideoStop"
                  fill
                  sizes="80px"
                />
              ) : (
                <Image src={imgBtnVideo} alt="imgBtnVideo" fill sizes="80px" />
              )}
            </button>
          )}

          {/* 前/後鏡頭切換 */}
          {/* {onToggleCameraFacing && (
              <button
                // className="!rounded-full"
                className="relative w-16 h-16 rounded-full"
                aria-label="SwitchCamera"
                onClick={onToggleCameraFacing}
              >
                <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
                <span className="absolute inset-1.5 rounded-full bg-white/90"></span>
                <LuRefreshCw className="absolute inset-0 m-auto text-black text-2xl" />
              </button>
            )} */}
          {/* </div> */}

          {/* 錄影計時 */}
          {isRecording && recTime && (
            // <div className="gap-8 px-6 py-3 flex justify-center items-center rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            // <div className="absolute px-6 py-3 -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white font-semibold rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <div className="absolute px-6 py-2 top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white font-semibold rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="tabular-nums">{recTime}</span>
            </div>
            // </div>
          )}
        </div>
      </nav>
    </>
  );
}
