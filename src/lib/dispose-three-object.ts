import * as THREE from 'three';

/** Dispose unique geometries and materials owned by an object subtree. */
export function disposeThreeObjectResources(root: THREE.Object3D | null) {
  if (!root) return;

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => materials.add(material));
    } else if (mesh.material) {
      materials.add(mesh.material);
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
