"use client";

import { useState } from "react";

interface PhotoUploadProps {
  tradeInId: string;
  onPhotosUploaded: (photos: {
    screen_on: string;
    back: string;
    side: string;
  }) => void;
}

export function PhotoUpload({ tradeInId, onPhotosUploaded }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<{
    screen_on?: string;
    back?: string;
    side?: string;
  }>({});
  const [uploading, setUploading] = useState<{
    screen_on: boolean;
    back: boolean;
    side: boolean;
  }>({
    screen_on: false,
    back: false,
    side: false,
  });

  const photoTypes = [
    { key: "screen_on" as const, label: "Tela ligada", required: true },
    { key: "back" as const, label: "Traseira", required: true },
    { key: "side" as const, label: "Lateral", required: true },
  ];

  const handleUpload = async (
    photoType: "screen_on" | "back" | "side",
    file: File,
  ) => {
    setUploading((prev) => ({ ...prev, [photoType]: true }));

    try {
      // Get presigned URL
      const presignRes = await fetch("/api/v1/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeInId,
          fileName: file.name,
          contentType: file.type,
          photoType,
        }),
      });

      if (!presignRes.ok) throw new Error("Falha ao gerar URL de upload");
      const { uploadUrl, fileUrl } = await presignRes.json();

      // Upload directly to S3/R2
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const newPhotos = { ...photos, [photoType]: fileUrl };
      setPhotos(newPhotos);

      // Confirm upload
      await fetch("/api/v1/uploads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeInId, photos: newPhotos }),
      });

      if (newPhotos.screen_on && newPhotos.back && newPhotos.side) {
        onPhotosUploaded(
          newPhotos as { screen_on: string; back: string; side: string },
        );
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao fazer upload da foto");
    } finally {
      setUploading((prev) => ({ ...prev, [photoType]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Fotos obrigatórias</h3>
      <p className="text-sm text-gray-600">
        Anexe 3 fotos: Tela ligada, Traseira e Lateral
      </p>

      {photoTypes.map(({ key, label, required }) => (
        <div key={key} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            {photos[key] && (
              <span className="text-green-600 text-sm">✓ Enviado</span>
            )}
          </div>

          {photos[key] ? (
            <img
              src={photos[key]}
              alt={label}
              className="w-full h-48 object-cover rounded"
            />
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(key, file);
                }}
                disabled={uploading[key]}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading[key] && (
                <p className="text-sm text-gray-500 mt-2">Enviando...</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
