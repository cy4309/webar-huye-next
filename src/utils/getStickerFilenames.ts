export const getStickerFilenames = () => {
  //@ts-ignore
  const context = require.context(
    "@/../public/assets/images/stickers", // public 下相對路徑
    false,
    /^\.\/\d+_.+\.png$/ // 只抓開頭數字底線的 png
  );

  return context
    .keys()
    .map((key: string) => key.replace("./", "").replace(".png", "")); // 只取檔名不含副檔名
};
