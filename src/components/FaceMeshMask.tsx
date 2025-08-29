import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import * as THREE from "three";
import faceMeshIndices from "@/utils/faceMeshIndices";
import { BoxHelper } from "three";

const FaceMeshMask = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  // const helperRef = useRef<THREE.BoxHelper>();

  useEffect(() => {
    if (meshRef.current) {
      const helper = new BoxHelper(meshRef.current, 0x00ff00);
      meshRef.current.parent?.add(helper);
    }
  }, []);

  useFrame(() => {
    const results = FaceLandmarkManager.getInstance().getResults();
    const landmarks = results?.faceLandmarks?.[0];
    const matrixData = results?.facialTransformationMatrixes?.[0]?.data;

    if (landmarks && matrixData && meshRef.current) {
      const geometry = new THREE.BufferGeometry();
      // const matrix = new THREE.Matrix4().fromArray(matrixData);
      const positions: number[] = [];
      const indices: number[] = [];

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      meshRef.current.geometry.dispose();
      meshRef.current.geometry = geometry;

      // ✅ 轉換 landmark 點位為 3D 世界座標
      // landmarks.forEach((pt) => {
      //   const vec = new THREE.Vector3(pt.x - 0.5, -(pt.y - 0.5), pt.z);
      //   vec.applyMatrix4(matrix);
      //   positions.push(vec.x, vec.y, vec.z);
      // });
      // faceMeshIndices.forEach((tri) => {
      //   indices.push(tri[0], tri[1], tri[2]);
      // });

      // // ✅ 顯示 BoxHelper 框線（debug 用）
      // if (!helperRef.current) {
      //   helperRef.current = new THREE.BoxHelper(meshRef.current, 0x00ff00);
      //   meshRef.current.parent?.add(helperRef.current);
      // }
      // helperRef.current.update();
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={0.5} frustumCulled={false}>
      <bufferGeometry />
      <meshBasicMaterial
        depthWrite={true}
        depthTest={true}
        transparent={true}
        colorWrite={true}
        // side={THREE.BackSide}
        side={THREE.DoubleSide}
        color={"red"}
      />
    </mesh>
  );
};

export default FaceMeshMask;
