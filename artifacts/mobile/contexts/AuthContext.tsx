import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { getApiUrl } from "@/lib/query-client";

async function convertToBase64(uri: string | undefined): Promise<string | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith("data:")) return uri;
  
  try {
    // Handle blob URLs on web
    if (Platform.OS === "web" && uri.startsWith("blob:")) {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    
    // For native platforms, use FileSystem
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting to base64:", error);
    return undefined;
  }
}

export type UserRole = "client" | "driver" | "admin";
export type VerificationStatus = "pending_verification" | "verified" | "rejected";

export interface DriverDocuments {
  cinFront?: string;
  cinBack?: string;
  selfieWithCin?: string;
  drivingLicenseFront?: string;
  drivingLicenseBack?: string;
  vehicleRegistrationFront?: string;
  vehicleRegistrationBack?: string;
  vehicleInsurance?: string;
}

export interface User {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: UserRole;
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string;
  avatarUrl?: string;
  rating: number;
  totalDeliveries: number;
  vehicleType?: string;
  nationalId?: string;
  documents?: DriverDocuments;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  loginAsAdmin: (code: string) => Promise<void>;
  signup: (data: SignupData) => Promise<{ user: User }>;
  signupDriver: (data: DriverSignupData) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  canAcceptOrders: () => boolean;
}

interface SignupData {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  avatarUrl?: string;
}

interface DriverSignupData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  nationalId: string;
  vehicleType: string;
  documents: DriverDocuments;
  avatarUrl?: string;
  aiChecksAllPassed?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@fayage_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.role === "driver" && user.verificationStatus !== "verified") {
      const checkStatus = async () => {
        try {
          const response = await fetch(new URL(`/api/drivers/${user.id}/status`, getApiUrl()).toString());
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              const newStatus = data.status as VerificationStatus;
              const rejectionReason = data.verificationNotes || undefined;
              if (newStatus !== user.verificationStatus || rejectionReason !== user.rejectionReason) {
                const updatedUser = { 
                  ...user, 
                  verificationStatus: newStatus,
                  isVerified: newStatus === "verified",
                  rejectionReason: newStatus === "rejected" ? rejectionReason : undefined,
                };
                setUser(updatedUser);
                await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
              }
            }
          }
        } catch (error) {
          console.error("Error checking driver status:", error);
        }
      };

      checkStatus();
      const interval = setInterval(checkStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.id, user?.role, user?.verificationStatus, user?.rejectionReason]);

  const loadUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, password: string) => {
    const response = await fetch(new URL("/api/auth/login", getApiUrl()).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(data.reason || "Account is banned");
      }
      throw new Error(data.error || "Invalid credentials");
    }

    if (data.success && data.user) {
      setUser(data.user);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
    } else {
      throw new Error("Login failed");
    }
  };

  const loginAsAdmin = async (code: string) => {
    if (code === "FAYAGE2024") {
      const adminUser: User = {
        id: "admin",
        fullName: "Administrator",
        phone: "admin",
        role: "admin",
        isVerified: true,
        rating: 0,
        totalDeliveries: 0,
      };
      setUser(adminUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
    } else {
      throw new Error("Invalid admin code");
    }
  };

  const signup = async (data: SignupData) => {
    const newUser: User = {
      id: Date.now().toString(),
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      role: data.role,
      isVerified: data.role === "client",
      verificationStatus: data.role === "driver" ? "pending_verification" : undefined,
      avatarUrl: data.avatarUrl,
      rating: 0,
      totalDeliveries: 0,
    };

    // Sync client to database
    if (data.role === "client") {
      try {
        let avatarBase64 = data.avatarUrl;
        if (data.avatarUrl && !data.avatarUrl.startsWith("data:")) {
          avatarBase64 = await convertToBase64(data.avatarUrl);
        }

        const response = await fetch(new URL("/api/clients/sync", getApiUrl()).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: {
              id: newUser.id,
              fullName: newUser.fullName,
              phone: newUser.phone,
              email: newUser.email,
              password: data.password,
              avatarUrl: avatarBase64,
              rating: 0,
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Échec de l'inscription");
        }
      } catch (error) {
        throw error;
      }
    }

    setUser(newUser);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    return { user: newUser };
  };

  const signupDriver = async (data: DriverSignupData) => {
    const autoVerified = data.aiChecksAllPassed === true;
    const newUser: User = {
      id: Date.now().toString(),
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      role: "driver",
      isVerified: autoVerified,
      verificationStatus: autoVerified ? "verified" : "pending_verification",
      avatarUrl: data.avatarUrl,
      rating: 0,
      totalDeliveries: 0,
      vehicleType: data.vehicleType,
      nationalId: data.nationalId,
      documents: data.documents,
    };

    try {
      const [avatarBase64, cinFrontBase64, cinBackBase64, licFrontBase64, licBackBase64, regFrontBase64, regBackBase64, insuranceBase64] = await Promise.all([
        convertToBase64(data.avatarUrl),
        convertToBase64(data.documents?.cinFront),
        convertToBase64(data.documents?.cinBack),
        convertToBase64(data.documents?.drivingLicenseFront),
        convertToBase64(data.documents?.drivingLicenseBack),
        convertToBase64(data.documents?.vehicleRegistrationFront),
        convertToBase64(data.documents?.vehicleRegistrationBack),
        convertToBase64(data.documents?.vehicleInsurance),
      ]);

      const documentsBase64 = {
        cinFront: cinFrontBase64,
        cinBack: cinBackBase64,
        drivingLicenseFront: licFrontBase64,
        drivingLicenseBack: licBackBase64,
        vehicleRegistrationFront: regFrontBase64,
        vehicleRegistrationBack: regBackBase64,
        vehicleInsurance: insuranceBase64,
      };

      const response = await fetch(new URL("/api/admin/drivers/sync", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drivers: [{
            id: newUser.id,
            fullName: newUser.fullName,
            phone: newUser.phone,
            email: newUser.email,
            password: data.password,
            nationalId: newUser.nationalId,
            vehicleType: newUser.vehicleType,
            verificationStatus: newUser.verificationStatus,
            documents: documentsBase64,
            avatarUrl: avatarBase64,
          }]
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Échec de l'inscription");
      }
    } catch (error) {
      throw error;
    }

    setUser(newUser);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));

    try {
      const endpoint = user.role === "driver" 
        ? `/api/drivers/${user.id}` 
        : `/api/clients/${user.id}`;
      
      let avatarBase64 = updates.avatarUrl;
      if (updates.avatarUrl && !updates.avatarUrl.startsWith("data:")) {
        avatarBase64 = await convertToBase64(updates.avatarUrl);
      }

      await fetch(new URL(endpoint, getApiUrl()).toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: updates.fullName,
          phone: updates.phone,
          email: updates.email,
          avatarUrl: avatarBase64 || updatedUser.avatarUrl,
        }),
      });
    } catch (error) {
      console.error("Error syncing user update to database:", error);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    const apiUrl = getApiUrl();
    const response = await fetch(new URL("/api/auth/account", apiUrl).toString(), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, userType: user.role }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete account");
    }
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  const canAcceptOrders = (): boolean => {
    if (!user) return false;
    if (user.role === "client") return true;
    return user.isVerified && user.verificationStatus === "verified";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginAsAdmin,
        signup,
        signupDriver,
        logout,
        deleteAccount,
        updateUser,
        canAcceptOrders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
