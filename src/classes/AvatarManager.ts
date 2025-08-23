//@ts-nocheck
/** @description 控制 3D avatar（如帽子模型）的載入與變形，包括跟踪臉部資訊（translation/rotation）並套用到模型上  */

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

  static getInstance(): AvatarManager {
    return AvatarManager.instance;
  }

  getScene = () => {
    return this.scene;
  };

  loadModel = async (url?: string, stickerUrl?: string) => {
    this.isModelLoaded = false;

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

    // ✅ 加入貼紙 sprite，增加錯誤處理
    try {
      const textureLoader = new THREE.TextureLoader();
      const stickerTexture = await textureLoader.loadAsync(stickerUrl);

      this.stickerSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: stickerTexture,
          transparent: true,
          color: 0xffffff,
        })
      );
      this.stickerSprite.scale.set(0.5, 0.5, 1);
      this.scene.add(this.stickerSprite);
    } catch (err) {
      console.error("🚨 貼紙載入失敗！貼紙 URL 可能錯誤或取得的是 HTML", err);
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

    // 貼紙 sprite 跟著場景移動（例如跟著頭部）
    if (this.stickerSprite) {
      this.stickerSprite.position.set(
        translation.x * 0.01,
        translation.y * 0.03 + 0.8, // 可微調高度
        (translation.z + 50) * 0.02
      );
      this.stickerSprite.renderOrder = 10; // 保證在最前面
    }

    // ★ 朝向修正：水平旋轉 90°
    // const fixRotation = new THREE.Quaternion().setFromAxisAngle(
    //   new THREE.Vector3(0, 1, 0),
    //   -Math.PI / 2
    // );
    // quaternion.multiply(fixRotation);

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
  };
}

export default AvatarManager;
