import Image from "next/image";
import { FaCamera, FaFilm } from "react-icons/fa";
import { FaCircleQuestion } from "react-icons/fa6";

interface MediaPreviewModalProps {
  previewUrl: string | null;
  type: "image" | "video";
  onClose: () => void;
  downloadName?: string;
}

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  previewUrl,
  type,
  onClose,
  downloadName = "download",
}) => {
  if (!previewUrl) return null;

  const isIOS = () => {
    return (
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) // iPadOS
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
      <div className="text-center mb-4">
        {type === "image" ? (
          <small>
            <div className="flex justify-center items-center">
              <FaCamera className="mr-2" /> 長按圖片即可下載
            </div>
            <br />
            或點擊下方按鈕下載
          </small>
        ) : (
          <>
            <div className="flex justify-center items-center">
              <FaFilm className="mr-2" /> 請點擊下方按鈕下載影片:
            </div>
            {isIOS() && (
              <small className="underline italic flex justify-center items-center">
                <FaCircleQuestion className="mr-2" />
                請在相簿或資料夾中找到您的檔案
              </small>
            )}
          </>
        )}
      </div>

      <div className="max-w-[90%] max-h-[80%]">
        {type === "image" ? (
          <Image
            src={previewUrl}
            alt="Preview Image"
            width={180}
            height={180} // 可略為保守填一下，幫助 LCP 評估
            className="w-full h-auto rounded-lg border-4 border-white"
            onClick={onClose}
          />
        ) : (
          <video
            src={previewUrl}
            // controls
            playsInline
            autoPlay
            muted
            loop
            className="w-full h-auto rounded-lg border-4 border-white"
          />
        )}
      </div>

      <a
        href={previewUrl}
        download={`${downloadName}.${type === "image" ? "png" : "mp4"}`}
        className="text-white underline mt-4"
      >
        下載
      </a>

      <button
        onClick={onClose}
        className="mt-4 text-white border px-4 py-2 rounded hover:bg-white/10"
      >
        關閉預覽
      </button>
    </div>
  );
};

export default MediaPreviewModal;
