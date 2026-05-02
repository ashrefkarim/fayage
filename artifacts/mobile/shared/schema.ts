import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const clients = pgTable("clients", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  password: text("password"),
  avatarUrl: text("avatar_url"),
  rating: real("rating").default(0),
  totalRatings: integer("total_ratings").default(0),
  referralCode: text("referral_code"),
  referredBy: varchar("referred_by"),
  referralRewardBalance: real("referral_reward_balance").default(0),
  isBanned: boolean("is_banned").default(false),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const drivers = pgTable("drivers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  password: text("password"),
  nationalId: text("national_id"),
  vehicleType: text("vehicle_type"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  verificationStatus: text("verification_status").notNull().default("pending_verification"),
  verificationNotes: text("verification_notes"),
  documents: text("documents"),
  rating: real("rating").default(0),
  totalRatings: integer("total_ratings").default(0),
  referralCode: text("referral_code"),
  referredBy: varchar("referred_by"),
  referralRewardBalance: real("referral_reward_balance").default(0),
  isBanned: boolean("is_banned").default(false),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  clientRating: real("client_rating").default(0),
  driverId: varchar("driver_id"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  driverRating: real("driver_rating"),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  pickupLat: real("pickup_lat"),
  pickupLng: real("pickup_lng"),
  deliveryLat: real("delivery_lat"),
  deliveryLng: real("delivery_lng"),
  vehicleType: text("vehicle_type").notNull(),
  goodsDescription: text("goods_description").notNull(),
  goodsPhotos: text("goods_photos"),
  estimatedWeight: real("estimated_weight").default(0),
  deliveryOption: text("delivery_option").notNull().default("standard"),
  estimatedPrice: real("estimated_price").default(0),
  proposedPrice: real("proposed_price").default(0),
  finalPrice: real("final_price"),
  distance: real("distance").default(0),
  estimatedTime: integer("estimated_time").default(0),
  status: text("status").notNull().default("pending"),
  clientRated: boolean("client_rated").default(false),
  driverRated: boolean("driver_rated").default(false),
  clientGivenRating: real("client_given_rating"),
  driverGivenRating: real("driver_given_rating"),
  clientReview: text("client_review"),
  driverReview: text("driver_review"),
  clientSignature: text("client_signature"),
  deliveryPhoto: text("delivery_photo"),
  deliveryNote: text("delivery_note"),
  deliveredAt: timestamp("delivered_at"),
  scheduledFor: timestamp("scheduled_for"),
  preferredDriverId: varchar("preferred_driver_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const driverLocations = pgTable("driver_locations", {
  driverId: varchar("driver_id").primaryKey(),
  name: text("name"),
  vehicleType: text("vehicle_type"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  isAvailable: boolean("is_available").default(true),
  rating: real("rating"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DriverLocation = typeof driverLocations.$inferSelect;

export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  text: text("text").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const driverOffers = pgTable("driver_offers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone").notNull(),
  driverRating: real("driver_rating"),
  offeredPrice: real("offered_price"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverOfferSchema = createInsertSchema(driverOffers).omit({
  id: true,
  createdAt: true,
});

export type InsertDriverOffer = z.infer<typeof insertDriverOfferSchema>;
export type DriverOffer = typeof driverOffers.$inferSelect;

export const emailVerifications = pgTable("email_verifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EmailVerification = typeof emailVerifications.$inferSelect;

export const appSettings = pgTable("app_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

export const pushTokens = pgTable("push_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userType: text("user_type").notNull(),
  token: text("token").notNull(),
  platform: text("platform"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PushToken = typeof pushTokens.$inferSelect;

export const favoriteDrivers = pgTable("favorite_drivers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FavoriteDriver = typeof favoriteDrivers.$inferSelect;

export const referrals = pgTable("referrals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  referrerType: text("referrer_type").notNull(),
  referredId: varchar("referred_id").notNull(),
  referredType: text("referred_type").notNull(),
  referralCode: text("referral_code").notNull(),
  status: text("status").notNull().default("pending"),
  referrerReward: real("referrer_reward").default(0),
  referredReward: real("referred_reward").default(0),
  rewardedAt: timestamp("rewarded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export const announcements = pgTable("announcements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  targetAudience: text("target_audience").notNull().default("all"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;
