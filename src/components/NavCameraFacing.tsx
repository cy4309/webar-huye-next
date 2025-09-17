import { LuRefreshCw } from "react-icons/lu";

interface NavCameraFacingProps {
  onToggleCameraFacing: () => void;
}

export default function NavCameraFacing({
  onToggleCameraFacing,
}: NavCameraFacingProps) {
  if (!onToggleCameraFacing) return null;

  return (
    <>
      {/* <nav className="w-full relative"> */}
      <div className="absolute top-8 right-8 flex justify-center z-[9999]">
        <div className="gap-8 px-6 py-3 flex justify-center items-center rounded-full bg-black/40 backdrop-blur-md border border-white/10">
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
      </div>
      {/* </nav> */}
    </>
  );
}
