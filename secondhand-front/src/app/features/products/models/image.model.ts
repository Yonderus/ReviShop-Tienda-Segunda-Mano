export type ImageKind = 'avatar' | 'icon' | 'cover' | 'gallery';

export interface ProductImage {
  _id: string;
  url: string;
  alt?: string;
  kind: ImageKind;
  isPrimary: boolean;
  order: number;
  width?: number;
  height?: number;
}

/** Lo que se envía al crear o editar: el orden del array es el orden de la galería. */
export interface ProductImageInput {
  url: string;
  alt: string;
}
