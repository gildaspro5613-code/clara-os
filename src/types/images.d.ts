/**
 * ============================================
 * CLARA OS — Global Type Declarations
 * --------------------------------------------
 * File : images.d.ts
 * Responsibility : Declares static asset module types so TypeScript
 * resolves image imports (PNG, JPG, SVG, etc.) without relying on
 * the auto-generated next-env.d.ts (which is gitignored).
 * ============================================
 */

declare module "*.png" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}

declare module "*.jpg" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}

declare module "*.jpeg" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}

declare module "*.gif" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}

declare module "*.webp" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}

declare module "*.avif" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
