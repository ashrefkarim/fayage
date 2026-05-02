import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, asc, and, or, sql, ne, inArray, gte } from "drizzle-orm";
import { users, clients, drivers, orders, driverLocations, messages, driverOffers, emailVerifications, appSettings, pushTokens, favoriteDrivers, referrals, announcements, payments, driverWallets, withdrawalRequests, admins, type InsertOrder, type Order, type Driver, type DriverLocation, type Message, type InsertMessage, type DriverOffer, type InsertDriverOffer, type EmailVerification, type Client, type InsertClient, type AppSetting, type PushToken, type FavoriteDriver, type Referral, type InsertReferral, type Announcement, type InsertAnnouncement, type Payment, type InsertPayment, type DriverWallet, type WithdrawalRequest, type InsertWithdrawalRequest, type Admin } from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export async function getOrders(filters?: { status?: string; clientId?: string; driverId?: string }): Promise<Order[]> {
  let query = db.select().from(orders);
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status));
  }
  if (filters?.clientId) {
    conditions.push(eq(orders.clientId, filters.clientId));
  }
  if (filters?.driverId) {
    conditions.push(eq(orders.driverId, filters.driverId));
  }

  if (conditions.length > 0) {
    return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  }
  
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const result = await db.select().from(orders).where(eq(orders.id, id));
  return result[0];
}

export async function createOrder(data: InsertOrder): Promise<Order> {
  // Generate the next sequential order number
  const maxResult = await db.select({ max: sql<number>`COALESCE(MAX(order_number), 0)` }).from(orders);
  const nextNumber = (maxResult[0]?.max || 0) + 1;

  const orderData: any = {
    ...data,
    orderNumber: nextNumber,
    status: data.status || "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Serialize goodsPhotos array to JSON string
  if (orderData.goodsPhotos && Array.isArray(orderData.goodsPhotos)) {
    orderData.goodsPhotos = JSON.stringify(orderData.goodsPhotos);
  }
  
  const result = await db.insert(orders).values(orderData).returning();
  return result[0];
}

export async function updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
  const result = await db.update(orders)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();
  return result[0];
}

export async function deleteOrder(id: string): Promise<boolean> {
  const result = await db.delete(orders).where(eq(orders.id, id));
  return true;
}

export async function getAvailableOrdersForDriver(driverLat?: number, driverLng?: number, driverId?: string): Promise<Order[]> {
  // Get orders that are pending OR awaiting_client_approval (multiple drivers can offer)
  const availableOrders = await db.select().from(orders)
    .where(inArray(orders.status, ["pending", "awaiting_client_approval"]))
    .orderBy(desc(orders.createdAt));
  
  // If driverId is provided, filter out orders where this driver already made an offer
  if (driverId) {
    const existingOffers = await db.select().from(driverOffers)
      .where(and(
        eq(driverOffers.driverId, driverId),
        eq(driverOffers.status, "pending")
      ));
    const offeredOrderIds = new Set(existingOffers.map(o => o.orderId));
    return availableOrders.filter(order => !offeredOrderIds.has(order.id));
  }
  
  return availableOrders;
}

export async function getDriverById(id: string): Promise<Driver | undefined> {
  const result = await db.select().from(drivers).where(eq(drivers.id, id));
  return result[0];
}

export async function getDrivers(status?: string): Promise<Driver[]> {
  if (status) {
    return db.select().from(drivers).where(eq(drivers.verificationStatus, status));
  }
  return db.select().from(drivers);
}

export async function upsertDriver(data: Partial<Driver> & { id: string }): Promise<Driver> {
  const existing = await getDriverById(data.id);
  if (existing) {
    const result = await db.update(drivers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(drivers.id, data.id))
      .returning();
    return result[0];
  }
  
  const result = await db.insert(drivers).values({
    id: data.id,
    fullName: data.fullName || "",
    phone: data.phone || "",
    email: data.email,
    password: data.password,
    nationalId: data.nationalId,
    vehicleType: data.vehicleType,
    verificationStatus: data.verificationStatus || "pending_verification",
    documents: data.documents ? JSON.stringify(data.documents) : undefined,
    avatarUrl: data.avatarUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return result[0];
}

export async function updateDriverVerification(id: string, status: string, notes?: string): Promise<Driver | undefined> {
  const result = await db.update(drivers)
    .set({ 
      verificationStatus: status, 
      verificationNotes: notes,
      updatedAt: new Date() 
    })
    .where(eq(drivers.id, id))
    .returning();
  return result[0];
}

export async function getDriverStats(driverId: string): Promise<{ rating: number; totalRatings: number; totalDeliveries: number }> {
  const driver = await getDriverById(driverId);
  const deliveredOrders = await db.select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.driverId, driverId), eq(orders.status, "delivered")));
  
  return {
    rating: driver?.rating || 0,
    totalRatings: driver?.totalRatings || 0,
    totalDeliveries: Number(deliveredOrders[0]?.count) || 0,
  };
}

export async function updateDriverRating(driverId: string, newRating: number): Promise<Driver | undefined> {
  const driver = await getDriverById(driverId);
  if (!driver) return undefined;

  const currentRating = driver.rating || 0;
  const totalRatings = driver.totalRatings || 0;
  
  const newTotalRatings = totalRatings + 1;
  const newAverageRating = ((currentRating * totalRatings) + newRating) / newTotalRatings;
  
  const result = await db.update(drivers)
    .set({ 
      rating: Math.round(newAverageRating * 10) / 10,
      totalRatings: newTotalRatings,
      updatedAt: new Date() 
    })
    .where(eq(drivers.id, driverId))
    .returning();
  return result[0];
}

export async function submitRating(orderId: string, data: {
  isClientRating: boolean;
  rating: number;
  review?: string;
}): Promise<Order | undefined> {
  const order = await getOrderById(orderId);
  if (!order) return undefined;

  if (data.isClientRating) {
    const result = await db.update(orders)
      .set({
        clientRated: true,
        clientGivenRating: data.rating,
        clientReview: data.review,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    if (order.driverId) {
      await updateDriverRating(order.driverId, data.rating);
    }
    
    return result[0];
  } else {
    const result = await db.update(orders)
      .set({
        driverRated: true,
        driverGivenRating: data.rating,
        driverReview: data.review,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return result[0];
  }
}

export async function updateDriverLocation(data: {
  driverId: string;
  name?: string;
  vehicleType?: string;
  latitude: number;
  longitude: number;
  isAvailable?: boolean;
  rating?: number;
}): Promise<DriverLocation> {
  const existing = await db.select().from(driverLocations).where(eq(driverLocations.driverId, data.driverId));
  
  if (existing.length > 0) {
    const result = await db.update(driverLocations)
      .set({
        name: data.name,
        vehicleType: data.vehicleType,
        latitude: data.latitude,
        longitude: data.longitude,
        isAvailable: data.isAvailable ?? true,
        rating: data.rating,
        updatedAt: new Date(),
      })
      .where(eq(driverLocations.driverId, data.driverId))
      .returning();
    return result[0];
  }

  const result = await db.insert(driverLocations).values({
    driverId: data.driverId,
    name: data.name,
    vehicleType: data.vehicleType,
    latitude: data.latitude,
    longitude: data.longitude,
    isAvailable: data.isAvailable ?? true,
    rating: data.rating,
    updatedAt: new Date(),
  }).returning();
  return result[0];
}

export async function getDriverLocation(driverId: string): Promise<DriverLocation | undefined> {
  const result = await db.select().from(driverLocations).where(eq(driverLocations.driverId, driverId));
  return result[0];
}

export async function getNearbyDrivers(lat?: number, lng?: number, radiusKm: number = 10): Promise<DriverLocation[]> {
  const allDrivers = await db.select().from(driverLocations).where(eq(driverLocations.isAvailable, true));
  
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const onlineDrivers = allDrivers.filter(driver => {
    const updatedAt = driver.updatedAt ? new Date(driver.updatedAt) : null;
    return updatedAt && updatedAt > twoMinutesAgo;
  });
  
  if (!lat || !lng) {
    return onlineDrivers;
  }
  
  return onlineDrivers.filter(driver => {
    const distance = calculateDistance(lat, lng, driver.latitude, driver.longitude);
    return distance <= radiusKm;
  });
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getDriverVerificationStatus(id: string): Promise<{ status: string; isVerified: boolean; notes?: string }> {
  const driver = await getDriverById(id);
  if (!driver) {
    return { status: "pending_verification", isVerified: false };
  }
  return {
    status: driver.verificationStatus,
    isVerified: driver.verificationStatus === "verified",
    notes: driver.verificationNotes || undefined,
  };
}

export async function getMessagesByRequestId(requestId: string, messageType?: string): Promise<Message[]> {
  const conditions: any[] = [eq(messages.requestId, requestId)];
  if (messageType) {
    conditions.push(eq(messages.messageType, messageType));
  }
  return db.select().from(messages)
    .where(and(...conditions))
    .orderBy(asc(messages.createdAt));
}

export async function getSupportConversations(): Promise<any[]> {
  const supportMsgs = await db.select().from(messages)
    .where(eq(messages.messageType, "support"))
    .orderBy(desc(messages.createdAt));

  const grouped: Record<string, any> = {};
  for (const msg of supportMsgs) {
    if (!grouped[msg.requestId]) {
      grouped[msg.requestId] = {
        requestId: msg.requestId,
        lastMessage: msg.text,
        lastMessageAt: msg.createdAt,
        lastSenderName: msg.senderName,
        lastSenderRole: msg.senderRole,
        unreadCount: 0,
        hasClient: false,
        hasDriver: false,
      };
    }
    if (!msg.isRead && msg.senderRole !== "admin") {
      grouped[msg.requestId].unreadCount++;
    }
    if (msg.senderRole === "client") grouped[msg.requestId].hasClient = true;
    if (msg.senderRole === "driver") grouped[msg.requestId].hasDriver = true;
  }

  // Enrich with order info
  const requestIds = Object.keys(grouped);
  if (requestIds.length > 0) {
    const orderRows = await db.select({
      id: orders.id,
      clientName: orders.clientName,
      clientPhone: orders.clientPhone,
      driverName: orders.driverName,
      driverPhone: orders.driverPhone,
      status: orders.status,
      goodsDescription: orders.goodsDescription,
      pickupAddress: orders.pickupAddress,
      deliveryAddress: orders.deliveryAddress,
      estimatedWeight: orders.estimatedWeight,
      vehicleType: orders.vehicleType,
    }).from(orders)
      .where(inArray(orders.id, requestIds));

    for (const order of orderRows) {
      if (grouped[order.id]) {
        grouped[order.id].clientName = order.clientName;
        grouped[order.id].clientPhone = order.clientPhone;
        grouped[order.id].driverName = order.driverName;
        grouped[order.id].driverPhone = order.driverPhone;
        grouped[order.id].orderStatus = order.status;
        grouped[order.id].goodsDescription = order.goodsDescription;
        grouped[order.id].pickupAddress = order.pickupAddress;
        grouped[order.id].deliveryAddress = order.deliveryAddress;
        grouped[order.id].estimatedWeight = order.estimatedWeight;
        grouped[order.id].vehicleType = order.vehicleType;
      }
    }
  }

  return Object.values(grouped).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

export async function createMessage(data: InsertMessage): Promise<Message> {
  const result = await db.insert(messages).values({
    ...data,
    createdAt: new Date(),
  }).returning();
  return result[0];
}

export async function getUnreadMessageCount(requestId: string, userId: string, messageType?: string): Promise<number> {
  const conditions: any[] = [
    eq(messages.requestId, requestId),
    eq(messages.isRead, false),
    ne(messages.senderId, userId),
  ];
  if (messageType) {
    conditions.push(eq(messages.messageType, messageType));
  }
  const result = await db.select().from(messages).where(and(...conditions));
  return result.length;
}

export async function markMessagesAsRead(requestId: string, userId: string): Promise<void> {
  await db.update(messages)
    .set({ isRead: true })
    .where(and(
      eq(messages.requestId, requestId),
      ne(messages.senderId, userId)
    ));
}

export interface ConversationSummary {
  requestId: string;
  orderId: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyPhone: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  orderStatus: string;
  pickupAddress: string;
  deliveryAddress: string;
}

export async function getUserConversations(userId: string, userType: "client" | "driver"): Promise<ConversationSummary[]> {
  const userOrders = await db.select().from(orders).where(
    userType === "client" 
      ? eq(orders.clientId, userId)
      : eq(orders.driverId, userId)
  ).orderBy(desc(orders.updatedAt));

  const conversations: ConversationSummary[] = [];

  for (const order of userOrders) {
    if (!order.driverId || !order.clientId) continue;

    const orderMessages = await db.select().from(messages)
      .where(eq(messages.requestId, order.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    const lastMsg = orderMessages[0];
    
    const unreadMessages = await db.select().from(messages)
      .where(and(
        eq(messages.requestId, order.id),
        eq(messages.isRead, false),
        ne(messages.senderId, userId)
      ));

    const otherPartyId = userType === "client" ? order.driverId : order.clientId;
    const otherPartyName = userType === "client" ? (order.driverName || "Driver") : order.clientName;
    const otherPartyPhone = userType === "client" ? order.driverPhone : order.clientPhone;

    if (lastMsg || orderMessages.length === 0) {
      conversations.push({
        requestId: order.id,
        orderId: order.id,
        otherPartyId,
        otherPartyName,
        otherPartyPhone: otherPartyPhone || null,
        lastMessage: lastMsg?.text || null,
        lastMessageAt: lastMsg?.createdAt || order.createdAt,
        unreadCount: unreadMessages.length,
        orderStatus: order.status,
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
      });
    }
  }

  return conversations.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

export async function getDriverReviews(driverId: string): Promise<{ rating: number; review: string; clientName: string; createdAt: Date }[]> {
  const result = await db.select({
    rating: orders.clientGivenRating,
    review: orders.clientReview,
    clientName: orders.clientName,
    createdAt: orders.createdAt,
  }).from(orders)
    .where(and(
      eq(orders.driverId, driverId),
      eq(orders.clientRated, true)
    ))
    .orderBy(desc(orders.createdAt));
  
  return result
    .filter(r => r.rating !== null)
    .map(r => ({
      rating: r.rating as number,
      review: r.review || "",
      clientName: r.clientName,
      createdAt: r.createdAt as Date,
    }));
}

export async function createDriverOffer(data: InsertDriverOffer): Promise<DriverOffer> {
  const result = await db.insert(driverOffers).values({
    ...data,
    status: "pending",
    createdAt: new Date(),
  }).returning();
  return result[0];
}

export async function getDriverOffersForOrder(orderId: string): Promise<DriverOffer[]> {
  return db.select().from(driverOffers)
    .where(and(
      eq(driverOffers.orderId, orderId),
      eq(driverOffers.status, "pending")
    ))
    .orderBy(desc(driverOffers.createdAt));
}

export async function getDriverOfferById(id: string): Promise<DriverOffer | undefined> {
  const result = await db.select().from(driverOffers).where(eq(driverOffers.id, id));
  return result[0];
}

export async function hasDriverOfferedOnOrder(orderId: string, driverId: string): Promise<boolean> {
  const result = await db.select().from(driverOffers)
    .where(and(
      eq(driverOffers.orderId, orderId),
      eq(driverOffers.driverId, driverId)
    ));
  return result.length > 0;
}

export async function updateDriverOfferStatus(id: string, status: string): Promise<DriverOffer | undefined> {
  const result = await db.update(driverOffers)
    .set({ status })
    .where(eq(driverOffers.id, id))
    .returning();
  return result[0];
}

export async function rejectAllOffersForOrder(orderId: string, exceptDriverId?: string): Promise<void> {
  if (exceptDriverId) {
    await db.update(driverOffers)
      .set({ status: "rejected" })
      .where(and(
        eq(driverOffers.orderId, orderId),
        ne(driverOffers.driverId, exceptDriverId)
      ));
  } else {
    await db.update(driverOffers)
      .set({ status: "rejected" })
      .where(eq(driverOffers.orderId, orderId));
  }
}

export async function getDriverOffersByDriverId(driverId: string): Promise<DriverOffer[]> {
  return db.select().from(driverOffers)
    .where(eq(driverOffers.driverId, driverId))
    .orderBy(desc(driverOffers.createdAt));
}

export async function getRejectedDriversForOrder(orderId: string, exceptDriverId?: string): Promise<DriverOffer[]> {
  if (exceptDriverId) {
    return db.select().from(driverOffers)
      .where(and(
        eq(driverOffers.orderId, orderId),
        eq(driverOffers.status, "rejected"),
        ne(driverOffers.driverId, exceptDriverId)
      ));
  }
  return db.select().from(driverOffers)
    .where(and(
      eq(driverOffers.orderId, orderId),
      eq(driverOffers.status, "rejected")
    ));
}

export async function createEmailVerification(email: string, code: string, expiresAt: Date): Promise<EmailVerification> {
  await db.delete(emailVerifications).where(eq(emailVerifications.email, email));
  
  const result = await db.insert(emailVerifications).values({
    email,
    code,
    expiresAt,
    verified: false,
    createdAt: new Date(),
  }).returning();
  return result[0];
}

export async function verifyEmailCode(email: string, code: string): Promise<EmailVerification | null> {
  const result = await db.select().from(emailVerifications)
    .where(and(
      eq(emailVerifications.email, email),
      eq(emailVerifications.code, code),
      eq(emailVerifications.verified, false),
      gte(emailVerifications.expiresAt, new Date())
    ));
  
  if (result.length === 0) {
    return null;
  }

  await db.update(emailVerifications)
    .set({ verified: true })
    .where(eq(emailVerifications.id, result[0].id));

  return result[0];
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const result = await db.select().from(emailVerifications)
    .where(and(
      eq(emailVerifications.email, email),
      eq(emailVerifications.verified, true)
    ));
  return result.length > 0;
}

// Client functions
export async function getClientById(id: string): Promise<Client | undefined> {
  const result = await db.select().from(clients).where(eq(clients.id, id));
  return result[0];
}

export async function getClientByPhone(phone: string): Promise<Client | undefined> {
  const result = await db.select().from(clients).where(eq(clients.phone, phone));
  return result[0];
}

export async function getClientsByPhone(phone: string): Promise<Client[]> {
  return db.select().from(clients).where(eq(clients.phone, phone));
}

export async function getDriverByPhone(phone: string): Promise<Driver | undefined> {
  const result = await db.select().from(drivers).where(eq(drivers.phone, phone));
  return result[0];
}

export async function getDriversByPhone(phone: string): Promise<Driver[]> {
  return db.select().from(drivers).where(eq(drivers.phone, phone));
}

export async function getAllClients(): Promise<Client[]> {
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function upsertClient(data: Partial<Client> & { id: string }): Promise<Client> {
  const existing = await getClientById(data.id);
  if (existing) {
    const result = await db.update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clients.id, data.id))
      .returning();
    return result[0];
  }
  
  const result = await db.insert(clients).values({
    id: data.id,
    fullName: data.fullName || "Client",
    phone: data.phone || "",
    email: data.email,
    password: data.password,
    avatarUrl: data.avatarUrl,
    rating: data.rating || 0,
    totalRatings: data.totalRatings || 0,
    isBanned: data.isBanned || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return result[0];
}

export async function banClient(id: string, reason: string): Promise<Client | undefined> {
  const result = await db.update(clients)
    .set({ 
      isBanned: true, 
      banReason: reason,
      bannedAt: new Date(),
      updatedAt: new Date() 
    })
    .where(eq(clients.id, id))
    .returning();
  return result[0];
}

export async function unbanClient(id: string): Promise<Client | undefined> {
  const result = await db.update(clients)
    .set({ 
      isBanned: false, 
      banReason: null,
      bannedAt: null,
      updatedAt: new Date() 
    })
    .where(eq(clients.id, id))
    .returning();
  return result[0];
}

export async function banDriver(id: string, reason: string): Promise<Driver | undefined> {
  const result = await db.update(drivers)
    .set({ 
      isBanned: true, 
      banReason: reason,
      bannedAt: new Date(),
      updatedAt: new Date() 
    })
    .where(eq(drivers.id, id))
    .returning();
  return result[0];
}

export async function unbanDriver(id: string): Promise<Driver | undefined> {
  const result = await db.update(drivers)
    .set({ 
      isBanned: false, 
      banReason: null,
      bannedAt: null,
      updatedAt: new Date() 
    })
    .where(eq(drivers.id, id))
    .returning();
  return result[0];
}

export async function getOrdersByClientId(clientId: string): Promise<Order[]> {
  return db.select().from(orders)
    .where(eq(orders.clientId, clientId))
    .orderBy(desc(orders.createdAt));
}

export async function getOrdersByDriverId(driverId: string): Promise<Order[]> {
  return db.select().from(orders)
    .where(eq(orders.driverId, driverId))
    .orderBy(desc(orders.createdAt));
}

export async function getAdminStats() {
  const allOrders = await db.select().from(orders);
  const allDrivers = await db.select().from(drivers);
  const allClients = await db.select().from(clients);
  const allPayments = await db.select().from(payments);
  
  const pendingDrivers = allDrivers.filter(d => d.verificationStatus === "pending_verification");
  const verifiedDrivers = allDrivers.filter(d => d.verificationStatus === "verified");
  const bannedDrivers = allDrivers.filter(d => d.isBanned);
  const bannedClients = allClients.filter(c => c.isBanned);
  
  const completedOrders = allOrders.filter(o => o.status === "delivered");
  const pendingOrders = allOrders.filter(o => o.status === "pending" || o.status === "awaiting_client_approval");
  const activeOrders = allOrders.filter(o => ["accepted", "pickup", "in_transit"].includes(o.status));
  const cancelledOrders = allOrders.filter(o => o.status === "cancelled");
  
  const completedOrderIds = new Set(completedOrders.map(o => o.id));
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.finalPrice || o.proposedPrice || 0), 0);
  const totalCommission = allPayments
    .filter(p => completedOrderIds.has(p.orderId))
    .reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
  
  // Top 5 clients by order count
  const clientOrderCounts: Record<string, { id: string; name: string; count: number; revenue: number }> = {};
  allOrders.forEach(o => {
    if (!clientOrderCounts[o.clientId]) {
      clientOrderCounts[o.clientId] = { id: o.clientId, name: o.clientName, count: 0, revenue: 0 };
    }
    clientOrderCounts[o.clientId].count++;
    if (o.status === "delivered") {
      clientOrderCounts[o.clientId].revenue += o.finalPrice || o.proposedPrice || 0;
    }
  });
  const topClients = Object.values(clientOrderCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Top 5 drivers by completed deliveries
  const driverDeliveryCounts: Record<string, { id: string; name: string; count: number; revenue: number; rating: number }> = {};
  completedOrders.forEach(o => {
    if (o.driverId && o.driverName) {
      if (!driverDeliveryCounts[o.driverId]) {
        const driver = allDrivers.find(d => d.id === o.driverId);
        driverDeliveryCounts[o.driverId] = { 
          id: o.driverId, 
          name: o.driverName, 
          count: 0, 
          revenue: 0,
          rating: driver?.rating || 0
        };
      }
      driverDeliveryCounts[o.driverId].count++;
      driverDeliveryCounts[o.driverId].revenue += o.finalPrice || o.proposedPrice || 0;
    }
  });
  const topDrivers = Object.values(driverDeliveryCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Orders by month for the last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyStats: { month: string; orders: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthOrders = allOrders.filter(o => {
      const createdAt = new Date(o.createdAt!);
      return createdAt >= monthStart && createdAt <= monthEnd;
    });
    const monthRevenue = monthOrders
      .filter(o => o.status === "delivered")
      .reduce((sum, o) => sum + (o.finalPrice || o.proposedPrice || 0), 0);
    monthlyStats.push({
      month: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      orders: monthOrders.length,
      revenue: monthRevenue
    });
  }
  
  return {
    totalDrivers: allDrivers.length,
    pendingDrivers: pendingDrivers.length,
    verifiedDrivers: verifiedDrivers.length,
    bannedDrivers: bannedDrivers.length,
    totalClients: allClients.length,
    bannedClients: bannedClients.length,
    totalOrders: allOrders.length,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    activeOrders: activeOrders.length,
    cancelledOrders: cancelledOrders.length,
    totalRevenue,
    totalCommission,
    topClients,
    topDrivers,
    monthlyStats,
    orderStatusDistribution: {
      pending: pendingOrders.length,
      active: activeOrders.length,
      completed: completedOrders.length,
      cancelled: cancelledOrders.length
    }
  };
}

// App Settings functions
export async function getAppSettings(): Promise<AppSetting[]> {
  return db.select().from(appSettings);
}

export async function getAppSetting(key: string): Promise<AppSetting | undefined> {
  const result = await db.select().from(appSettings).where(eq(appSettings.settingKey, key));
  return result[0];
}

export async function upsertAppSetting(key: string, value: string): Promise<AppSetting> {
  const existing = await getAppSetting(key);
  if (existing) {
    const result = await db.update(appSettings)
      .set({ settingValue: value, updatedAt: new Date() })
      .where(eq(appSettings.settingKey, key))
      .returning();
    return result[0];
  }
  const result = await db.insert(appSettings).values({
    settingKey: key,
    settingValue: value,
    updatedAt: new Date()
  }).returning();
  return result[0];
}

export async function saveAllAppSettings(settings: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await upsertAppSetting(key, value);
  }
}

// Password reset functions
export async function getClientByEmail(email: string): Promise<Client | undefined> {
  const result = await db.select().from(clients).where(eq(clients.email, email));
  return result[0];
}

export async function getDriverByEmail(email: string): Promise<Driver | undefined> {
  const result = await db.select().from(drivers).where(eq(drivers.email, email));
  return result[0];
}

export async function updateClientPassword(email: string, hashedPassword: string): Promise<Client | undefined> {
  const result = await db.update(clients)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(clients.email, email))
    .returning();
  return result[0];
}

export async function updateDriverPassword(email: string, hashedPassword: string): Promise<Driver | undefined> {
  const result = await db.update(drivers)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(drivers.email, email))
    .returning();
  return result[0];
}

// Push Token functions
export async function savePushToken(userId: string, userType: string, token: string, platform?: string): Promise<PushToken> {
  const existing = await db.select().from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.userType, userType)));
  
  if (existing.length > 0) {
    const result = await db.update(pushTokens)
      .set({ token, platform, updatedAt: new Date() })
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.userType, userType)))
      .returning();
    return result[0];
  }
  
  const result = await db.insert(pushTokens).values({
    userId,
    userType,
    token,
    platform,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return result[0];
}

export async function getPushToken(userId: string, userType: string): Promise<PushToken | undefined> {
  const result = await db.select().from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.userType, userType)));
  return result[0];
}

export async function getAllDriverPushTokens(): Promise<PushToken[]> {
  return db.select().from(pushTokens).where(eq(pushTokens.userType, "driver"));
}

export async function deletePushToken(userId: string, userType: string): Promise<boolean> {
  await db.delete(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.userType, userType)));
  return true;
}

// Favorite Drivers functions
export async function addFavoriteDriver(clientId: string, driverId: string): Promise<FavoriteDriver> {
  const existing = await db.select().from(favoriteDrivers)
    .where(and(eq(favoriteDrivers.clientId, clientId), eq(favoriteDrivers.driverId, driverId)));
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const result = await db.insert(favoriteDrivers).values({
    clientId,
    driverId,
    createdAt: new Date(),
  }).returning();
  return result[0];
}

export async function removeFavoriteDriver(clientId: string, driverId: string): Promise<boolean> {
  await db.delete(favoriteDrivers)
    .where(and(eq(favoriteDrivers.clientId, clientId), eq(favoriteDrivers.driverId, driverId)));
  return true;
}

export async function getFavoriteDrivers(clientId: string): Promise<(FavoriteDriver & { driver?: any })[]> {
  const favorites = await db.select().from(favoriteDrivers)
    .where(eq(favoriteDrivers.clientId, clientId))
    .orderBy(desc(favoriteDrivers.createdAt));
  
  const enrichedFavorites = await Promise.all(
    favorites.map(async (fav) => {
      const driver = await getDriverById(fav.driverId);
      if (!driver) return { ...fav, driver: undefined };
      
      const deliveredOrders = await db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(eq(orders.driverId, fav.driverId), eq(orders.status, "delivered")));
      
      const enrichedDriver = {
        ...driver,
        isVerified: driver.verificationStatus === "verified",
        totalDeliveries: Number(deliveredOrders[0]?.count) || 0,
      };
      return { ...fav, driver: enrichedDriver };
    })
  );
  
  return enrichedFavorites;
}

export async function isFavoriteDriver(clientId: string, driverId: string): Promise<boolean> {
  const result = await db.select().from(favoriteDrivers)
    .where(and(eq(favoriteDrivers.clientId, clientId), eq(favoriteDrivers.driverId, driverId)));
  return result.length > 0;
}

// Get scheduled orders
export async function getScheduledOrders(): Promise<Order[]> {
  const now = new Date();
  return db.select().from(orders)
    .where(and(
      eq(orders.status, "pending"),
      gte(orders.scheduledFor, now)
    ))
    .orderBy(orders.scheduledFor);
}

// Referral functions
function generateReferralCode(name: string, id: string): string {
  const cleanName = name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const shortId = id.substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${cleanName}${shortId}${random}`;
}

export async function generateUserReferralCode(userId: string, userType: "client" | "driver"): Promise<string> {
  let user: Client | Driver | undefined;
  let existingCode: string | null = null;
  
  if (userType === "client") {
    user = await getClientById(userId);
    existingCode = user?.referralCode || null;
  } else {
    user = await getDriverById(userId);
    existingCode = user?.referralCode || null;
  }
  
  if (existingCode) {
    return existingCode;
  }
  
  if (!user) {
    throw new Error("User not found");
  }
  
  const newCode = generateReferralCode(user.fullName, userId);
  
  if (userType === "client") {
    await db.update(clients)
      .set({ referralCode: newCode, updatedAt: new Date() })
      .where(eq(clients.id, userId));
  } else {
    await db.update(drivers)
      .set({ referralCode: newCode, updatedAt: new Date() })
      .where(eq(drivers.id, userId));
  }
  
  return newCode;
}

export async function getUserByReferralCode(code: string): Promise<{ user: Client | Driver; userType: "client" | "driver" } | null> {
  const client = await db.select().from(clients).where(eq(clients.referralCode, code));
  if (client.length > 0) {
    return { user: client[0], userType: "client" };
  }
  
  const driver = await db.select().from(drivers).where(eq(drivers.referralCode, code));
  if (driver.length > 0) {
    return { user: driver[0], userType: "driver" };
  }
  
  return null;
}

export async function applyReferralCode(
  referredId: string, 
  referredType: "client" | "driver", 
  referralCode: string
): Promise<Referral | null> {
  const referrer = await getUserByReferralCode(referralCode);
  if (!referrer) {
    return null;
  }
  
  // Can't refer yourself
  if (referrer.user.id === referredId && referrer.userType === referredType) {
    return null;
  }
  
  // Check if already referred
  const existingReferral = await db.select().from(referrals)
    .where(and(
      eq(referrals.referredId, referredId),
      eq(referrals.referredType, referredType)
    ));
  
  if (existingReferral.length > 0) {
    return null;
  }
  
  // Set reward amounts (can be configured via app settings)
  const referrerReward = 10; // MAD
  const referredReward = 5; // MAD
  
  // Create referral record
  const result = await db.insert(referrals).values({
    referrerId: referrer.user.id,
    referrerType: referrer.userType,
    referredId,
    referredType,
    referralCode,
    status: "pending",
    referrerReward,
    referredReward,
    createdAt: new Date(),
  }).returning();
  
  // Update referred user's referredBy field
  if (referredType === "client") {
    await db.update(clients)
      .set({ referredBy: referrer.user.id, updatedAt: new Date() })
      .where(eq(clients.id, referredId));
  } else {
    await db.update(drivers)
      .set({ referredBy: referrer.user.id, updatedAt: new Date() })
      .where(eq(drivers.id, referredId));
  }
  
  return result[0];
}

export async function completeReferral(referredId: string, referredType: "client" | "driver"): Promise<boolean> {
  // Find pending referral for this user
  const pendingReferral = await db.select().from(referrals)
    .where(and(
      eq(referrals.referredId, referredId),
      eq(referrals.referredType, referredType),
      eq(referrals.status, "pending")
    ));
  
  if (pendingReferral.length === 0) {
    return false;
  }
  
  const referral = pendingReferral[0];
  
  // Mark referral as completed
  await db.update(referrals)
    .set({ status: "completed", rewardedAt: new Date() })
    .where(eq(referrals.id, referral.id));
  
  // Add rewards to both users
  if (referral.referrerType === "client") {
    await db.update(clients)
      .set({ 
        referralRewardBalance: sql`COALESCE(referral_reward_balance, 0) + ${referral.referrerReward}`,
        updatedAt: new Date() 
      })
      .where(eq(clients.id, referral.referrerId));
  } else {
    await db.update(drivers)
      .set({ 
        referralRewardBalance: sql`COALESCE(referral_reward_balance, 0) + ${referral.referrerReward}`,
        updatedAt: new Date() 
      })
      .where(eq(drivers.id, referral.referrerId));
  }
  
  if (referral.referredType === "client") {
    await db.update(clients)
      .set({ 
        referralRewardBalance: sql`COALESCE(referral_reward_balance, 0) + ${referral.referredReward}`,
        updatedAt: new Date() 
      })
      .where(eq(clients.id, referral.referredId));
  } else {
    await db.update(drivers)
      .set({ 
        referralRewardBalance: sql`COALESCE(referral_reward_balance, 0) + ${referral.referredReward}`,
        updatedAt: new Date() 
      })
      .where(eq(drivers.id, referral.referredId));
  }
  
  return true;
}

export async function getUserReferrals(userId: string, userType: "client" | "driver"): Promise<Referral[]> {
  return db.select().from(referrals)
    .where(and(
      eq(referrals.referrerId, userId),
      eq(referrals.referrerType, userType)
    ))
    .orderBy(desc(referrals.createdAt));
}

export async function getReferralStats(userId: string, userType: "client" | "driver"): Promise<{
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  rewardBalance: number;
}> {
  const allReferrals = await getUserReferrals(userId, userType);
  
  const completedReferrals = allReferrals.filter(r => r.status === "completed");
  const pendingReferrals = allReferrals.filter(r => r.status === "pending");
  
  const totalEarnings = completedReferrals.reduce((sum, r) => sum + (r.referrerReward || 0), 0);
  
  let rewardBalance = 0;
  if (userType === "client") {
    const client = await getClientById(userId);
    rewardBalance = client?.referralRewardBalance || 0;
  } else {
    const driver = await getDriverById(userId);
    rewardBalance = driver?.referralRewardBalance || 0;
  }
  
  return {
    totalReferrals: allReferrals.length,
    completedReferrals: completedReferrals.length,
    pendingReferrals: pendingReferrals.length,
    totalEarnings,
    rewardBalance,
  };
}

// Announcement functions
export async function getAllAnnouncements(): Promise<Announcement[]> {
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function getActiveAnnouncements(targetAudience?: string): Promise<Announcement[]> {
  const now = new Date();
  const conditions = [eq(announcements.isActive, true)];
  
  // Filter by expiration
  const results = await db.select().from(announcements)
    .where(and(...conditions))
    .orderBy(desc(announcements.createdAt));
  
  return results.filter(announcement => {
    // Check if not expired
    if (announcement.expiresAt && new Date(announcement.expiresAt) < now) {
      return false;
    }
    // Check target audience
    if (targetAudience && announcement.targetAudience !== "all" && announcement.targetAudience !== targetAudience) {
      return false;
    }
    return true;
  });
}

export async function getAnnouncementById(id: string): Promise<Announcement | undefined> {
  const result = await db.select().from(announcements).where(eq(announcements.id, id));
  return result[0];
}

export async function createAnnouncement(data: InsertAnnouncement): Promise<Announcement> {
  const result = await db.insert(announcements).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return result[0];
}

export async function updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
  const result = await db.update(announcements)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();
  return result[0];
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const result = await db.delete(announcements).where(eq(announcements.id, id)).returning();
  return result.length > 0;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function createPayment(data: InsertPayment): Promise<Payment> {
  const result = await db.insert(payments).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return result[0];
}

export async function getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
  const result = await db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt));
  return result[0];
}

export async function getPayments(statusFilter?: string): Promise<Payment[]> {
  if (statusFilter) {
    return db.select().from(payments).where(eq(payments.status, statusFilter)).orderBy(desc(payments.createdAt));
  }
  return db.select().from(payments).orderBy(desc(payments.createdAt));
}

export async function updatePayment(id: string, data: Partial<InsertPayment>): Promise<Payment | undefined> {
  const result = await db.update(payments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(payments.id, id))
    .returning();
  return result[0];
}

// ─── Driver Wallets ───────────────────────────────────────────────────────────

export async function getDriverWallet(driverId: string): Promise<DriverWallet | undefined> {
  const result = await db.select().from(driverWallets).where(eq(driverWallets.driverId, driverId));
  return result[0];
}

export async function creditDriverWallet(driverId: string, earning: number, commission: number): Promise<DriverWallet> {
  const existing = await getDriverWallet(driverId);
  if (existing) {
    const result = await db.update(driverWallets)
      .set({
        balance: existing.balance + earning,
        totalEarnings: existing.totalEarnings + earning,
        totalCommission: existing.totalCommission + commission,
        updatedAt: new Date(),
      })
      .where(eq(driverWallets.driverId, driverId))
      .returning();
    return result[0];
  }
  const result = await db.insert(driverWallets).values({
    driverId,
    balance: earning,
    totalEarnings: earning,
    totalCommission: commission,
    updatedAt: new Date(),
  }).returning();
  return result[0];
}


// ─── Withdrawal Requests ──────────────────────────────────────────────────────

export async function createWithdrawalRequest(data: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
  const result = await db.insert(withdrawalRequests).values(data).returning();
  return result[0];
}

export async function getWithdrawalRequestsByDriver(driverId: string): Promise<WithdrawalRequest[]> {
  return db.select().from(withdrawalRequests)
    .where(eq(withdrawalRequests.driverId, driverId))
    .orderBy(desc(withdrawalRequests.createdAt));
}

export async function getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  return db.select().from(withdrawalRequests)
    .orderBy(desc(withdrawalRequests.createdAt));
}

export async function getWithdrawalRequestById(id: string): Promise<WithdrawalRequest | undefined> {
  const result = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id));
  return result[0];
}

export async function updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined> {
  const result = await db.update(withdrawalRequests).set(updates).where(eq(withdrawalRequests.id, id)).returning();
  return result[0];
}

export async function hasPendingWithdrawal(driverId: string): Promise<boolean> {
  const result = await db.select().from(withdrawalRequests)
    .where(and(eq(withdrawalRequests.driverId, driverId), eq(withdrawalRequests.status, "pending")));
  return result.length > 0;
}

export async function debitDriverWallet(driverId: string, amount: number): Promise<DriverWallet | undefined> {
  const wallet = await getDriverWallet(driverId);
  if (!wallet) return undefined;
  const newBalance = Math.max(0, wallet.balance - amount);
  const result = await db.update(driverWallets)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(driverWallets.driverId, driverId))
    .returning();
  return result[0];
}

// ─── Admin Account CRUD ───────────────────────────────────────────────────────

export async function listAdmins(): Promise<Admin[]> {
  return db.select().from(admins).orderBy(asc(admins.createdAt));
}

export async function getAdminByUsername(username: string): Promise<Admin | undefined> {
  const result = await db.select().from(admins).where(eq(admins.username, username));
  return result[0];
}

export async function getAdminById(id: string): Promise<Admin | undefined> {
  const result = await db.select().from(admins).where(eq(admins.id, id));
  return result[0];
}

export async function createAdminAccount(username: string, email: string | undefined, passwordHash: string, isSuperAdmin = false): Promise<Admin> {
  const result = await db.insert(admins).values({ username, email, passwordHash, isSuperAdmin }).returning();
  return result[0];
}

export async function updateAdminPassword(id: string, passwordHash: string): Promise<Admin | undefined> {
  const result = await db.update(admins).set({ passwordHash }).where(eq(admins.id, id)).returning();
  return result[0];
}

export async function deleteAdminAccount(id: string): Promise<void> {
  await db.delete(admins).where(eq(admins.id, id));
}

export async function countAdmins(): Promise<number> {
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(admins);
  return result[0]?.count || 0;
}
