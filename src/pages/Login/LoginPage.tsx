import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Factory, Eye, EyeOff, User, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/stores";
import { generateId } from "@/lib/utils";
import { loginUser } from "@/services/api";
import type { User as UserType } from "@/types";

// Prefetch dashboard data in background after login
const prefetchDashboardData = () => {
  // Import and prefetch in background - don't await
  import("@/services/api").then(({ fetchDataByPlant, SHEETS }) => {
    // Prefetch most important data for dashboard
    Promise.all([
      fetchDataByPlant(SHEETS.PRODUKSI_NPK),
      fetchDataByPlant(SHEETS.PRODUKSI_BLENDING),
      fetchDataByPlant(SHEETS.DOWNTIME),
      fetchDataByPlant(SHEETS.WORK_REQUEST),
    ]).catch(() => {
      // Silent fail - cache will be populated on actual page load
    });
  });
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate before setting loading
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError("Username dan password harus diisi");
      return;
    }
    
    setIsLoading(true);

    try {
      // Call API to login with fast timeout
      const result = await loginUser(trimmedUsername, password);

      if (result.success && result.data) {
        const userData = result.data.user as UserType;
        const sessionData = result.data.session as { id: string };

        // Generate device ID for this browser
        const deviceId = generateId("device");

        // Login to store
        login(userData, sessionData.id, deviceId);
        
        // Start prefetching dashboard data in background
        prefetchDashboardData();
        
        // Navigate immediately after login - don't wait for prefetch
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.error || "Username atau password salah");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  }, [username, password, login, navigate]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-primary-500 mb-4"
          >
            <Factory className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-xl font-display font-semibold text-white">
            NPK Production
          </h1>
          <p className="text-dark-400 text-sm mt-1">Management System</p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-800 rounded-xl p-8 border border-dark-700"
        >
          <h2 className="text-lg font-semibold text-white mb-6 text-center">
            Selamat Datang
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                  placeholder="Masukkan username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full py-3" isLoading={isLoading}>
              Masuk
            </Button>
          </form>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-dark-500 text-xs mt-6">
          © 2025 NPK Production Management System
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
