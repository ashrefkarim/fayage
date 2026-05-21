import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { navigate } from "@/lib/navigationRef";

export interface OrderNotification {
  type: "driver_offered" | "driver_approved" | "driver_rejected" | "status_changed" | "new_order" | "new_message" | "payment_accepted" | "payment_rejected";
  orderId: string;
  message: string;
  driverName?: string;
  senderName?: string;
  senderAvatarUrl?: string;
}

export type RequestStatus = "pending" | "awaiting_client_approval" | "waiting_for_payment" | "paid" | "accepted" | "driver_arrived" | "pickup" | "in_transit" | "delivered" | "cancelled";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface TransportRequest {
  id: string;
  orderNumber?: number;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientRating: number;
  clientAvatarUrl?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverAvatarUrl?: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoords?: LocationCoordinates;
  deliveryCoords?: LocationCoordinates;
  vehicleType: string;
  goodsDescription: string;
  goodsPhotos?: string[];
  estimatedWeight: number;
  deliveryOption: "standard" | "urgent" | "express";
  estimatedPrice: number;
  proposedPrice: number;
  finalPrice?: number;
  distance: number;
  estimatedTime: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  clientRated?: boolean;
  driverRated?: boolean;
  clientGivenRating?: number;
  driverGivenRating?: number;
  clientReview?: string;
  driverReview?: string;
  clientSignature?: string;
  deliveryPhoto?: string;
  hasDeliveryPhoto?: boolean;
  hasClientSignature?: boolean;
  deliveredAt?: string;
  completedAt?: string;
  scheduledFor?: string;
  preferredDriverId?: string;
}

interface RequestsContextType {
  requests: TransportRequest[];
  isLoading: boolean;
  error: string | null;
  notification: OrderNotification | null;
  clearNotification: () => void;
  createRequest: (data: CreateRequestData) => Promise<TransportRequest>;
  updateRequest: (id: string, updates: Partial<TransportRequest>) => Promise<void>;
  acceptRequest: (id: string, driverId: string, driverName: string, driverPhone: string, driverRating: number, finalPrice?: number) => Promise<void>;
  updateOrderStatus: (id: string, status: RequestStatus) => Promise<void>;
  submitRating: (orderId: string, isClientRating: boolean, rating: number, review?: string) => Promise<void>;
  getClientRequests: (clientId: string) => TransportRequest[];
  getDriverRequests: (driverId: string) => TransportRequest[];
  getAvailableRequests: (driverId?: string, isVerified?: boolean) => TransportRequest[];
  refreshRequests: () => Promise<void>;
  isConnected: boolean;
}

interface CreateRequestData {
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientRating: number;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoords?: LocationCoordinates;
  deliveryCoords?: LocationCoordinates;
  vehicleType: string;
  goodsDescription: string;
  estimatedWeight: number;
  deliveryOption: "standard" | "urgent" | "express";
  proposedPrice: number;
  scheduledFor?: Date;
  preferredDriverId?: string;
  goodsPhotos?: string[];
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

function calculateDistance(
  pickupCoords?: LocationCoordinates,
  deliveryCoords?: LocationCoordinates
): number {
  if (!pickupCoords || !deliveryCoords) {
    return 10;
  }

  const R = 6371;
  const lat1 = pickupCoords.latitude * Math.PI / 180;
  const lat2 = deliveryCoords.latitude * Math.PI / 180;
  const deltaLat = (deliveryCoords.latitude - pickupCoords.latitude) * Math.PI / 180;
  const deltaLng = (deliveryCoords.longitude - pickupCoords.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 1.3 * 10) / 10;
}

function calculateEstimatedTime(distance: number, vehicleType: string): number {
  const avgSpeeds: Record<string, number> = {
    tricycle: 25,
    van: 45,
    truck_3_5t: 40,
    truck_10t: 35,
    semi: 30,
  };
  
  const speed = avgSpeeds[vehicleType] || 40;
  const hours = distance / speed;
  return Math.round(hours * 60);
}

function calculatePrice(distance: number, weight: number, vehicleType: string, deliveryOption: string): number {
  const baseRates: Record<string, number> = {
    tricycle: 5,
    van: 8,
    truck_3_5t: 12,
    truck_10t: 18,
    semi: 25,
  };

  const optionMultipliers: Record<string, number> = {
    standard: 1,
    urgent: 1.5,
    express: 2,
  };

  const baseRate = baseRates[vehicleType] || 10;
  const multiplier = optionMultipliers[deliveryOption] || 1;
  const weightFactor = Math.max(1, weight / 100);

  return Math.round(distance * baseRate * multiplier * weightFactor);
}

function parseGoodsPhotos(photos: any): string[] | undefined {
  let photoArray: string[] = [];
  if (!photos) return undefined;
  if (Array.isArray(photos)) {
    photoArray = photos;
  } else if (typeof photos === "string") {
    try {
      const parsed = JSON.parse(photos);
      photoArray = Array.isArray(parsed) ? parsed : [];
    } catch {
      return undefined;
    }
  }
  // Filter out local file:// URLs that won't work remotely
  const validPhotos = photoArray.filter((url) => url && url.startsWith("http"));
  return validPhotos.length > 0 ? validPhotos : undefined;
}

function mapOrderToRequest(order: any): TransportRequest {
  return {
    id: order.id,
    orderNumber: order.orderNumber ?? undefined,
    clientId: order.clientId,
    clientName: order.clientName,
    clientPhone: order.clientPhone,
    clientRating: order.clientRating || 0,
    driverId: order.driverId,
    driverName: order.driverName,
    driverPhone: order.driverPhone,
    driverRating: order.driverRating,
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    pickupCoords: order.pickupLat && order.pickupLng ? { latitude: order.pickupLat, longitude: order.pickupLng } : undefined,
    deliveryCoords: order.deliveryLat && order.deliveryLng ? { latitude: order.deliveryLat, longitude: order.deliveryLng } : undefined,
    vehicleType: order.vehicleType,
    goodsDescription: order.goodsDescription,
    goodsPhotos: parseGoodsPhotos(order.goodsPhotos),
    estimatedWeight: order.estimatedWeight || 0,
    deliveryOption: order.deliveryOption || "standard",
    estimatedPrice: order.estimatedPrice || 0,
    proposedPrice: order.proposedPrice || 0,
    finalPrice: order.finalPrice,
    distance: order.distance || 0,
    estimatedTime: order.estimatedTime || 0,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    completedAt: order.completedAt,
    clientRated: order.clientRated,
    driverRated: order.driverRated,
    clientGivenRating: order.clientGivenRating,
    driverGivenRating: order.driverGivenRating,
    clientReview: order.clientReview,
    driverReview: order.driverReview,
    scheduledFor: order.scheduledFor,
  };
}

export function RequestsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notification, setNotification] = useState<OrderNotification | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOrderIdRef = useRef<string | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);
  const userRoleRef = useRef<string | null>(null);
  const requestsRef = useRef<TransportRequest[]>([]);

  const clearNotification = useCallback(() => {
    setNotification(null);
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
  }, []);

  const playNotificationSound = useCallback(async () => {
    try {
      if (Platform.OS === "web") return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log("Haptic feedback error:", error);
    }
  }, []);

  const showNotification = useCallback((notif: OrderNotification, withSound = false) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (withSound) {
      playNotificationSound();
    }
    setNotification(notif);
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 5000);
  }, [playNotificationSound]);

  const getBaseUrl = () => {
    try {
      return getApiUrl();
    } catch {
      return "";
    }
  };

  const deduplicateRequests = (reqs: TransportRequest[]): TransportRequest[] => {
    const seen = new Map<string, TransportRequest>();
    for (const req of reqs) {
      if (!seen.has(req.id)) {
        seen.set(req.id, req);
      }
    }
    return Array.from(seen.values());
  };

  const fetchOrders = useCallback(async () => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;
    
    try {
      const response = await fetch(`${baseUrl}api/orders`);
      const data = await response.json();
      if (data.success && data.orders) {
        const mappedOrders = data.orders.map(mapOrderToRequest);
        setRequests(deduplicateRequests(mappedOrders));
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;

    try {
      // Remove trailing slash if present, then add ws path
      const cleanUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      // On Replit (HTTPS), WebSocket goes through the /api proxy path → use /api/ws
      // For local dev (HTTP), connect directly to the server → use /ws
      const wsPath = cleanUrl.startsWith("https://") ? "/api/ws" : "/ws";
      const wsUrl = cleanUrl.replace("https://", "wss://").replace("http://", "ws://") + wsPath;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "SUBSCRIBE_ORDERS" }));
        
        if (userIdRef.current && userRoleRef.current) {
          ws.send(JSON.stringify({ 
            type: "REGISTER_USER", 
            userId: userIdRef.current, 
            role: userRoleRef.current 
          }));
        }
        
        // Fetch latest orders on reconnection to catch any missed updates
        fetchOrders();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket message:", message.type);

          switch (message.type) {
            case "NEW_ORDER":
              if (message.order) {
                if (pendingOrderIdRef.current === message.order.id) {
                  pendingOrderIdRef.current = null;
                  break;
                }
                setRequests(prev => deduplicateRequests([mapOrderToRequest(message.order), ...prev]));
              }
              break;
            case "NEW_ORDER_NOTIFICATION":
              if (message.order) {
                showNotification({
                  type: "new_order",
                  orderId: message.order.id,
                  message: `Nouvelle demande de transport disponible!`,
                }, true);
              }
              break;
            case "ORDER_UPDATED":
            case "ORDER_STATUS_CHANGED":
            case "ORDER_RATED":
            case "DRIVER_REJECTED":
              if (message.order) {
                setRequests(prev => prev.map(r => 
                  r.id === message.order.id ? mapOrderToRequest(message.order) : r
                ));
              }
              break;
            case "DRIVER_OFFERED":
              if (message.order) {
                setRequests(prev => prev.map(r => 
                  r.id === message.order.id ? mapOrderToRequest(message.order) : r
                ));
              }
              break;
            case "DRIVER_OFFERED_NOTIFICATION":
              if (message.order) {
                showNotification({
                  type: "driver_offered",
                  orderId: message.order.id,
                  message: `${message.order.driverName || "Un chauffeur"} a accepté votre demande!`,
                  driverName: message.order.driverName,
                }, true);
              }
              break;
            case "ORDER_ACCEPTED":
            case "ORDER_WAITING_PAYMENT":
              if (message.order) {
                setRequests(prev => prev.map(r => 
                  r.id === message.order.id ? mapOrderToRequest(message.order) : r
                ));
              }
              break;
            case "ORDER_ACCEPTED_NOTIFICATION":
              if (message.order) {
                showNotification({
                  type: "driver_approved",
                  orderId: message.order.id,
                  message: `Le client a approuvé votre candidature!`,
                }, true);
              }
              break;
            case "DRIVER_REJECTED_NOTIFICATION":
              showNotification({
                type: "driver_rejected",
                orderId: message.orderId,
                message: message.message || "Le client a choisi un autre chauffeur",
              }, true);
              break;
            case "STATUS_NOTIFICATION":
              if (message.order && message.notificationType) {
                let statusMessage = "";
                
                switch (message.notificationType) {
                  case "DRIVER_EN_ROUTE":
                    statusMessage = "Chauffeur en route!";
                    break;
                  case "GOODS_PICKED_UP":
                    statusMessage = "Marchandise récupérée!";
                    break;
                  case "DELIVERY_COMPLETE":
                    statusMessage = "Livraison terminée!";
                    break;
                }
                
                if (statusMessage) {
                  showNotification({
                    type: "status_changed",
                    orderId: message.order.id,
                    message: statusMessage,
                  }, true);
                }
              }
              break;
            case "NEW_CHAT_MESSAGE":
              // Show in-app notification for new chat messages (if not from current user and user is involved in order)
              if (message.message && message.message.senderId !== userIdRef.current) {
                // Verify the current user is part of this order before showing notification
                const relevantOrder = requestsRef.current.find(r => r.id === message.message.requestId);
                const isUserInvolved = relevantOrder && (
                  relevantOrder.clientId === userIdRef.current || 
                  relevantOrder.driverId === userIdRef.current
                );
                
                if (isUserInvolved) {
                  showNotification({
                    type: "new_message",
                    orderId: message.message.requestId,
                    message: message.message.text?.substring(0, 100) + (message.message.text?.length > 100 ? "..." : ""),
                    senderName: message.message.senderName,
                    senderAvatarUrl: message.message.senderAvatarUrl,
                  }, true);
                }
              }
              break;
            case "PAYMENT_ACCEPTED":
            case "PAYMENT_ACCEPTED_CLIENT":
              // Payment confirmed by admin — update the order in state
              if (message.order) {
                setRequests((prev) =>
                  prev.map((r) => r.id === message.order.id ? mapOrderToRequest(message.order) : r)
                );
              }
              if (message.order?.id && message.message) {
                showNotification({
                  type: "payment_accepted",
                  orderId: message.order.id,
                  message: message.message,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              break;
            case "PAYMENT_REJECTED_CLIENT":
              if (message.order) {
                setRequests((prev) =>
                  prev.map((r) => r.id === message.order.id ? mapOrderToRequest(message.order) : r)
                );
              }
              if (message.order?.id && message.message) {
                showNotification({
                  type: "payment_rejected",
                  orderId: message.order.id,
                  message: message.message,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              break;
            case "ORDER_PAID":
              if (message.order) {
                setRequests((prev) =>
                  prev.map((r) => r.id === message.order.id ? mapOrderToRequest(message.order) : r)
                );
              }
              break;
            case "WITHDRAWAL_SENT":
              if (message.message) {
                showNotification({
                  type: "driver_approved",
                  orderId: "",
                  message: message.message,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              break;
            case "WITHDRAWAL_CONFIRMED":
              if (message.message) {
                showNotification({
                  type: "payment_accepted",
                  orderId: "",
                  message: message.message,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              break;
            case "WITHDRAWAL_REJECTED":
              if (message.message) {
                showNotification({
                  type: "payment_rejected",
                  orderId: "",
                  message: message.message,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              break;
            case "WITHDRAWAL_CREATED":
              break;
            case "ORDER_COMPLETED":
              if (message.order) {
                setRequests((prev) =>
                  prev.map((r) => r.id === message.order.id ? { ...r, ...message.order } : r)
                );
              }
              break;
            case "INCOMING_CALL":
              // Someone is calling this user — navigate to VoiceCallScreen from anywhere in the app
              if (message.callerId && message.channelName && message.token) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                navigate("VoiceCall", {
                  channelName: message.channelName,
                  token: message.token,
                  callerName: message.callerName || "Unknown",
                  callerId: message.callerId,
                  requestId: message.requestId || "",
                  isIncoming: true,
                });
              }
              break;
            case "USER_REGISTERED":
              console.log("User registered:", message.userId, message.role);
              break;
            case "SUBSCRIBED":
              console.log("Subscribed to orders channel");
              break;
          }
        } catch (err) {
          console.error("WebSocket message parse error:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        wsRef.current = null;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      ws.onerror = () => {
        // Suppress error logging for expected connection issues (web platform, network changes)
        ws.close();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("WebSocket connection error:", err);
      setIsConnected(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (user) {
      userIdRef.current = user.id;
      userRoleRef.current = user.role;
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: "REGISTER_USER", 
          userId: user.id, 
          role: user.role 
        }));
      }
    } else {
      userIdRef.current = null;
      userRoleRef.current = null;
    }
  }, [user]);

  // Keep requestsRef in sync with requests state for use in WebSocket callbacks
  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    fetchOrders();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);
  
  // Separate polling effect that depends on isConnected
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        fetchOrders();
      }
    }, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isConnected, fetchOrders]);

  const createRequest = async (data: CreateRequestData): Promise<TransportRequest> => {
    const baseUrl = getBaseUrl();
    const distance = calculateDistance(data.pickupCoords, data.deliveryCoords);
    const estimatedTime = calculateEstimatedTime(distance, data.vehicleType);
    const estimatedPrice = calculatePrice(
      distance,
      data.estimatedWeight,
      data.vehicleType,
      data.deliveryOption
    );

    const orderData = {
      clientId: data.clientId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientRating: data.clientRating,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      pickupLat: data.pickupCoords?.latitude,
      pickupLng: data.pickupCoords?.longitude,
      deliveryLat: data.deliveryCoords?.latitude,
      deliveryLng: data.deliveryCoords?.longitude,
      vehicleType: data.vehicleType,
      goodsDescription: data.goodsDescription,
      goodsPhotos: data.goodsPhotos,
      estimatedWeight: data.estimatedWeight,
      deliveryOption: data.deliveryOption,
      estimatedPrice,
      proposedPrice: data.proposedPrice,
      distance,
      estimatedTime,
      status: "pending",
      scheduledFor: data.scheduledFor?.toISOString(),
      preferredDriverId: data.preferredDriverId,
    };

    const response = await fetch(`${baseUrl}api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to create order");
    }

    const newRequest = mapOrderToRequest(result.order);
    // Mark this order ID so WebSocket handler skips it
    pendingOrderIdRef.current = newRequest.id;
    // Add locally and deduplicate to prevent race conditions
    setRequests(prev => deduplicateRequests([newRequest, ...prev]));
    return newRequest;
  };

  const updateRequest = async (id: string, updates: Partial<TransportRequest>) => {
    const baseUrl = getBaseUrl();
    const updateData: any = { ...updates };
    
    if (updates.pickupCoords) {
      updateData.pickupLat = updates.pickupCoords.latitude;
      updateData.pickupLng = updates.pickupCoords.longitude;
      delete updateData.pickupCoords;
    }
    if (updates.deliveryCoords) {
      updateData.deliveryLat = updates.deliveryCoords.latitude;
      updateData.deliveryLng = updates.deliveryCoords.longitude;
      delete updateData.deliveryCoords;
    }

    const response = await fetch(`${baseUrl}api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to update order");
    }

    setRequests(prev => prev.map(r => 
      r.id === id ? mapOrderToRequest(result.order) : r
    ));
  };

  const acceptRequest = async (
    id: string,
    driverId: string,
    driverName: string,
    driverPhone: string,
    driverRating: number,
    finalPrice?: number
  ) => {
    const baseUrl = getBaseUrl();
    const request = requests.find((r) => r.id === id);
    if (!request) return;

    const response = await fetch(`${baseUrl}api/orders/${id}/accept`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId,
        driverName,
        driverPhone,
        driverRating,
        finalPrice: finalPrice || request.proposedPrice,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to accept order");
    }

    setRequests(prev => prev.map(r => 
      r.id === id ? mapOrderToRequest(result.order) : r
    ));
  };

  const updateOrderStatus = async (id: string, status: RequestStatus) => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}api/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to update order status");
    }

    setRequests(prev => prev.map(r => 
      r.id === id ? mapOrderToRequest(result.order) : r
    ));
  };

  const submitRating = async (orderId: string, isClientRating: boolean, rating: number, review?: string) => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}api/orders/${orderId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isClientRating, rating, review }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to submit rating");
    }

    setRequests(prev => prev.map(r => 
      r.id === orderId ? mapOrderToRequest(result.order) : r
    ));
  };

  const getClientRequests = (clientId: string) => {
    return requests.filter((r) => r.clientId === clientId);
  };

  const getDriverRequests = (driverId: string) => {
    return requests.filter((r) => r.driverId === driverId);
  };

  const getAvailableRequests = (driverId?: string, isVerified?: boolean) => {
    if (driverId && isVerified === false) {
      return [];
    }
    // Show pending orders AND awaiting_client_approval orders (multiple drivers can offer)
    // Filter out orders where this driver already made an offer (driverId matches)
    return requests.filter((r) => 
      (r.status === "pending" || r.status === "awaiting_client_approval") &&
      r.driverId !== driverId
    );
  };

  const refreshRequests = async () => {
    setIsLoading(true);
    await fetchOrders();
  };

  return (
    <RequestsContext.Provider
      value={{
        requests,
        isLoading,
        error,
        notification,
        clearNotification,
        createRequest,
        updateRequest,
        acceptRequest,
        updateOrderStatus,
        submitRating,
        getClientRequests,
        getDriverRequests,
        getAvailableRequests,
        refreshRequests,
        isConnected,
      }}
    >
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestsContext);
  if (!context) {
    throw new Error("useRequests must be used within a RequestsProvider");
  }
  return context;
}
