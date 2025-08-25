import { IoMdCamera } from "react-icons/io";
import { AiFillVideoCamera } from "react-icons/ai";
import { LuRefreshCw } from "react-icons/lu";

interface NavProps {
  isRecording?: boolean;
  recTime?: string;
  onShootPhoto?: () => void;
  onToggleRecord?: () => void;
  onToggleCameraFacing: () => void;
}

export default function Nav({
  isRecording,
  recTime,
  onShootPhoto,
  onToggleRecord,
  onToggleCameraFacing,
}: NavProps) {
  if (!onToggleCameraFacing) return null;

  return (
    <>
      <nav className="w-full relative">
        <div className="w-full pb-8 absolute bottom-0 left-0 right-0 flex justify-center">
          <div className="gap-8 px-6 py-3 flex justify-center items-center rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            {/* 模式切換 */}
            {/* <BaseButton onClick={toggleAvatarView} className="!rounded-full">
              <span className="text-white/90 text-sm tracking-wide">
                {avatarView ? "Avatar" : "Landmark"}
              </span>
            </BaseButton> */}

            {/* 拍照（合成輸出） */}
            {onShootPhoto && (
              <button
                onClick={onShootPhoto}
                aria-label="Shutter"
                className="relative w-16 h-16 rounded-full"
              >
                <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
                <span className="absolute inset-1.5 rounded-full bg-white/90"></span>
                <IoMdCamera className="absolute inset-0 m-auto text-black text-2xl" />
              </button>
            )}

            {/* 錄影（合成輸出） */}
            {onToggleRecord && (
              <button
                onClick={onToggleRecord}
                aria-label="Record"
                className="relative w-16 h-16 rounded-full"
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
                <AiFillVideoCamera className="absolute inset-0 m-auto text-black text-2xl" />
              </button>
            )}
            {/* <button
                  onClick={handleToggleRecord}
                  aria-label="Record"
                  className="relative w-16 h-16 rounded-full"
                >
                  <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
                  <span
                    className={`absolute inset-3 rounded-md transition-all duration-200 ${
                      isRecording
                        ? "bg-red-600 rounded-md"
                        : "bg-transparent rounded-full"
                    }`}
                  />
                  <AiFillVideoCamera className="absolute inset-0 m-auto text-2xl" />
                </button> */}

            {/* 前/後鏡頭切換 */}
            {onToggleCameraFacing && (
              <button
                // className="!rounded-full"
                className="relative w-16 h-16 rounded-full"
                aria-label="SwitchCamera"
                onClick={onToggleCameraFacing}
              >
                {/* <LuRefreshCw className="text-white/90" /> */}
                <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
                <span className="absolute inset-1.5 rounded-full bg-white/90"></span>
                <LuRefreshCw className="absolute inset-0 m-auto text-black text-2xl" />
              </button>
            )}
          </div>

          {/* 錄影計時 */}
          {isRecording && recTime && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-red-500 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="tabular-nums">{recTime}</span>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
