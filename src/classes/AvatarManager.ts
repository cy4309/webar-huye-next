//@ts-nocheck
/** @description 控制 3D avatar（如帽子模型）的載入與變形，包括跟踪臉部資訊（translation/rotation）並套用到模型上  */
/** @description FaceLandmarkerResult: faceLandmarks 功能：臉部特徵點，共 478 個點，包含輪廓、眼睛、嘴巴、鼻子等。 用途：建立遮罩（如你現在的 FaceMeshMask）。  */
/** @description FaceLandmarkerResult: facialTransformationMatrixes 功能：提供 3D 頭部的「位置 + 旋轉 + 縮放」矩陣（4x4 matrix）。  */
/** @description FaceLandmarkerResult: faceBlendshapes 通常搭配 3D 頭像 (例如 VRM 模型) 使用，可以讓模型「做表情」。  */

import * as THREE from "three";
import { loadGltf } from "@/utils/loaders";
import { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
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
  private resultSprites: THREE.Sprite[] = [];
  private rotationOffset = 0; // 目前轉動角度（radian）
  private targetRotation = 0; // 目標角度（用於動畫）
  private rotationSpeed = 0.05; // 每幀旋轉速度
  private isSpinning = false;
  private hasHighlighted = false;
  private occluderMesh?: THREE.Mesh;

  static getInstance(): AvatarManager {
    return AvatarManager.instance;
  }

  getScene = () => this.scene;

  startSpin = () => {
    if (this.isSpinning) return;

    // ✅ 重置貼紙樣式（讓全部回來）
    this.resultSprites.forEach((sprite) => (sprite.visible = false));
    this.stickerSprites.forEach((sprite) => {
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.opacity = 1.0;
    });

    this.hasHighlighted = false;
    this.selectedStickerIndex = -1;
    this.rotationOffset = 0;

    this.isSpinning = true;
    this.rotationSpeed = 0.2 + Math.random() * 0.2;
    this.targetRotation =
      this.rotationOffset + Math.PI * 4 + Math.random() * Math.PI * 2;
  };

  loadModel = async (url?: string, stickerUrls?: string[]) => {
    this.isModelLoaded = false;
    this.stickerUrls = stickerUrls;
    this.clearScene(); // ✅ 清空場景，避免殘留模型或貼圖

    const gltf = await loadGltf(url);
    // gltf.scene.traverse((obj) => (obj.frustumCulled = false));
    gltf.scene.traverse((obj) => {
      if (obj.name === "hat") this.hatObject = obj;
    });
    this.scene.add(gltf.scene);

    // ✅ 加入多個貼紙 sprites，繞圓Y軸排列，並增加錯誤處理
    try {
      const textureLoader = new THREE.TextureLoader();
      const radius = 1.2; // 決定圓圈的半徑，可視需求加大或縮小
      const yHeight = 0.6; // 貼紙圈的垂直高度位置
      const stickers: THREE.Sprite[] = [];
      const resultSprites: THREE.Sprite[] = [];

      for (let i = 0; i < stickerUrls.length; i++) {
        const url = stickerUrls[i];
        const texture = await textureLoader.loadAsync(
          `/assets/images/stickers/${url}.png`
        );
        const aspect = texture.image.width / texture.image.height;
        const scale = 0.09;

        const mat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(scale * aspect, scale, 1);

        const angle = (i / stickerUrls.length) * Math.PI * 2;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        sprite.position.set(x, yHeight, z);
        sprite.lookAt(0, yHeight, 0);

        this.scene.add(sprite);
        stickers.push(sprite);

        const resultMat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
        });
        const resultSprite = new THREE.Sprite(resultMat);
        resultSprite.scale.set(0.15, 0.15, 1);
        resultSprite.position.set(0, -0.15, 0.1);
        resultSprite.visible = false;
        resultSprite.name = `ResultSprite_${i}`;
        this.hatObject?.add(resultSprite);
        resultSprites.push(resultSprite);
      }
      this.stickerSprites = stickers;
      this.resultSprites = resultSprites;
    } catch (e) {
      console.error("🚨 貼紙載入錯誤", e);
    }

    // make hands invisible
    this.scene.getObjectByName("LeftHand")?.scale.set(0, 0, 0);
    this.scene.getObjectByName("RightHand")?.scale.set(0, 0, 0);
    this.isModelLoaded = true;
  };

  updateFacialTransforms = (results: FaceLandmarkerResult, flipped = true) => {
    if (!results || !this.isModelLoaded) return;
    this.updateBlendShapes(results, flipped);
    this.updateTranslation(results, flipped);
  };

  updateBlendShapes = (results: FaceLandmarkerResult, flipped = true) => {
    // if (!results.faceBlendshapes) return;
    const blendShapes = results.faceBlendshapes?.[0]?.categories;
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

  // #region updateTranslation
  updateTranslation = (results: FaceLandmarkerResult, flipped = true) => {
    // if (!results.facialTransformationMatrixes) return;
    const matrix = results.facialTransformationMatrixes?.[0]?.data;
    if (!matrix) return;

    const { translation, rotation } = decomposeMatrix(matrix);
    const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, "ZYX");
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    if (flipped) {
      quaternion.y *= -1;
      quaternion.z *= -1;
      translation.x *= -1;
    }

    // #region stickers
    // ✅ 多貼圖繞圓排列並貼臉部更新
    if (this.stickerSprites.length > 0) {
      const radius = 0.18; // 轉動時的半徑，可與上面載入 radius 不同
      const centerX = translation.x * 0.005;
      const centerY = translation.y * 0.015 + 0.65; // 調整圓圈高度（可上下微調）
      const centerZ = (translation.z + 50) * 0.02;

      // 若轉動中，更新 offset
      if (this.isSpinning) {
        this.rotationOffset += this.rotationSpeed; // 調整旋轉速度

        // 緩速逼近停止點（可實作 easing）
        if (this.rotationOffset >= this.targetRotation) {
          this.isSpinning = false;
          this.rotationOffset = this.targetRotation % (Math.PI * 2); // 歸一化角度
        }
      }

      const total = this.stickerSprites.length;
      this.stickerSprites.forEach((sprite, i) => {
        const baseAngle = (i / total) * Math.PI * 2;
        const angle = baseAngle + this.rotationOffset;

        // 繞 Y 軸轉動（x-z 變化，y 固定）
        const x = centerX + radius * Math.sin(angle);
        const y = centerY + radius * Math.cos(angle);
        const z = centerZ + radius;
        sprite.position.set(x, y, z);
        sprite.lookAt(centerX, y, centerZ + 1); // 每張貼紙保持面向圓心
      });

      if (!this.isSpinning && !this.hasHighlighted && this.rotationOffset > 0) {
        let closestIndex = 0;
        let minDiff = Infinity;
        const targetAngle = Math.PI;
        const offset = this.rotationOffset % (Math.PI * 2);
        for (let i = 0; i < total; i++) {
          const angle = (i / total) * Math.PI * 2;
          const current = (angle + offset) % (Math.PI * 2);
          const diff = Math.abs(current - targetAngle);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }
        this.stickerSprites.forEach((sprite, i) => {
          const mat = sprite.material as THREE.SpriteMaterial;
          mat.opacity = i === closestIndex ? 0 : 0;
        });
        this.resultSprites.forEach(
          (sprite, i) => (sprite.visible = i === closestIndex)
        );
        this.hasHighlighted = true;
        this.selectedStickerIndex = closestIndex;
      }
    }

    // #region hat
    const hat = this.hatObject;
    if (hat) {
      hat.quaternion.copy(quaternion);
      hat.scale.set(0.9, 0.9, 0.9);
      hat.position.set(
        translation.x * 0.01,
        translation.y * 0.01 + 0.62, // 頭頂偏移
        (translation.z + 50) * 0.02
      );
      hat.renderOrder = 2;
      hat.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.depthWrite = true;
          child.material.depthTest = true;
          child.material.colorWrite = true;
          child.material.transparent = false;
          child.renderOrder = 2;
          // child.material.color = "red";
        }
      });

      // #region occluder
      if (!this.occluderMesh) {
        const geo = new THREE.SphereGeometry(
          0.13,
          32,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );

        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const isMacSafari =
          /Macintosh/.test(navigator.userAgent) &&
          /Safari/.test(navigator.userAgent) &&
          !/Chrome/.test(navigator.userAgent);

        const useDepthMaterial = isIOS || isMacSafari;

        const mat = useDepthMaterial
          ? new THREE.MeshBasicMaterial({
              // for IOS, 使用 MeshDepthMaterial 只寫入深度，不顯示顏色
              depthPacking: THREE.BasicDepthPacking, // *IOS要加
              color: 0x000000,
              colorWrite: false,
              depthWrite: true,
              depthTest: true,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide,
            })
          : new THREE.MeshBasicMaterial({
              color: 0x000000,
              colorWrite: false, // 只寫入深度，不顯示顏色
              depthWrite: true,
              depthTest: true,
              transparent: true,
              opacity: 1,
              side: THREE.DoubleSide,
            });
        const occluder = new THREE.Mesh(geo, mat);
        occluder.name = "HatOccluder";
        occluder.position.set(0, -0.04, -0.1);
        occluder.renderOrder = -10; // renderOrder 小於帽子
        hat.add(occluder);
        this.occluderMesh = occluder;

        // ✅ 一幀後隱藏（讓 depth buffer 建立起來）
        requestAnimationFrame(() => {
          (occluder.material as THREE.Material).opacity = 0.0;
        });
      }
    }

    this.scene.getObjectByName("Head")?.quaternion.copy(quaternion);
    const root = this.scene.getObjectByName("AvatarRoot");
    root?.position.set(
      translation.x * 0.01,
      translation.y * 0.01,
      (translation.z + 50) * 0.02
    );
  };

  clearScene = () => {
    this.scene.clear();
    this.hatObject = undefined;
    this.stickerSprite = undefined;
    this.stickerSprites = [];
    this.resultSprites = [];
  };
}

export default AvatarManager;
