import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  Trash2,
  Image,
  FolderOpen,
  ExternalLink,
  Search,
  RefreshCw,
  Download,
  ZoomIn,
  AlertCircle,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button, Card, Input, Spinner, Modal } from "@/components/ui";
import {
  readData,
  uploadPhoto,
  deletePhoto,
  getSheetNameByPlant,
  SHEETS,
} from "@/services/api";
import { useAuthStore } from "@/stores";
import { cn, isViewOnly } from "@/lib/utils";
import type { DokumentasiFoto, PlantType } from "@/types";

interface DokumentasiFotoPageProps {
  plant: PlantType;
}

interface PhotoFormData {
  judul: string;
  keterangan: string;
}

export default function DokumentasiFotoPage({
  plant,
}: DokumentasiFotoPageProps) {
  const { user } = useAuthStore();
  const viewOnly = isViewOnly(user?.role || "");

  // State
  const [photos, setPhotos] = useState<DokumentasiFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DokumentasiFoto | null>(
    null
  );

  // Camera states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<PhotoFormData>({
    judul: "",
    keterangan: "",
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sheetName = getSheetNameByPlant(
    SHEETS.DOKUMENTASI_FOTO,
    plant as "NPK1" | "NPK2"
  );

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await readData<DokumentasiFoto>(sheetName);
      if (result.success && result.data) {
        // Add thumbnailUrl to each photo
        const photosWithThumbnails = result.data.map((photo) => ({
          ...photo,
          _plant: plant,
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${photo.fileId}&sz=w400`,
        }));
        // Sort by date descending
        photosWithThumbnails.sort(
          (a, b) =>
            new Date(b.createdAt || b.tanggal).getTime() -
            new Date(a.createdAt || a.tanggal).getTime()
        );
        setPhotos(photosWithThumbnails);
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  }, [sheetName, plant]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Start camera - simplified version
  const startCamera = useCallback(
    async (facing: "environment" | "user" = "environment") => {
      setCameraError(null);
      setCameraReady(false);

      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        // Simple constraints that work on most devices
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facing,
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Let autoPlay handle playing
          setCameraReady(true);
        }
      } catch (error) {
        console.error("Camera error:", error);
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            setCameraError(
              "Akses kamera ditolak. Mohon izinkan akses kamera di pengaturan browser."
            );
          } else if (error.name === "NotFoundError") {
            setCameraError(
              "Kamera tidak ditemukan. Pastikan perangkat memiliki kamera."
            );
          } else if (error.name === "NotReadableError") {
            setCameraError(
              "Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain dan coba lagi."
            );
          } else {
            setCameraError(`Error: ${error.message}`);
          }
        }
      }
    },
    []
  );

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data as base64
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);

    // Stop camera after capture
    stopCamera();
  }, [stopCamera]);

  // Confirm captured photo and show form
  const confirmPhoto = useCallback(() => {
    setShowCameraModal(false);
    setShowFormModal(true);
  }, []);

  // Handle file input (for gallery selection)
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file maksimal 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCapturedImage(result);
        stopCamera();
        // Show form modal after selecting from gallery
        setShowCameraModal(false);
        setShowFormModal(true);
      };
      reader.readAsDataURL(file);

      // Reset input value so same file can be selected again
      e.target.value = "";
    },
    [stopCamera]
  );

  // Open camera modal
  const openCameraModal = () => {
    setCapturedImage(null);
    setFormData({ judul: "", keterangan: "" });
    setCameraError(null);
    setCameraReady(false);
    setShowCameraModal(true);
  };

  // Effect to start camera when modal opens
  useEffect(() => {
    let mounted = true;

    if (showCameraModal && !capturedImage) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (mounted) {
          startCamera(facingMode);
        }
      }, 200);
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }

    return () => {
      mounted = false;
    };
  }, [showCameraModal, capturedImage, facingMode, startCamera]);

  // Close camera modal
  const closeCameraModal = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setFormData({ judul: "", keterangan: "" });
    setCameraError(null);
    setShowCameraModal(false);
    setShowFormModal(false);
  }, [stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera(facingMode);
  }, [facingMode, startCamera]);

  // Upload photo
  const handleUpload = async () => {
    if (!capturedImage || !formData.judul.trim()) {
      alert("Judul foto harus diisi!");
      return;
    }

    setUploading(true);

    try {
      const fileName = `${formData.judul.replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      )}_${Date.now()}.jpg`;

      const result = await uploadPhoto({
        judul: formData.judul.trim(),
        keterangan: formData.keterangan.trim(),
        imageBase64: capturedImage,
        fileName,
        uploadBy: user?.username || user?.nama || "unknown",
        plant: plant,
      });

      if (result.success) {
        alert("Foto berhasil diupload!");
        closeCameraModal();
        fetchPhotos();
      } else {
        alert(`Gagal upload: ${result.error}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Terjadi kesalahan saat upload foto");
    } finally {
      setUploading(false);
    }
  };

  // Delete photo
  const handleDelete = async () => {
    if (!selectedPhoto?.id || !selectedPhoto?.fileId) return;

    setUploading(true);

    try {
      const result = await deletePhoto({
        id: selectedPhoto.id,
        fileId: selectedPhoto.fileId,
        plant: plant,
      });

      if (result.success) {
        alert("Foto berhasil dihapus!");
        setShowDeleteModal(false);
        setSelectedPhoto(null);
        fetchPhotos();
      } else {
        alert(`Gagal menghapus: ${result.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Terjadi kesalahan saat menghapus foto");
    } finally {
      setUploading(false);
    }
  };

  // Open preview
  const openPreview = (photo: DokumentasiFoto) => {
    setSelectedPhoto(photo);
    setShowPreviewModal(true);
  };

  // Filter photos by search
  const filteredPhotos = photos.filter(
    (photo) =>
      photo.judul?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.uploadBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group photos by judul (folder)
  const groupedPhotos = filteredPhotos.reduce((acc, photo) => {
    const key = photo.judul || "Lainnya";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(photo);
    return acc;
  }, {} as Record<string, DokumentasiFoto[]>);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dokumentasi Foto</h1>
          <p className="text-gray-600">
            Plant {plant} - {photos.length} foto
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari foto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchPhotos}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
              />
              Refresh
            </Button>

            {!viewOnly && (
              <Button
                onClick={openCameraModal}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                Ambil Foto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {/* Empty State */}
      {!loading && photos.length === 0 && (
        <Card className="p-12 text-center">
          <Image className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Belum Ada Foto
          </h3>
          <p className="text-gray-500 mb-6">
            Mulai dokumentasi dengan mengambil foto pertama
          </p>
          {!viewOnly && (
            <Button
              onClick={openCameraModal}
              className="bg-green-600 hover:bg-green-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Ambil Foto Sekarang
            </Button>
          )}
        </Card>
      )}

      {/* Photo Grid by Folder */}
      {!loading && Object.keys(groupedPhotos).length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedPhotos).map(([folder, folderPhotos]) => (
            <div key={folder}>
              {/* Folder Header */}
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="h-5 w-5 text-yellow-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {folder}
                </h2>
                <span className="text-sm text-gray-500">
                  ({folderPhotos.length} foto)
                </span>
                {folderPhotos[0]?.folderUrl && (
                  <a
                    href={folderPhotos[0].folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Buka Folder
                  </a>
                )}
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {folderPhotos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => openPreview(photo)}
                  >
                    {/* Thumbnail */}
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.judul}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";
                      }}
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs truncate">
                          {photo.tanggal}
                        </p>
                        {photo.keterangan && (
                          <p className="text-white/80 text-xs truncate">
                            {photo.keterangan}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Zoom Icon */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Camera Overlay - Direct render without portal for iOS compatibility */}
      {showCameraModal && (
        <div
          className="fixed inset-0 bg-black"
          style={{
            zIndex: 99999,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
          }}
        >
          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: "none" }}
          />

          {!capturedImage ? (
            <>
              {/* Video Stream - Full Screen */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onCanPlay={() => setCameraReady(true)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
              />

              {/* Top Bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  paddingTop: "48px",
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
                }}
              >
                <button
                  onClick={closeCameraModal}
                  style={{
                    padding: "12px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={24} />
                </button>

                <span
                  style={{ color: "white", fontWeight: 500, fontSize: "18px" }}
                >
                  Ambil Foto
                </span>

                <button
                  onClick={switchCamera}
                  style={{
                    padding: "12px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={24} />
                </button>
              </div>

              {/* Camera Loading */}
              {!cameraReady && !cameraError && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    zIndex: 20,
                  }}
                >
                  <div style={{ textAlign: "center", color: "white" }}>
                    <Spinner />
                    <p style={{ marginTop: "8px" }}>Memuat kamera...</p>
                  </div>
                </div>
              )}

              {/* Camera Error */}
              {cameraError && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "black",
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      color: "white",
                      padding: "24px",
                      maxWidth: "320px",
                    }}
                  >
                    <AlertCircle
                      size={64}
                      style={{ margin: "0 auto 16px", color: "#f87171" }}
                    />
                    <p style={{ marginBottom: "24px", fontSize: "18px" }}>
                      {cameraError}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <Button
                        onClick={() => startCamera()}
                        className="bg-white text-black hover:bg-gray-200"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Coba Lagi
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-white border-white hover:bg-white/10"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Pilih dari Galeri
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Controls */}
              {cameraReady && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    paddingBottom: "32px",
                    paddingTop: "64px",
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "32px",
                    }}
                  >
                    {/* Gallery Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: "16px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255,255,255,0.2)",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Image size={28} />
                    </button>

                    {/* Capture Button */}
                    <button
                      onClick={capturePhoto}
                      style={{
                        padding: "4px",
                        borderRadius: "50%",
                        backgroundColor: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "50%",
                          border: "4px solid #d1d5db",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            backgroundColor: "white",
                          }}
                        />
                      </div>
                    </button>

                    {/* Placeholder for symmetry */}
                    <div style={{ width: "60px" }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Captured Image Preview - Full Screen */}
              <img
                src={capturedImage}
                alt="Captured"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  backgroundColor: "black",
                }}
              />

              {/* Top Bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  paddingTop: "48px",
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
                }}
              >
                <button
                  onClick={closeCameraModal}
                  style={{
                    padding: "12px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={24} />
                </button>

                <span
                  style={{ color: "white", fontWeight: 500, fontSize: "18px" }}
                >
                  Preview Foto
                </span>

                <div style={{ width: "48px" }} />
              </div>

              {/* Bottom Controls for Preview */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  paddingBottom: "32px",
                  paddingTop: "64px",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "48px",
                  }}
                >
                  {/* Retake Button */}
                  <button
                    onClick={retakePhoto}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      color: "white",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255,255,255,0.2)",
                      }}
                    >
                      <RotateCcw size={28} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 500 }}>
                      Ulangi
                    </span>
                  </button>

                  {/* Confirm Button */}
                  <button
                    onClick={confirmPhoto}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      color: "white",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        padding: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#22c55e",
                      }}
                    >
                      <Check size={40} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 500 }}>
                      Gunakan Foto
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Form Modal - After Photo Captured */}
      <AnimatePresence>
        {showFormModal && capturedImage && (
          <Modal
            isOpen={showFormModal}
            onClose={closeCameraModal}
            title="Upload Foto"
            size="lg"
          >
            <div className="space-y-4">
              {/* Image Preview Thumbnail */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-48 object-cover"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFormModal(false);
                    setShowCameraModal(true);
                    retakePhoto();
                  }}
                  className="absolute bottom-2 right-2 bg-white/90 hover:bg-white"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Ganti Foto
                </Button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judul / Nama Folder <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: C2-L-001"
                    value={formData.judul}
                    onChange={(e) =>
                      setFormData({ ...formData, judul: e.target.value })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Foto akan disimpan di folder sesuai judul ini
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <textarea
                    placeholder="Deskripsi foto (opsional)"
                    value={formData.keterangan}
                    onChange={(e) =>
                      setFormData({ ...formData, keterangan: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={closeCameraModal}
                    className="flex-1"
                    disabled={uploading}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !formData.judul.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Foto
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedPhoto && (
          <Modal
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedPhoto(null);
            }}
            title={selectedPhoto.judul}
            size="xl"
          >
            <div className="space-y-4">
              {/* Full Image */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={`https://drive.google.com/thumbnail?id=${selectedPhoto.fileId}&sz=w1200`}
                  alt={selectedPhoto.judul}
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tanggal:</span>
                  <span className="font-medium">{selectedPhoto.tanggal}</span>
                </div>
                {selectedPhoto.keterangan && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Keterangan:</span>
                    <span className="font-medium">
                      {selectedPhoto.keterangan}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Diupload oleh:</span>
                  <span className="font-medium">{selectedPhoto.uploadBy}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={selectedPhoto.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Buka di Drive
                  </Button>
                </a>
                <a
                  href={`https://drive.google.com/uc?export=download&id=${selectedPhoto.fileId}`}
                  download
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </a>
                {!viewOnly && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPreviewModal(false);
                      setShowDeleteModal(true);
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedPhoto && (
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedPhoto(null);
            }}
            title="Hapus Foto"
            size="sm"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-900">
                    Apakah Anda yakin ingin menghapus foto ini?
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Foto "{selectedPhoto.judul}" akan dihapus dari Google Drive.
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1"
                  disabled={uploading}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={uploading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
