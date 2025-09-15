import "@/styles/globals.css";
import Script from "next/script";
// import { Inter } from "next/font/google";

// const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Huye Webar demonstration",
  description: "Mediapipe face-landmarker, Model-viewer",
  icons: {
    icon: "/assets/images/s.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" // 加載 model-viewer CDN
          strategy="afterInteractive" // 頁面互動之後再載入，對於你的用途（只在手機上、按鈕點擊後才調用）是 可接受的
        />
      </head>
      {/* <body className={inter.className}>{children}</body> */}
      <body>{children}</body>
    </html>
  );
}
