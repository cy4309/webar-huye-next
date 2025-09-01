// import { useRef, useEffect } from "react";
// import { useFrame } from "@react-three/fiber";
// import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
// import * as THREE from "three";
// import faceMeshIndices from "@/utils/faceMeshIndices";
// import { BoxHelper } from "three";

// const FaceMeshMask = () => {
//   const meshRef = useRef<THREE.Mesh>(null);
//   const helperRef = useRef<THREE.BoxHelper>();

//   useEffect(() => {
//     if (meshRef.current) {
//       const helper = new BoxHelper(meshRef.current, 0x00ff00);
//       meshRef.current.parent?.add(helper);
//     }
//   }, []);

//   useFrame(() => {
//     const results = FaceLandmarkManager.getInstance().getResults();
//     const landmarks = results?.faceLandmarks?.[0];
//     const matrixData = results?.facialTransformationMatrixes?.[0]?.data;

//     if (landmarks && matrixData && meshRef.current) {
//       const geometry = new THREE.BufferGeometry();
//       const matrix = new THREE.Matrix4().fromArray(matrixData);
//       const positions: number[] = [];
//       const indices: number[] = [];

//       // ✅ 轉換 landmark 點位為 3D 世界座標
//       landmarks.forEach((pt) => {
//         const vec = new THREE.Vector3(pt.x - 0.5, -(pt.y - 0.5), pt.z);
//         vec.applyMatrix4(matrix);
//         positions.push(vec.x, vec.y, vec.z);
//       });
//       faceMeshIndices.forEach((tri) => {
//         indices.push(tri[0], tri[1], tri[2]);
//       });

//       geometry.setAttribute(
//         "position",
//         new THREE.Float32BufferAttribute(positions, 3)
//       );
//       geometry.setIndex(indices);
//       geometry.computeVertexNormals();

//       meshRef.current.geometry.dispose();
//       meshRef.current.geometry = geometry;

//       // ✅ 顯示 BoxHelper 框線（debug 用）
//       if (!helperRef.current) {
//         helperRef.current = new THREE.BoxHelper(meshRef.current, 0x00ff00);
//         meshRef.current.parent?.add(helperRef.current);
//       }
//       helperRef.current.update();
//     }
//   });

//   return (
//     <mesh ref={meshRef} renderOrder={0.5} frustumCulled={false}>
//       <bufferGeometry />
//       <meshBasicMaterial
//         depthWrite={true}
//         depthTest={true}
//         colorWrite={true}
//         transparent={true}
//         // side={THREE.BackSide}
//         side={THREE.DoubleSide}
//         color={"red"}
//       />
//     </mesh>
//   );
// };

// export default FaceMeshMask;

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import * as THREE from "three";
import faceMeshIndices from "@/utils/faceMeshIndices";
// import { BoxHelper } from "three";

const FaceMeshMask = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const tempVec = new THREE.Vector3();
  // const helperRef = useRef<THREE.BoxHelper>();

  // useEffect(() => {
  //   if (meshRef.current) {
  //     const helper = new BoxHelper(meshRef.current, 0x00ff00);
  //     meshRef.current.parent?.add(helper);
  //     helperRef.current = helper;
  //   }
  // }, []);

  useFrame(() => {
    const results = FaceLandmarkManager.getInstance().getResults();
    const landmarks = results?.faceLandmarks?.[0];
    const matrixData = results?.facialTransformationMatrixes?.[0]?.data;

    if (!landmarks || !matrixData || !meshRef.current) return;

    const geometry = new THREE.BufferGeometry();
    const matrix = new THREE.Matrix4().fromArray(matrixData);

    const positions: number[] = [];
    const indices: number[] = [];

    // ✅ 將每個 landmark 轉成相對於臉的世界座標（正確 Z 深度 & 姿態）
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      tempVec.set(pt.x - 0.5, -(pt.y - 0.5), pt.z);
      tempVec.applyMatrix4(matrix);
      positions.push(tempVec.x, tempVec.y, tempVec.z);
    }

    for (let i = 0; i < faceMeshIndices.length; i++) {
      const tri = faceMeshIndices[i];
      indices.push(tri[0], tri[1], tri[2]);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // ✅ 更新 geometry
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = geometry;

    // ✅ Optional: scale based on face distance
    const scale = matrix.getMaxScaleOnAxis();
    meshRef.current.scale.setScalar(scale * 1); // Slightly larger for occlusion

    // ✅ rotation 補正
    // const rotation = new THREE.Quaternion().setFromRotationMatrix(matrix);
    // const fixQuat = new THREE.Quaternion().setFromEuler(
    //   new THREE.Euler(0, 0, Math.PI / 2)
    // );
    // rotation.multiply(fixQuat);
    // meshRef.current.setRotationFromQuaternion(rotation);

    // ✅ 更新 BoxHelper（debug 用）
    // if (helperRef.current) {
    //   helperRef.current.update();
    // }
  });

  return (
    // ✅ 加入鏡像顯示（視需求加或拿掉）
    <group scale={[-1, 1, 1]}>
      <mesh ref={meshRef} renderOrder={0.5} frustumCulled={false}>
        <bufferGeometry />
        <meshBasicMaterial
          depthWrite={true}
          depthTest={true}
          colorWrite={true}
          transparent={true}
          color={"red"}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default FaceMeshMask;
