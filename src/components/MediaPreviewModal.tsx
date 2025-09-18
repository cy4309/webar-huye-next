import Image from "next/image";
import { FaCamera, FaFilm } from "react-icons/fa";

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

  // const isIOS = () => {
  //   return (
  //     /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  //     (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) // iPadOS
  //   );
  // };

  const isImage = type === "image";
  const fileExt = isImage ? "png" : "mp4";
  const title = isImage ? "照片預覽" : "影片預覽";
  const icon = isImage ? (
    <FaCamera className="mr-2" />
  ) : (
    <FaFilm className="mr-2" />
  );

  return (
    <div
      className="w-full h-[100dvh] fixed inset-0 bg-black/80 flex flex-col justify-center items-center z-[9999]"
      onClick={onClose}
    >
      {/* 預覽標題區 */}
      <div
        className="my-2 max-w-[70%] max-h-[80dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xl flex justify-center items-center">
          {icon}
          {title}
        </span>
      </div>

      {/* 主圖／影片容器區塊 */}
      <div
        className="w-[70vw] max-w-[360px] max-h-[80dvh] aspect-[3/4] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage ? (
          <Image
            className="w-full h-full rounded-lg border-4 border-white object-contain"
            src={previewUrl}
            alt="Preview Image"
            width={180}
            height={240} // 可略為保守填一下，幫助 LCP 評估
          />
        ) : (
          <video
            className="w-full h-full rounded-lg border-4 border-white"
            src={previewUrl}
            playsInline
            autoPlay
            muted
            loop
          />
        )}
      </div>

      {/* 說明與按鈕區 */}
      <div
        className="max-w-[90%] flex flex-col justify-center items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="my-2 flex flex-col justify-center items-start animate-pulse">
          <span>如何下載{isImage ? "照片" : "影片"}：</span>
          {isImage ? (
            <>
              <span>。 iOS 請長按圖片下載</span>
              <span>
                。 Android 請點擊
                <a
                  href={previewUrl}
                  download={`${downloadName}.${fileExt}`}
                  className="my-4 underline italic"
                >
                  此處下載
                </a>
              </span>
            </>
          ) : (
            <>
              <span>
                1. 請點擊
                <a
                  className="my-4 underline italic"
                  href={previewUrl}
                  download={`${downloadName}.${fileExt}`}
                >
                  此處下載
                </a>
              </span>
              <span>2. 在相簿或資料夾中找到您的檔案</span>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="my-2 px-4 py-2 border rounded hover:bg-white/10"
        >
          關閉預覽
        </button>
      </div>
    </div>
  );
};

export default MediaPreviewModal;
