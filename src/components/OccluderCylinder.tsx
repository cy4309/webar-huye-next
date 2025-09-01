// import { useRef } from "react";
// import { useFrame } from "@react-three/fiber";
// import * as THREE from "three";
// import FaceLandmarkManager from "@/classes/FaceLandmarkManager";

// const OccluderCylinder = () => {
//   const meshRef = useRef<THREE.Mesh>(null);
//   const tempVec = new THREE.Vector3();

//   useFrame(() => {
//     const results = FaceLandmarkManager.getInstance().getResults();
//     const matrixData = results?.facialTransformationMatrixes?.[0]?.data;
//     const landmarks = results?.faceLandmarks?.[0];

//     if (!meshRef.current || !matrixData || !landmarks) return;

//     // ✅ 將 landmark[1]（鼻尖）轉換成世界座標
//     const matrix = new THREE.Matrix4().fromArray(matrixData);

//     // landmark[1] 是鼻尖（也可以試試 landmark[0] 是臉中心）
//     const noseLandmark = landmarks[1];
//     tempVec.set(noseLandmark.x - 0.5, -(noseLandmark.y - 0.5), noseLandmark.z);
//     tempVec.applyMatrix4(matrix);

//     // ✅ 將圓柱體移到鼻子的 3D 世界位置
//     meshRef.current.position.copy(tempVec);

//     // ✅ 套用同樣的旋轉方向（姿態朝向）
//     const rot = new THREE.Quaternion().setFromRotationMatrix(matrix);
//     meshRef.current.setRotationFromQuaternion(rot);

//     // ✅ 可選：臉部大小的 scale
//     const scale = matrix.getMaxScaleOnAxis(); // 通常臉部比例用不到這個，但可以補
//     meshRef.current.scale.setScalar(scale * 1.2); // 稍微放大一點當 occluder
//   });

//   return (
//     <mesh ref={meshRef} renderOrder={0.4}>
//       <cylinderGeometry args={[0.12, 0.12, 0.25, 32]} />
//       <meshBasicMaterial
//         color="yellow"
//         transparent
//         opacity={1}
//         // depthWrite={true}
//         // depthTest={true}
//         // colorWrite={false} // 如果是 occluder 要打開這個
//       />
//     </mesh>
//   );
// };

// export default OccluderCylinder;

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";

const OccluderCylinder = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const tempVec = new THREE.Vector3();

  useFrame(() => {
    const results = FaceLandmarkManager.getInstance().getResults();
    const matrixData = results?.facialTransformationMatrixes?.[0]?.data;
    const landmarks = results?.faceLandmarks?.[0];

    if (!meshRef.current || !matrixData || !landmarks) return;

    // ✅ 準備轉換 matrix
    const matrix = new THREE.Matrix4().fromArray(matrixData);

    // ✅ landmark[1] 是鼻尖（或改 landmark[0] 為臉中心也可）
    const nose = landmarks[1];
    tempVec.set(nose.x - 0.5, -(nose.y - 0.5), nose.z);
    tempVec.applyMatrix4(matrix);
    meshRef.current.position.copy(tempVec);

    // ✅ 同步臉的方向（Quaternion）
    const rot = new THREE.Quaternion().setFromRotationMatrix(matrix);

    // 加 90 度 Z 軸旋轉（視你朝哪邊調整）
    // const fixQuat = new THREE.Quaternion().setFromEuler(
    //   new THREE.Euler(0, 0, Math.PI / 2)
    // );
    // rot.multiply(fixQuat); // 把修正加上去

    meshRef.current.setRotationFromQuaternion(rot);

    // ✅ Optional: scale based on face distance
    const scale = matrix.getMaxScaleOnAxis();
    meshRef.current.scale.setScalar(scale * 1); // 放大一點方便遮擋
  });

  return (
    // ✅ 鏡像處理，確保與 2D 相機畫面一致
    <group scale={[-1, 1, 1]}>
      <mesh ref={meshRef} renderOrder={0.4}>
        <cylinderGeometry args={[0.12, 0.12, 0.25, 32]} />
        <meshBasicMaterial
          color="yellow"
          transparent
          opacity={1}
          // depthWrite={true}
          // depthTest={true}
          // colorWrite={false} // 如果是 occluder 要打開這個
        />
      </mesh>
    </group>
  );
};

export default OccluderCylinder;
