import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import {
  clients, drivers, admins, appSettings, announcements, orders, driverWallets
} from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ── Admins ────────────────────────────────────────────────────────────────
  console.log("Creating admins...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  await db.insert(admins).values([
    {
      username: "superadmin",
      email: "admin@fayage.ma",
      passwordHash: adminPassword,
      isSuperAdmin: true,
    },
    {
      username: "moderator",
      email: "mod@fayage.ma",
      passwordHash: adminPassword,
      isSuperAdmin: false,
    },
  ]).onConflictDoNothing();
  console.log("  ✓ Admins created (password: admin123)\n");

  // ── Clients ───────────────────────────────────────────────────────────────
  console.log("Creating test clients...");
  const clientPassword = await bcrypt.hash("test1234", 10);
  const insertedClients = await db.insert(clients).values([
    {
      fullName: "Ahmed Bennani",
      phone: "+212612345678",
      email: "ahmed@test.com",
      password: clientPassword,
      rating: 4.5,
      totalRatings: 12,
      referralCode: "AHMED2024",
    },
    {
      fullName: "Fatima Zahra",
      phone: "+212698765432",
      email: "fatima@test.com",
      password: clientPassword,
      rating: 4.8,
      totalRatings: 5,
      referralCode: "FATIMA24",
    },
    {
      fullName: "Karim Tazi",
      phone: "+212677001122",
      email: "karim@test.com",
      password: clientPassword,
      rating: 3.9,
      totalRatings: 8,
      referralCode: "KARIM24",
    },
  ]).onConflictDoNothing().returning();
  console.log(`  ✓ ${insertedClients.length} clients created (password: test1234)\n`);

  // ── Drivers ───────────────────────────────────────────────────────────────
  console.log("Creating test drivers...");
  const driverPassword = await bcrypt.hash("test1234", 10);
  const insertedDrivers = await db.insert(drivers).values([
    {
      fullName: "Youssef Alaoui",
      phone: "+212655001122",
      email: "youssef@test.com",
      password: driverPassword,
      vehicleType: "camion",
      nationalId: "AB123456",
      verificationStatus: "approved",
      rating: 4.7,
      totalRatings: 34,
      referralCode: "YOUSSEF24",
      bio: "Chauffeur professionnel avec 5 ans d'expérience",
    },
    {
      fullName: "Hassan Moussaoui",
      phone: "+212644009988",
      email: "hassan@test.com",
      password: driverPassword,
      vehicleType: "fourgon",
      nationalId: "CD789012",
      verificationStatus: "approved",
      rating: 4.9,
      totalRatings: 67,
      referralCode: "HASSAN24",
      bio: "Livraison rapide et sécurisée",
    },
    {
      fullName: "Rachid Benali",
      phone: "+212633112233",
      email: "rachid@test.com",
      password: driverPassword,
      vehicleType: "pickup",
      nationalId: "EF345678",
      verificationStatus: "pending_verification",
      rating: 0,
      totalRatings: 0,
      referralCode: "RACHID24",
    },
  ]).onConflictDoNothing().returning();
  console.log(`  ✓ ${insertedDrivers.length} drivers created (password: test1234)\n`);

  // ── Driver Wallets ────────────────────────────────────────────────────────
  if (insertedDrivers.length > 0) {
    console.log("Creating driver wallets...");
    for (const driver of insertedDrivers) {
      await db.insert(driverWallets).values({
        driverId: driver.id,
        balance: Math.random() * 500,
        totalEarnings: Math.random() * 5000,
        totalCommission: Math.random() * 250,
      }).onConflictDoNothing();
    }
    console.log("  ✓ Driver wallets created\n");
  }

  // ── Sample Orders ─────────────────────────────────────────────────────────
  if (insertedClients.length > 0 && insertedDrivers.length > 0) {
    console.log("Creating sample orders...");
    const client = insertedClients[0];
    const driver = insertedDrivers[0];

    await db.insert(orders).values([
      {
        orderNumber: 1001,
        clientId: client.id,
        clientName: client.fullName,
        clientPhone: client.phone,
        clientRating: 4.5,
        driverId: driver.id,
        driverName: driver.fullName,
        driverPhone: driver.phone,
        driverRating: 4.7,
        pickupAddress: "Casablanca, Ain Sebaa, Rue des usines",
        deliveryAddress: "Rabat, Agdal, Avenue Mohammed VI",
        pickupLat: 33.6139,
        pickupLng: -7.4897,
        deliveryLat: 33.9716,
        deliveryLng: -6.8498,
        vehicleType: "camion",
        goodsDescription: "Meubles de bureau",
        estimatedWeight: 500,
        deliveryOption: "standard",
        estimatedPrice: 650,
        finalPrice: 650,
        distance: 95,
        estimatedTime: 90,
        status: "delivered",
        completedAt: new Date(),
      },
      {
        orderNumber: 1002,
        clientId: client.id,
        clientName: client.fullName,
        clientPhone: client.phone,
        clientRating: 4.5,
        pickupAddress: "Marrakech, Guéliz, Avenue Mohammed V",
        deliveryAddress: "Marrakech, Médina, Place Jemaa el-Fna",
        pickupLat: 31.6347,
        pickupLng: -8.0078,
        deliveryLat: 31.6259,
        deliveryLng: -7.9891,
        vehicleType: "fourgon",
        goodsDescription: "Marchandises diverses",
        estimatedWeight: 200,
        deliveryOption: "express",
        estimatedPrice: 180,
        distance: 4,
        estimatedTime: 20,
        status: "pending",
      },
    ]).onConflictDoNothing();
    console.log("  ✓ Sample orders created\n");
  }

  // ── App Settings ──────────────────────────────────────────────────────────
  console.log("Creating app settings...");
  await db.insert(appSettings).values([
    { settingKey: "commission_rate", settingValue: "5" },
    { settingKey: "min_order_price", settingValue: "50" },
    { settingKey: "max_order_price", settingValue: "10000" },
    { settingKey: "referral_reward_referrer", settingValue: "20" },
    { settingKey: "referral_reward_referred", settingValue: "10" },
    { settingKey: "app_version_android", settingValue: "1.0.0" },
    { settingKey: "app_version_ios", settingValue: "1.0.0" },
    { settingKey: "maintenance_mode", settingValue: "false" },
    { settingKey: "support_phone", settingValue: "+212600000000" },
    { settingKey: "support_email", settingValue: "support@fayage.ma" },
  ]).onConflictDoNothing();
  console.log("  ✓ App settings created\n");

  // ── Announcements ─────────────────────────────────────────────────────────
  console.log("Creating announcements...");
  await db.insert(announcements).values([
    {
      title: "Bienvenue sur FAYAGE!",
      message: "Nous sommes ravis de vous accueillir sur notre plateforme de transport.",
      type: "info",
      targetAudience: "all",
      isActive: true,
    },
    {
      title: "Bonus chauffeurs ce weekend!",
      message: "Gagnez 10% de bonus sur toutes vos livraisons ce weekend.",
      type: "promo",
      targetAudience: "drivers",
      isActive: true,
    },
  ]).onConflictDoNothing();
  console.log("  ✓ Announcements created\n");

  console.log("✅ Seed complete!\n");
  console.log("─────────────────────────────────────");
  console.log("Admin login:  superadmin / admin123");
  console.log("Client login: ahmed@test.com / test1234");
  console.log("Driver login: youssef@test.com / test1234");
  console.log("─────────────────────────────────────");

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
