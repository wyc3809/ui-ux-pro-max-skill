import * as ImagePicker from "expo-image-picker";
import { type MediaFile, type MediaKind, validateMedia } from "./media";

/**
 * Picks an icon, screenshot or video from the photo library (iOS, Android and the web share expo-image-picker)
 * and checks it against lib/media.ts before anything is uploaded. Icons open the square crop.
 */
export type PickedMedia = MediaFile & { uri: string; fileName: string };

const MIME_BY_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime" };

export async function pickMedia(kind: MediaKind): Promise<{ file: PickedMedia } | { error: string } | null> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === "video" ? ["videos"] : ["images"],
    allowsEditing: kind === "icon",
    aspect: kind === "icon" ? [1, 1] : undefined,
    quality: 0.9,
  });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  const ext = (a.fileName ?? a.uri).split("?")[0]!.split(".").pop()?.toLowerCase() ?? "";
  const bytes = a.fileSize ?? (await fetch(a.uri).then((res) => res.blob()).then((b) => b.size).catch(() => 0));
  const file: PickedMedia = {
    uri: a.uri,
    fileName: a.fileName ?? `media.${ext || "bin"}`,
    mime: a.mimeType ?? MIME_BY_EXT[ext] ?? "",
    bytes,
    width: a.width,
    height: a.height,
    durationMs: a.duration ?? undefined,
  };
  const error = validateMedia(kind, file);
  return error ? { error } : { file };
}
