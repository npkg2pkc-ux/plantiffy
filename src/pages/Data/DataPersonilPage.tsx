import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  History,
  Eye,
  Camera,
  Upload,
  X,
  RotateCcw,
  UserCheck,
  UserX,
  ArrowRightLeft,
  CreditCard,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  BadgeCheck,
  User,
} from "lucide-react";
import { useSaveShortcut, useDataWithLogging } from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  DataTable,
  SuccessOverlay,
  ActivityLogModal,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatDate,
  canAdd,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";
import { SHEETS, readData } from "@/services/api";
import type { Personil } from "@/types";

// Status options
const STATUS_OPTIONS = [
  { value: "Aktif", label: "Aktif" },
  { value: "Mutasi", label: "Mutasi" },
  { value: "Tidak Aktif", label: "Tidak Aktif" },
];

const initialFormState: Personil = {
  noBadge: "",
  foto: "",
  idCardPhoto: "",
  jabatan: "",
  nama: "",
  tempatTanggalLahir: "",
  alamat: "",
  noTelepon: "",
  mulaiBekerja: getCurrentDate(),
  status: "Aktif",
};

const DataPersonilPage = () => {
  const { user } = useAuthStore();
  const { createWithLog, updateWithLog, deleteWithLog } = useDataWithLogging();
  const [data, setData] = useState<Personil[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Personil>(initialFormState);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // View detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPersonil, setSelectedPersonil] = useState<Personil | null>(null);

  // Camera/Photo states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [photoTarget, setPhotoTarget] = useState<"foto" | "idCardPhoto">("idCardPhoto");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotoFileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRecordId, setLogRecordId] = useState("");

  // Check permissions
  const userIsViewOnly = isViewOnly(user?.role || "");
  const userCanAdd = canAdd(user?.role || "") && !userIsViewOnly;

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const formEl = document.querySelector("form");
      if (formEl) formEl.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await readData<Personil>(SHEETS.PERSONIL);
        if (result.success && result.data) {
          const sortedData = [...result.data].sort((a, b) =>
            (a.nama || "").localeCompare(b.nama || "")
          );
          setData(sortedData);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Start camera
  const startCamera = useCallback(
    async (facing: "environment" | "user" = "environment") => {
      setCameraError(null);
      setCameraReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facing,
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (error) {
        console.error("Camera error:", error);
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            setCameraError("Akses kamera ditolak. Mohon izinkan akses kamera.");
          } else if (error.name === "NotFoundError") {
            setCameraError("Kamera tidak ditemukan.");
          } else {
            setCameraError(`Error: ${error.message}`);
          }
        }
      }
    },
    []
  );

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

  // Capture photo with auto-crop to guide overlay area
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Get the displayed container size to calculate crop proportions
    const container = video.parentElement;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // The overlay guide uses inset-4 (16px) from all sides of the container
    const insetPx = 16;
    const guideLeft = insetPx / cw;
    const guideTop = insetPx / ch;
    const guideWidth = (cw - insetPx * 2) / cw;
    const guideHeight = (ch - insetPx * 2) / ch;

    // object-cover: video is scaled to cover the container, some parts may be clipped
    const videoAspect = vw / vh;
    const containerAspect = cw / ch;

    let srcX: number, srcY: number, srcW: number, srcH: number;

    if (videoAspect > containerAspect) {
      // Video is wider — left/right are clipped
      const visibleWidth = vh * containerAspect;
      const offsetX = (vw - visibleWidth) / 2;
      srcX = offsetX + guideLeft * visibleWidth;
      srcY = guideTop * vh;
      srcW = guideWidth * visibleWidth;
      srcH = guideHeight * vh;
    } else {
      // Video is taller — top/bottom are clipped
      const visibleHeight = vw / containerAspect;
      const offsetY = (vh - visibleHeight) / 2;
      srcX = guideLeft * vw;
      srcY = offsetY + guideTop * visibleHeight;
      srcW = guideWidth * vw;
      srcH = guideHeight * visibleHeight;
    }

    // For foto personil (circle), crop square from center of guide area
    if (photoTarget === "foto") {
      const side = Math.min(srcW, srcH);
      srcX = srcX + (srcW - side) / 2;
      srcY = srcY + (srcH - side) / 2;
      srcW = side;
      srcH = side;
    }

    canvas.width = Math.round(srcW);
    canvas.height = Math.round(srcH);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera, photoTarget]);

  // Switch camera
  const switchCamera = useCallback(() => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "foto" | "idCardPhoto") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diperbolehkan");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageData = ev.target?.result as string;
      setForm((prev) => ({ ...prev, [target]: imageData }));
    };
    reader.readAsDataURL(file);
  };

  // Open camera modal
  const openCameraModal = (target: "foto" | "idCardPhoto") => {
    setPhotoTarget(target);
    setCapturedImage(null);
    setCameraError(null);
    setShowCameraModal(true);
    setTimeout(() => startCamera(facingMode), 300);
  };

  // Close camera modal
  const closeCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
  };

  // Confirm captured photo
  const confirmPhoto = () => {
    if (capturedImage) {
      setForm((prev) => ({ ...prev, [photoTarget]: capturedImage }));
    }
    closeCameraModal();
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = { ...form };

      if (editingId) {
        const dataToUpdate = { ...formData, id: editingId };
        const updateResult = await updateWithLog<Personil>(
          SHEETS.PERSONIL,
          dataToUpdate
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId ? { ...formData, id: editingId } : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const createResult = await createWithLog<Personil>(
          SHEETS.PERSONIL,
          formData
        );
        if (createResult.success && createResult.data) {
          setData((prev) =>
            [...prev, createResult.data!].sort((a, b) =>
              (a.nama || "").localeCompare(b.nama || "")
            )
          );
        } else {
          throw new Error(createResult.error || "Gagal menyimpan data");
        }
      }

      setShowForm(false);
      setForm(initialFormState);
      setCapturedImage(null);
      setEditingId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving data:", error);
      alert(
        error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (item: Personil) => {
    setForm(item);
    setCapturedImage(null);
    setEditingId(item.id || null);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const deleteResult = await deleteWithLog(SHEETS.PERSONIL, {
        id: deleteId,
      });
      if (deleteResult.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        setShowDeleteConfirm(false);
        setDeleteId(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        throw new Error(deleteResult.error || "Gagal menghapus data");
      }
    } catch (error) {
      console.error("Error deleting data:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  // Handle view detail
  const handleViewDetail = (item: Personil) => {
    setSelectedPersonil(item);
    setShowDetailModal(true);
  };

  // Handle view log
  const handleViewLog = (id: string) => {
    setLogRecordId(id);
    setShowLogModal(true);
  };

  // Open add form
  const openAddForm = () => {
    setForm(initialFormState);
    setCapturedImage(null);
    setEditingId(null);
    setShowForm(true);
  };

  // Filter data
  const filteredData = data.filter((item) => {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  // Stats
  const totalPersonil = data.length;
  const totalAktif = data.filter((d) => d.status === "Aktif").length;
  const totalMutasi = data.filter((d) => d.status === "Mutasi").length;
  const totalTidakAktif = data.filter((d) => d.status === "Tidak Aktif").length;

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aktif":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Mutasi":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "Tidak Aktif":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Table columns
  const columns = [
    {
      key: "noBadge",
      header: "No Badge",
      sortable: true,
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">
          {value as string}
        </span>
      ),
    },
    {
      key: "nama",
      header: "Nama",
      sortable: true,
      render: (value: unknown, row: Personil) => (
        <div className="flex items-center gap-3">
          {row.foto ? (
            <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-primary-200 dark:ring-primary-800 flex-shrink-0">
              <img
                src={row.foto}
                alt={row.nama}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(value as string)?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <span className="font-medium">{value as string}</span>
        </div>
      ),
    },
    { key: "jabatan", header: "Jabatan", sortable: true },
    {
      key: "noTelepon",
      header: "No Telepon",
      render: (value: unknown) => (
        <span className="font-mono text-sm">{value as string}</span>
      ),
    },
    {
      key: "mulaiBekerja",
      header: "Mulai Bekerja",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value: unknown) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(value as string)}`}
        >
          {value === "Aktif" && <UserCheck className="h-3 w-3" />}
          {value === "Mutasi" && <ArrowRightLeft className="h-3 w-3" />}
          {value === "Tidak Aktif" && <UserX className="h-3 w-3" />}
          {value as string}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900 dark:text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg">
              <Users className="h-6 w-6" />
            </div>
            Data Personil
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Kelola data personil karyawan Plant NPK
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userCanAdd && (
            <Button onClick={openAddForm} className="shadow-lg shadow-primary-500/25">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Personil
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 border-l-4 border-l-primary-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">Total Personil</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                {totalPersonil}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">Aktif</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {totalAktif}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">Mutasi</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {totalMutasi}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <ArrowRightLeft className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">Tidak Aktif</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                {totalTidakAktif}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
              <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Daftar Personil
            </CardTitle>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "Semua Status" },
                ...STATUS_OPTIONS,
              ]}
              className="w-40"
            />
          </div>
        </CardHeader>
        <DataTable
          data={filteredData}
          columns={columns}
          loading={loading}
          searchable={true}
          searchPlaceholder="Cari nama, badge, jabatan, telepon..."
          searchKeys={["noBadge", "nama", "jabatan", "noTelepon", "alamat", "tempatTanggalLahir"]}
          actions={(row) => (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetail(row);
                }}
                title="Lihat Detail"
              >
                <Eye className="h-4 w-4 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewLog(row.id!);
                }}
                title="Lihat Log"
              >
                <History className="h-4 w-4 text-purple-600" />
              </Button>
              {!userIsViewOnly && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(row);
                    }}
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4 text-primary-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(row.id!);
                    }}
                    title="Hapus"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </>
              )}
            </div>
          )}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setForm(initialFormState);
          setCapturedImage(null);
          setEditingId(null);
        }}
        title={editingId ? "Edit Data Personil" : "Tambah Data Personil"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Uploads - Two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Foto Personil */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-dark-700 dark:text-dark-300 flex items-center gap-2">
                <User className="h-4 w-4" />
                Foto Personil
              </label>
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  {form.foto ? (
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-3 border-primary-200 dark:border-primary-800 shadow-lg">
                      <img src={form.foto} alt="Foto" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, foto: "" }))}
                        className="absolute top-0 right-0 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-dark-300 dark:border-dark-600 flex flex-col items-center justify-center text-dark-400 dark:text-dark-500 bg-dark-50 dark:bg-dark-800/50">
                      <User className="h-8 w-8 mb-1" />
                      <span className="text-[10px]">Foto Diri</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openCameraModal("foto")} className="text-xs">
                    <Camera className="h-3 w-3 mr-1" /> Kamera
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fotoFileInputRef.current?.click()} className="text-xs">
                    <Upload className="h-3 w-3 mr-1" /> Upload
                  </Button>
                  <input ref={fotoFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "foto")} />
                </div>
              </div>
            </div>

            {/* Foto ID Card */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-dark-700 dark:text-dark-300 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Foto ID Card
              </label>
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  {form.idCardPhoto ? (
                    <div className="relative w-44 h-28 rounded-xl overflow-hidden border-2 border-primary-200 dark:border-primary-800 shadow-lg">
                      <img src={form.idCardPhoto} alt="ID Card" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, idCardPhoto: "" }))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-44 h-28 rounded-xl border-2 border-dashed border-dark-300 dark:border-dark-600 flex flex-col items-center justify-center text-dark-400 dark:text-dark-500 bg-dark-50 dark:bg-dark-800/50">
                      <CreditCard className="h-8 w-8 mb-1" />
                      <span className="text-[10px]">ID Card</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openCameraModal("idCardPhoto")} className="text-xs">
                    <Camera className="h-3 w-3 mr-1" /> Kamera
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                    <Upload className="h-3 w-3 mr-1" /> Upload
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "idCardPhoto")} />
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="No Badge"
              type="text"
              value={form.noBadge}
              onChange={(e) => setForm((prev) => ({ ...prev, noBadge: e.target.value }))}
              placeholder="Contoh: 12345"
              required
            />
            <Input
              label="Nama Lengkap"
              type="text"
              value={form.nama}
              onChange={(e) => setForm((prev) => ({ ...prev, nama: e.target.value }))}
              placeholder="Nama lengkap personil"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Jabatan"
              type="text"
              value={form.jabatan}
              onChange={(e) => setForm((prev) => ({ ...prev, jabatan: e.target.value }))}
              placeholder="Contoh: Operator, Supervisor"
              required
            />
            <Input
              label="Tempat, Tanggal Lahir"
              type="text"
              value={form.tempatTanggalLahir}
              onChange={(e) => setForm((prev) => ({ ...prev, tempatTanggalLahir: e.target.value }))}
              placeholder="Contoh: Jakarta, 01 Januari 1990"
              required
            />
          </div>

          <Input
            label="Alamat"
            type="text"
            value={form.alamat}
            onChange={(e) => setForm((prev) => ({ ...prev, alamat: e.target.value }))}
            placeholder="Alamat lengkap"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="No Telepon"
              type="text"
              value={form.noTelepon}
              onChange={(e) => setForm((prev) => ({ ...prev, noTelepon: e.target.value }))}
              placeholder="Contoh: 081234567890"
              required
            />
            <Input
              label="Mulai Bekerja / Masuk Plant NPK"
              type="date"
              value={form.mulaiBekerja}
              onChange={(e) => setForm((prev) => ({ ...prev, mulaiBekerja: e.target.value }))}
              required
            />
          </div>

          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Personil["status"] }))}
            options={STATUS_OPTIONS}
            required
          />

          <div className="flex justify-end gap-2 pt-4 border-t dark:border-dark-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setForm(initialFormState);
                setCapturedImage(null);
                setEditingId(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={loading}>
              {editingId ? "Update" : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Camera Modal */}
      <Modal
        isOpen={showCameraModal}
        onClose={closeCameraModal}
        title={photoTarget === "foto" ? "Foto Personil" : "Foto ID Card"}
        size="lg"
      >
        <div className="space-y-4">
          {cameraError ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-red-600 dark:text-red-400 text-sm">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => startCamera(facingMode)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            </div>
          ) : capturedImage ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border-2 border-primary-200 dark:border-primary-800">
                <img
                  src={capturedImage}
                  alt="Captured ID Card"
                  className="w-full max-h-[60vh] object-contain bg-dark-50 dark:bg-dark-900"
                />
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera(facingMode);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Foto Ulang
                </Button>
                <Button onClick={confirmPhoto}>
                  <BadgeCheck className="h-4 w-4 mr-2" />
                  Gunakan Foto Ini
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-dark-900/80">
                    <div className="text-center text-white">
                      <Camera className="h-10 w-10 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">Memuat kamera...</p>
                    </div>
                  </div>
                )}
                {/* Camera overlay guide */}
                <div className={`absolute inset-4 border-2 border-dashed border-white/40 ${photoTarget === "foto" ? "rounded-full" : "rounded-xl"} pointer-events-none`}>
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full">
                    {photoTarget === "foto" ? "Posisikan wajah di dalam bingkai" : "Posisikan ID Card di dalam bingkai"}
                  </div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="sm" onClick={switchCamera}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Ganti Kamera
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="px-8"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Ambil Foto
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPersonil(null);
        }}
        title="Detail Personil"
        size="lg"
      >
        {selectedPersonil && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 p-6 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative flex flex-col sm:flex-row items-center gap-5">
                {selectedPersonil.foto ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/30 shadow-xl flex-shrink-0">
                    <img
                      src={selectedPersonil.foto}
                      alt={selectedPersonil.nama}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/30 flex-shrink-0">
                    <span className="text-3xl font-bold">
                      {selectedPersonil.nama?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold">{selectedPersonil.nama}</h2>
                  <p className="text-primary-100 text-sm mt-0.5">{selectedPersonil.jabatan}</p>
                  <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedPersonil.status === "Aktif"
                        ? "bg-emerald-400/20 text-emerald-100"
                        : selectedPersonil.status === "Mutasi"
                        ? "bg-amber-400/20 text-amber-100"
                        : "bg-red-400/20 text-red-100"
                    }`}>
                      {selectedPersonil.status === "Aktif" && <UserCheck className="h-3 w-3" />}
                      {selectedPersonil.status === "Mutasi" && <ArrowRightLeft className="h-3 w-3" />}
                      {selectedPersonil.status === "Tidak Aktif" && <UserX className="h-3 w-3" />}
                      {selectedPersonil.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <BadgeCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">No Badge</p>
                  <p className="font-semibold text-dark-900 dark:text-white font-mono">
                    {selectedPersonil.noBadge}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Jabatan</p>
                  <p className="font-semibold text-dark-900 dark:text-white">
                    {selectedPersonil.jabatan}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700">
                <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                  <Calendar className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Tempat, Tanggal Lahir</p>
                  <p className="font-semibold text-dark-900 dark:text-white">
                    {selectedPersonil.tempatTanggalLahir}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">No Telepon</p>
                  <p className="font-semibold text-dark-900 dark:text-white font-mono">
                    {selectedPersonil.noTelepon}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700 sm:col-span-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Alamat</p>
                  <p className="font-semibold text-dark-900 dark:text-white">
                    {selectedPersonil.alamat}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700 sm:col-span-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Mulai Bekerja / Masuk Plant NPK</p>
                  <p className="font-semibold text-dark-900 dark:text-white">
                    {formatDate(selectedPersonil.mulaiBekerja)}
                  </p>
                </div>
              </div>
            </div>

            {/* ID Card Photo */}
            {selectedPersonil.idCardPhoto && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Foto ID Card
                </h3>
                <div className="rounded-2xl overflow-hidden border-2 border-dark-200 dark:border-dark-700 shadow-lg">
                  <img
                    src={selectedPersonil.idCardPhoto}
                    alt={`ID Card - ${selectedPersonil.nama}`}
                    className="w-full max-h-[400px] object-contain bg-dark-50 dark:bg-dark-900"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Data Personil"
        message="Apakah Anda yakin ingin menghapus data personil ini? Data yang dihapus tidak dapat dikembalikan."
        confirmText="Hapus"
        isLoading={loading}
      />

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        sheetName={SHEETS.PERSONIL}
        recordId={logRecordId}
      />

      {/* Success Overlay */}
      <SuccessOverlay isVisible={showSuccess} />
    </div>
  );
};

export default DataPersonilPage;
