import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Spinner } from "./Loading";
import { Badge } from "./Badge";
import {
  getRecordActivityLogs,
  parseActivityLogChanges,
  getActionDisplayText,
  getActionIcon,
} from "@/services/api";
import type { ActivityLog } from "@/types";

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetName: string;
  recordId: string;
  title?: string;
}

export function ActivityLogModal({
  isOpen,
  onClose,
  sheetName,
  recordId,
  title = "Log Aktivitas",
}: ActivityLogModalProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sheetName && recordId) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sheetName, recordId]);

  const fetchLogs = async () => {
    if (!sheetName || !recordId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getRecordActivityLogs(sheetName, recordId);

      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || "Gagal memuat log aktivitas");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const getActionBadgeVariant = (
    action: ActivityLog["action"]
  ): "success" | "warning" | "danger" | "default" => {
    switch (action) {
      case "create":
        return "success";
      case "update":
        return "warning";
      case "delete":
        return "danger";
      default:
        return "default";
    }
  };

  const renderChanges = (changesJson: string | undefined) => {
    const changes = parseActivityLogChanges(changesJson);
    if (!changes) return null;

    // Check if it's a deleted record
    if (changes.deleted_data) {
      return (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs">
          <p className="font-medium text-red-700 dark:text-red-400 mb-1">
            Data yang dihapus:
          </p>
          <pre className="text-red-600 dark:text-red-300 overflow-auto max-h-32 text-[11px]">
            {JSON.stringify(changes.deleted_data, null, 2)}
          </pre>
        </div>
      );
    }

    const changesArray = Object.entries(changes);
    if (changesArray.length === 0) return null;

    return (
      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs">
        <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">
          Perubahan:
        </p>
        <div className="space-y-1">
          {changesArray.map(([key, value]) => (
            <div
              key={key}
              className="flex flex-wrap gap-1 items-center text-[11px]"
            >
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {key}:
              </span>
              <span className="text-red-500 line-through">
                {String(value.old || "-")}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-green-600 dark:text-green-400">
                {String(value.new || "-")}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* No Log Info */}
        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">Belum ada log aktivitas untuk data ini</p>
          </div>
        )}

        {/* Activity Log List */}
        {!loading && !error && logs.length > 0 && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Riwayat perubahan data ({logs.length} aktivitas):
            </p>
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getActionIcon(log.action)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {getActionDisplayText(log.action)}
                        </Badge>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {log.user_name || log.user_id}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {log.user_role} • {log.plant}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(log.timestamp)}
                  </span>
                </div>

                {log.record_preview && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-gray-400">Data: </span>
                    {log.record_preview}
                  </p>
                )}

                {renderChanges(log.changes)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
