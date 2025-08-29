//@ts-nocheck
/** @description 控制 3D avatar（如帽子模型）的載入與變形，包括跟踪臉部資訊（translation/rotation）並套用到模型上  */

import * as THREE from "three";
import { loadGltf } from "@/utils/loaders";
import { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
// FaceLandmarkerResult: faceBlendshapes 通常搭配 3D 頭像 (例如 VRM 模型) 使用，可以讓模型「做表情」。
// FaceLandmarkerResult: facialTransformationMatrixes 功能：提供 3D 頭部的「位置 + 旋轉 + 縮放」矩陣（4x4 matrix）。
// FaceLandmarkerResult: faceLandmarks 功能：臉部特徵點，共 478 個點，包含輪廓、眼睛、嘴巴、鼻子等。 用途：建立遮罩（如你現在的 FaceMeshMask）。
import { decomposeMatrix } from "@/utils/decomposeMatrix";

class AvatarManager {
  private static instance: AvatarManager = new AvatarManager();
  private scene!: THREE.Scene;
  isModelLoaded = false;
  private constructor() {
    this.scene = new THREE.Scene();
  }
  private stickerUrls: string[] = [];
  private stickerSprites: THREE.Sprite[] = [];
  private rotationOffset = 0; // 目前轉動角度（radian）
  private targetRotation = 0; // 目標角度（用於動畫）
  private rotationSpeed = 0.05; // 每幀旋轉速度
  private isSpinning = false;
  private hasHighlighted = false;

  static getInstance(): AvatarManager {
    return AvatarManager.instance;
  }

  getScene = () => {
    return this.scene;
  };

  startSpin = () => {
    this.isSpinning = true;
    this.rotationSpeed = 0.2 + Math.random() * 0.2; // 隨機速度
    this.targetRotation =
      this.rotationOffset + Math.PI * 4 + Math.random() * Math.PI * 2; // 多轉幾圈
  };

  loadModel = async (url?: string, stickerUrls?: string[]) => {
    this.isModelLoaded = false;
    this.stickerUrls = stickerUrls;

    this.clearScene(); // ✅ 清空場景，避免殘留模型或貼圖
    if (this.scene.children.length === 1) {
      this.scene.children[0].removeFromParent();
    }

    const gltf = await loadGltf(url);
    // gltf.scene.traverse((obj) => (obj.frustumCulled = false));
    gltf.scene.traverse((obj) => {
      if (obj.name === "hat") {
        this.hatObject = obj;
      }
    });
    this.scene.add(gltf.scene);

    // ✅ 加入多個貼紙 sprites，繞圓Y軸排列，並增加錯誤處理
    try {
      const textureLoader = new THREE.TextureLoader();
      const radius = 1.2; // 決定圓圈的半徑，可視需求加大或縮小
      const yHeight = 0.6; // 貼紙圈的垂直高度位置
      const stickers: THREE.Sprite[] = [];

      for (let i = 0; i < stickerUrls.length; i++) {
        const stickerUrl = stickerUrls[i];
        try {
          const texture = await textureLoader.loadAsync(
            `/assets/images/stickers/${stickerUrl}.png`
          );

          // ⬇️ 根據圖片實際寬高自動計算貼紙比例
          const imageAspect = texture.image.width / texture.image.height;
          const baseScale = 0.12; // 你可以視覺上微調這個值

          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            color: 0xffffff,
          });

          const sprite = new THREE.Sprite(spriteMaterial);
          // sprite.scale.set(0.1, 0.1, 1); // 可調整貼紙大小
          // ⬇️ 設定貼紙正確比例（以高度為主，寬度跟著跑）
          sprite.scale.set(baseScale * imageAspect, baseScale, 1);

          const angle = (i / stickerUrls.length) * Math.PI * 2;
          const x = Math.sin(angle) * radius;
          const z = Math.cos(angle) * radius;

          sprite.position.set(x, yHeight, z);
          sprite.lookAt(0, yHeight, 0); // 保證貼紙朝向圓心（避免歪斜）
          this.scene.add(sprite);
          stickers.push(sprite);
        } catch (innerErr) {
          console.error(`🚨 第 ${i} 張貼紙載入失敗 (${stickerUrl})`, innerErr);
        }
      }
      this.stickerSprites = stickers;
    } catch (err) {
      console.error("🚨 整體貼紙陣列載入失敗！", err);
    }

    // make hands invisible
    const LeftHand = this.scene.getObjectByName("LeftHand");
    const RightHand = this.scene.getObjectByName("RightHand");
    LeftHand?.scale.set(0, 0, 0);
    RightHand?.scale.set(0, 0, 0);
    this.isModelLoaded = true;
  };

  updateFacialTransforms = (results: FaceLandmarkerResult, flipped = true) => {
    if (!results || !this.isModelLoaded) return;
    this.updateBlendShapes(results, flipped);
    this.updateTranslation(results, flipped);
  };

  updateBlendShapes = (results: FaceLandmarkerResult, flipped = true) => {
    if (!results.faceBlendshapes) return;

    const blendShapes = results.faceBlendshapes[0]?.categories;
    if (!blendShapes) return;

    this.scene.traverse((obj) => {
      if ("morphTargetDictionary" in obj && "morphTargetInfluences" in obj) {
        const morphTargetDictionary = obj.morphTargetDictionary as {
          [key: string]: number;
        };
        const morphTargetInfluences =
          obj.morphTargetInfluences as Array<number>;

        for (const { score, categoryName } of blendShapes) {
          let updatedCategoryName = categoryName;
          if (flipped && categoryName.includes("Left")) {
            updatedCategoryName = categoryName.replace("Left", "Right");
          } else if (flipped && categoryName.includes("Right")) {
            updatedCategoryName = categoryName.replace("Right", "Left");
          }
          const index = morphTargetDictionary[updatedCategoryName];
          morphTargetInfluences[index] = score;
        }
      }
    });
  };

  updateTranslation = (results: FaceLandmarkerResult, flipped = true) => {
    if (!results.facialTransformationMatrixes) return;

    const matrixes = results.facialTransformationMatrixes[0]?.data;
    if (!matrixes) return;

    const { translation, rotation, scale } = decomposeMatrix(matrixes);
    const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, "ZYX");
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    if (flipped) {
      // flip to x axis
      quaternion.y *= -1;
      quaternion.z *= -1;
      translation.x *= -1;
    }

    // ✅ 多貼圖繞圓排列並貼臉部更新
    if (this.stickerSprites && this.stickerSprites.length > 0) {
      const radius = 0.15; // 轉動時的半徑，可與上面載入 radius 不同
      const centerX = translation.x * 0.005;
      const centerY = translation.y * 0.015 + 0.65; // 調整圓圈高度（可上下微調）
      const centerZ = (translation.z + 50) * 0.02;

      // 🎯 若轉動中，更新 offset
      if (this.isSpinning) {
        this.rotationOffset += this.rotationSpeed; // 調整旋轉速度

        // 🎯 緩速逼近停止點（可實作 easing）
        if (this.rotationOffset >= this.targetRotation) {
          this.isSpinning = false;
          this.rotationOffset = this.targetRotation % (Math.PI * 2); // 歸一化角度
        }
      }

      const total = this.stickerSprites.length;

      this.stickerSprites.forEach((sprite, index) => {
        const baseAngle = (index / total) * Math.PI * 2;
        const angle = baseAngle + this.rotationOffset;

        // 繞 Y 軸轉動（x-z 變化，y 固定）
        const x = centerX + radius * Math.sin(angle);
        const y = centerY + radius * Math.cos(angle);
        const z = centerZ + radius;

        sprite.position.set(x, y, z);
        sprite.lookAt(centerX, y, centerZ + 1); // 每張貼紙保持面向圓心
      });
    }

    if (!this.isSpinning && this.stickerSprites?.length > 0) {
      const total = this.stickerSprites.length;
      const normalizedOffset = this.rotationOffset % (Math.PI * 2);

      // const targetAngle = 0; // 正上方
      const targetAngle = Math.PI; // 正下方

      let closestIndex = 0;
      let smallestDiff = Infinity;

      for (let i = 0; i < total; i++) {
        const angle = (i / total) * Math.PI * 2;
        const currentAngle = (angle + normalizedOffset) % (Math.PI * 2);

        const diff = Math.abs(currentAngle - targetAngle);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestIndex = i;
        }
      }

      // ✅ 當貼紙旋轉停止後，執行高亮與 3 秒後還原
      if (
        !this.isSpinning &&
        this.stickerSprites?.length > 0 &&
        !this.hasHighlighted
      ) {
        const total = this.stickerSprites.length;
        const normalizedOffset = this.rotationOffset % (Math.PI * 2);
        // const targetAngle = 0;
        const targetAngle = Math.PI; // 正下方

        let closestIndex = 0;
        let smallestDiff = Infinity;

        for (let i = 0; i < total; i++) {
          const angle = (i / total) * Math.PI * 2;
          const currentAngle = (angle + normalizedOffset) % (Math.PI * 2);
          const diff = Math.abs(currentAngle - targetAngle);
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestIndex = i;
          }
        }

        // ✅ 先將所有貼紙透明度設為 1
        // this.stickerSprites.forEach((sprite) => {
        //   const material = sprite.material as THREE.SpriteMaterial;
        //   material.opacity = 1.0;
        //   sprite.scale.set(0.1, 0.1, 1);
        // });

        //  // ✅ 讓中選的貼紙變亮、變大
        // const selected = this.stickerSprites[closestIndex];
        // const selectedMat = selected.material as THREE.SpriteMaterial;
        // selectedMat.opacity = 1.0;
        // selected.scale.set(0.15, 0.15, 1);

        // ✅ 選中貼紙視覺變化
        this.stickerSprites.forEach((sprite, idx) => {
          const mat = sprite.material as THREE.SpriteMaterial;
          if (idx === closestIndex) {
            mat.opacity = 1.0;
            sprite.scale.set(0.15, 0.15, 1);
          } else {
            mat.opacity = 0.3;
            sprite.scale.set(0.1, 0.1, 1);
          }
        });

        this.hasHighlighted = true;

        // ✅ 1秒後自動恢復所有貼紙外觀
        setTimeout(() => {
          this.stickerSprites.forEach((sprite) => {
            const mat = sprite.material as THREE.SpriteMaterial;
            mat.opacity = 1.0;
            sprite.scale.set(0.1, 0.1, 1);
          });
          this.hasHighlighted = false;
        }, 1000);
      }
    }

    const hat = this.hatObject;
    if (hat) {
      hat.quaternion.copy(quaternion);
      hat.scale.set(0.9, 0.9, 0.9);
      hat.position.set(
        translation.x * 0.01,
        translation.y * 0.01 + 0.6, // 頭頂偏移
        (translation.z + 50) * 0.02
      );

      hat.renderOrder = 2;
      hat.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.depthTest = true;
          child.material.colorWrite = true;
          child.material.transparent = false;
          child.renderOrder = 2;
          // child.material.depthWrite = false;
          // child.material.color = "red";
        }
      });
    }

    const Head = this.scene.getObjectByName("Head");
    Head?.quaternion.slerp(quaternion, 1.0);

    const root = this.scene.getObjectByName("AvatarRoot");
    // values empirically calculated
    root?.position.set(
      translation.x * 0.01,
      translation.y * 0.01,
      (translation.z + 50) * 0.02
    );
  };

  clearScene = () => {
    this.scene.children.forEach((child) => {
      this.scene.remove(child);
    });
    this.hatObject = undefined;
    this.stickerSprite = undefined;
    this.stickerSprites = [];
  };
}

export default AvatarManager;
