import { supabase, BUCKET } from "./supabase";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Resize + convert to JPEG so phone photos upload fast. Falls back to the original file. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("compress failed"))), "image/jpeg", quality)
    );
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const blob = await compressImage(file);
  const isJpeg = blob.type === "image/jpeg";
  const path = `${folder}/${uid()}.${isJpeg ? "jpg" : "bin"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: isJpeg ? "image/jpeg" : file.type || "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export async function removeImages(urls: (string | null | undefined)[]) {
  const paths = Array.from(new Set(urls.map(pathFromUrl).filter(Boolean))) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}
