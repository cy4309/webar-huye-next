import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import * as THREE from "three";
import faceMeshIndices from "@/utils/faceMeshIndices";

const FaceMeshMask = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const results = FaceLandmarkManager.getInstance().getResults();
    const landmarks = results?.faceLandmarks?.[0];
    const matrixData = results?.facialTransformationMatrixes?.[0]?.data;

    if (landmarks && matrixData && meshRef.current) {
      const geometry = new THREE.BufferGeometry();
      const matrix = new THREE.Matrix4().fromArray(matrixData);
      const positions: number[] = [];
      const indices: number[] = [];

      landmarks.forEach((pt) => {
        const vec = new THREE.Vector3(pt.x - 0.5, -(pt.y - 0.5), pt.z);
        vec.applyMatrix4(matrix);
        positions.push(vec.x, vec.y, vec.z);
      });

      faceMeshIndices.forEach((tri) => {
        indices.push(tri[0], tri[1], tri[2]);
      });

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      meshRef.current.geometry.dispose();
      meshRef.current.geometry = geometry;
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={0.5} frustumCulled={false}>
      <bufferGeometry />
      <meshBasicMaterial
        depthWrite={true}
        depthTest={true}
        colorWrite={false}
        transparent={true}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

export default FaceMeshMask;
