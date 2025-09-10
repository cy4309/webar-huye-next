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
    // <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
    //   <div className="text-center mb-4">
    //     {type === "image" ? (
    //       <small>
    //         <div className="flex justify-center items-center">
    //           <FaCamera className="mr-2" /> 長按圖片即可下載
    //         </div>
    //         或點擊下方按鈕下載
    //       </small>
    //     ) : (
    //       <>
    //         <div className="flex justify-center items-center">
    //           <FaFilm className="mr-2" /> 請點擊下方按鈕下載影片:
    //         </div>
    //         {isIOS() && (
    //           <small className="underline italic flex justify-center items-center">
    //             <FaCircleQuestion className="mr-2" />
    //             請在相簿或資料夾中找到您的檔案
    //           </small>
    //         )}
    //       </>
    //     )}
    //   </div>

    //   {/* <div className="max-w-[90%] max-h-[80%]"> */}
    //   <div className="max-w-[50%] max-h-[50%]">
    //     {type === "image" ? (
    //       <Image
    //         src={previewUrl}
    //         alt="Preview Image"
    //         width={180}
    //         height={180} // 可略為保守填一下，幫助 LCP 評估
    //         className="w-full h-auto rounded-lg border-4 border-white"
    //         onClick={onClose}
    //       />
    //     ) : (
    //       <video
    //         src={previewUrl}
    //         // controls
    //         playsInline
    //         autoPlay
    //         muted
    //         loop
    //         className="w-full h-auto rounded-lg border-4 border-white"
    //       />
    //     )}
    //   </div>

    //   <a
    //     href={previewUrl}
    //     download={`${downloadName}.${type === "image" ? "png" : "mp4"}`}
    //     className="text-white underline mt-4"
    //   >
    //     下載
    //   </a>

    //   <button
    //     onClick={onClose}
    //     className="mt-4 text-white border px-4 py-2 rounded hover:bg-white/10"
    //   >
    //     關閉預覽
    //   </button>
    // </div>

    <div
      className="h-[100dvh] fixed inset-0 z-50 bg-black/80 flex flex-col justify-center items-center"
      onClick={onClose}
    >
      <div
        className="max-w-[70%] max-h-[80dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "image" ? (
          <span className="text-xl flex justify-center items-center">
            <FaCamera className="mr-2" />
            照片預覽
          </span>
        ) : (
          <span className="text-xl flex justify-center items-center">
            <FaFilm className="mr-2" />
            影片預覽
          </span>
        )}
      </div>

      <div
        className="max-w-[70%] max-h-[80dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "image" ? (
          <Image
            className="max-w-full max-h-[80dvh] w-auto h-auto rounded-lg border-4 border-white"
            src={previewUrl}
            alt="Preview Image"
            width={180}
            height={180} // 可略為保守填一下，幫助 LCP 評估
          />
        ) : (
          <video
            className="max-w-full max-h-[80dvh] w-auto h-auto rounded-lg border-4 border-white"
            src={previewUrl}
            // controls
            playsInline
            autoPlay
            muted
            loop
          />
        )}
      </div>

      <div className="max-w-[90%] flex flex-col justify-center items-center">
        {type === "image" ? (
          <div className="my-2 flex flex-col justify-center items-start animate-pulse">
            <span>如何下載照片：</span>
            <span>。 iOS 請長按圖片下載</span>
            <span>
              。 Android 請點擊
              <a
                href={previewUrl}
                download={`${downloadName}.${type === "image" ? "png" : "mp4"}`}
                className="my-4 underline italic"
              >
                此處下載
              </a>
            </span>
          </div>
        ) : (
          <>
            <div className="my-2 flex flex-col justify-center items-start animate-pulse">
              <span>如何下載影片：</span>
              <span>
                1. 請點擊
                <a
                  className="my-4 underline italic"
                  href={previewUrl}
                  download={`${downloadName}.mp4`}
                >
                  此處下載
                </a>
              </span>
              <span>2. 在相簿或資料夾中找到您的檔案</span>
            </div>
          </>
        )}
        {/* <a
          href={previewUrl}
          download={`${downloadName}.${type === "image" ? "png" : "mp4"}`}
          className="my-4 underline italic"
        >
          下載
        </a> */}
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
