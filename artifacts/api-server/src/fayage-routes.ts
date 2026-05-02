import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as storage from "./storage";
import { sendVerificationEmail, sendClientWelcomeEmail, sendDriverWelcomeEmail, sendDriverApprovalEmail, sendDriverRejectionEmail } from "./email";
import { verifyCINDocuments, verifyLicenseFront, verifyLicenseBack, verifyCarteGrise } from "./ai-verify";
import * as notifications from "./notifications";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

interface LocationUpdate {
  userId: string;
  requestId: string;
  location: { latitude: number; longitude: number };
  timestamp: number;
}

const locationStore: Map<string, LocationUpdate> = new Map();

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  userRole?: "client" | "driver";
}

const wsClients: Map<WebSocket, ClientConnection> = new Map();

// Strip large base64 fields from orders to prevent flooding WebSocket with large data
function stripLargeOrderFields(order: any): any {
  if (!order) return order;
  const { deliveryPhoto, clientSignature, ...lightOrder } = order;
  return {
    ...lightOrder,
    hasDeliveryPhoto: !!deliveryPhoto,
    hasClientSignature: !!clientSignature,
  };
}

function stripLargeFieldsFromMessage(message: any): any {
  if (message.order) {
    return { ...message, order: stripLargeOrderFields(message.order) };
  }
  if (message.orders) {
    return { ...message, orders: message.orders.map(stripLargeOrderFields) };
  }
  return message;
}

function broadcastToClients(message: object, stripLargeFields = true) {
  const processedMessage = stripLargeFields ? stripLargeFieldsFromMessage(message) : message;
  const data = JSON.stringify(processedMessage);
  wsClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function sendToUser(userId: string, message: object, stripLargeFields = true) {
  const processedMessage = stripLargeFields ? stripLargeFieldsFromMessage(message) : message;
  const data = JSON.stringify(processedMessage);
  wsClients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function broadcastToRole(role: "client" | "driver" | "admin", message: object, stripLargeFields = true) {
  const processedMessage = stripLargeFields ? stripLargeFieldsFromMessage(message) : message;
  const data = JSON.stringify(processedMessage);
  wsClients.forEach((client) => {
    if (client.userRole === role && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed default admin account on first run
  (async () => {
    try {
      const count = await storage.countAdmins();
      if (count === 0) {
        const hash = await bcrypt.hash("FAYAGE2024", 12);
        await storage.createAdminAccount("admin", undefined, hash, true);
        console.log("[SEED] Default admin created: username=admin password=FAYAGE2024");
      }
    } catch (e) {
      console.error("[SEED] Could not seed default admin:", e);
    }
  })();

  // Serve admin dashboard
  const adminTemplatePath = path.resolve(process.cwd(), "server", "templates", "admin.html");
  if (fs.existsSync(adminTemplatePath)) {
    const adminTemplate = fs.readFileSync(adminTemplatePath, "utf-8");
    app.get("/api/admin-panel", (_req, res) => {
      res.type("html").send(adminTemplate);
    });
  }

  // Placeholder image endpoint for admin panel
  app.get("/api/placeholder/:width/:height", (req, res) => {
    const w = parseInt(req.params.width) || 40;
    const h = parseInt(req.params.height) || 40;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#E2E8F0"/>
      <circle cx="${w/2}" cy="${h/2 - 4}" r="${w/5}" fill="#94A3B8"/>
      <ellipse cx="${w/2}" cy="${h}" rx="${w/3}" ry="${h/5}" fill="#94A3B8"/>
    </svg>`;
    res.type("image/svg+xml").send(svg);
  });

  // Public endpoint for maintenance status (no auth required)
  app.get("/api/maintenance-status", async (_req, res) => {
    try {
      const maintenanceModeSetting = await storage.getAppSetting("maintenanceMode");
      const maintenanceMessageSetting = await storage.getAppSetting("maintenanceMessage");
      
      const isMaintenanceMode = maintenanceModeSetting?.settingValue === "true";
      const message = maintenanceMessageSetting?.settingValue || "L'application est actuellement en maintenance. Veuillez réessayer plus tard.";
      
      res.json({ 
        success: true, 
        maintenanceMode: isMaintenanceMode,
        message: isMaintenanceMode ? message : null
      });
    } catch (error) {
      console.error("Error checking maintenance status:", error);
      res.json({ success: true, maintenanceMode: false, message: null });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const { status, clientId, driverId, includeMedia } = req.query;
      const orders = await storage.getOrders({
        status: status as string,
        clientId: clientId as string,
        driverId: driverId as string,
      });
      // Strip large base64 fields unless explicitly requested
      const lightOrders = includeMedia === 'true' ? orders : orders.map(stripLargeOrderFields);
      res.json({ success: true, orders: lightOrders });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
  });

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "server", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const serveUpload = (req: any, res: any) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = path.join(uploadsDir, req.params.filename || path.basename(req.path));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  };

  // Serve uploads at both /uploads/:filename (legacy) and /api/uploads/:filename (proxy-routed)
  app.get("/uploads/:filename", serveUpload);
  app.get("/api/uploads/:filename", serveUpload);

  // Photo upload endpoint
  app.post("/api/upload-photo", async (req, res) => {
    try {
      const { base64, mimeType } = req.body;
      
      if (!base64) {
        return res.status(400).json({ success: false, error: "No image data provided" });
      }

      // Generate unique filename
      const extension = mimeType?.includes("png") ? "png" : "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${extension}`;
      const filePath = path.join(uploadsDir, filename);

      // Remove data URL prefix if present
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
      
      // Write file
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      // Return the URL that can be accessed
      const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000";
      const protocol = domain.includes("localhost") ? "http" : "https";
      const photoUrl = `${protocol}://${domain}/uploads/${filename}`;

      res.json({ success: true, url: photoUrl });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ success: false, error: "Failed to upload photo" });
    }
  });

  app.get("/api/orders/available", async (req, res) => {
    try {
      const { driverId } = req.query;
      
      if (driverId) {
        const driverStatus = await storage.getDriverVerificationStatus(driverId as string);
        if (!driverStatus.isVerified) {
          return res.status(403).json({ 
            success: false, 
            error: "Driver not verified",
            verificationStatus: driverStatus.status
          });
        }
      }

      const orders = await storage.getAvailableOrdersForDriver(undefined, undefined, driverId as string);
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Error fetching available orders:", error);
      res.status(500).json({ success: false, error: "Failed to fetch available orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }
      res.json({ success: true, order });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ success: false, error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = {
        ...req.body,
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
      };
      const order = await storage.createOrder(orderData);
      
      broadcastToClients({ type: "NEW_ORDER", order });
      broadcastToRole("driver", { type: "NEW_ORDER_NOTIFICATION", order });
      
      notifications.notifyNewOrder(order).catch(err => 
        console.error("Error sending new order notification:", err)
      );
      
      res.json({ success: true, order });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ success: false, error: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }
      
      broadcastToClients({ type: "ORDER_UPDATED", order });
      
      res.json({ success: true, order });
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ success: false, error: "Failed to update order" });
    }
  });

  app.put("/api/orders/:id/accept", async (req, res) => {
    try {
      const { driverId, driverName, driverPhone, driverRating, finalPrice } = req.body;
      
      const driverStatus = await storage.getDriverVerificationStatus(driverId);
      if (!driverStatus.isVerified) {
        return res.status(403).json({ 
          success: false, 
          error: "Driver not verified. Cannot accept orders.",
          verificationStatus: driverStatus.status
        });
      }

      const existingOrder = await storage.getOrderById(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }
      if (existingOrder.status !== "pending" && existingOrder.status !== "awaiting_client_approval") {
        return res.status(400).json({ success: false, error: "Order is no longer available" });
      }

      const alreadyOffered = await storage.hasDriverOfferedOnOrder(req.params.id, driverId);
      if (alreadyOffered) {
        return res.status(400).json({ success: false, error: "You have already offered on this order" });
      }

      const offer = await storage.createDriverOffer({
        orderId: req.params.id,
        driverId,
        driverName,
        driverPhone,
        driverRating,
        offeredPrice: finalPrice || existingOrder.proposedPrice,
        status: "pending",
      });

      const order = await storage.updateOrder(req.params.id, {
        status: "awaiting_client_approval",
      });

      const offers = await storage.getDriverOffersForOrder(req.params.id);

      broadcastToClients({ type: "DRIVER_OFFERED", order, offer, offers });
      sendToUser(existingOrder.clientId, { type: "DRIVER_OFFERED_NOTIFICATION", order, offer, offers });
      
      notifications.notifyDriverOffer(existingOrder, driverName).catch(err => 
        console.error("Error sending driver offer notification:", err)
      );
      
      res.json({ success: true, order, offer });
    } catch (error) {
      console.error("Error accepting order:", error);
      res.status(500).json({ success: false, error: "Failed to accept order" });
    }
  });

  app.get("/api/orders/:id/offers", async (req, res) => {
    try {
      const offers = await storage.getDriverOffersForOrder(req.params.id);
      res.json({ success: true, offers });
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ success: false, error: "Failed to fetch offers" });
    }
  });

  app.get("/api/driver-offers/:driverId", async (req, res) => {
    try {
      const offers = await storage.getDriverOffersByDriverId(req.params.driverId);
      res.json({ success: true, offers });
    } catch (error) {
      console.error("Error fetching driver offers:", error);
      res.status(500).json({ success: false, error: "Failed to fetch driver offers" });
    }
  });

  // ─── Commission calculator: flat 5% on all orders ────────────────────────
  function calculateCommission(_weight: number, amount: number): { rate: number; commission: number; earning: number } {
    const rate = 5;
    const commission = Math.round((amount * rate) / 100);
    const earning = Math.round(amount - commission);
    return { rate, commission, earning };
  }

  // ─── Generate unique payment reference ────────────────────────────────────
  function generatePaymentRef(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let ref = "CMD-";
    for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
    return ref;
  }

  app.put("/api/orders/:id/client-approve", async (req, res) => {
    try {
      const { offerId, driverId, driverName, driverPhone, driverRating, finalPrice } = req.body;
      
      const existingOrder = await storage.getOrderById(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }
      if (existingOrder.status !== "awaiting_client_approval") {
        return res.status(400).json({ success: false, error: "Order is not awaiting approval" });
      }

      const pendingOffers = await storage.getDriverOffersForOrder(req.params.id);
      const rejectedDriverIds = pendingOffers
        .filter(offer => offer.driverId !== driverId)
        .map(offer => offer.driverId);

      if (offerId) {
        await storage.updateDriverOfferStatus(offerId, "accepted");
      }
      await storage.rejectAllOffersForOrder(req.params.id, driverId);

      const agreedPrice = finalPrice || existingOrder.proposedPrice || 0;
      const weight = existingOrder.estimatedWeight || 0;
      const { rate, commission, earning } = calculateCommission(weight, agreedPrice);

      // Generate unique payment reference
      const referenceCode = generatePaymentRef();

      // Get payment receiver settings
      const receiverPhone = (await storage.getAppSetting("payment_receiver_phone"))?.settingValue || "";
      const receiverName = (await storage.getAppSetting("payment_receiver_name"))?.settingValue || "FAYAGE";

      // Create payment record
      const payment = await storage.createPayment({
        orderId: req.params.id,
        referenceCode,
        method: "wafacash",
        receiverPhone,
        receiverName,
        amount: agreedPrice,
        commissionRate: rate,
        commissionAmount: commission,
        driverEarning: earning,
        status: "pending_upload",
      });

      const order = await storage.updateOrder(req.params.id, {
        driverId,
        driverName,
        driverPhone,
        driverRating,
        finalPrice: agreedPrice,
        paymentReferenceCode: referenceCode,
        status: "waiting_for_payment",
      });

      broadcastToClients({ type: "ORDER_WAITING_PAYMENT", order, payment });
      if (driverId) {
        sendToUser(driverId, { type: "ORDER_WAITING_PAYMENT_NOTIFICATION", order, message: "Le client a accepté votre offre. En attente de paiement." });
        notifications.notifyOfferAccepted(existingOrder, driverId).catch(err => 
          console.error("Error sending offer accepted notification:", err)
        );
      }
      
      rejectedDriverIds.forEach(rejectedDriverId => {
        sendToUser(rejectedDriverId, { 
          type: "DRIVER_REJECTED_NOTIFICATION", 
          orderId: req.params.id,
          message: "Le client a choisi un autre chauffeur"
        });
        notifications.notifyOfferRejected(rejectedDriverId, req.params.id).catch(err => 
          console.error("Error sending offer rejected notification:", err)
        );
      });
      
      res.json({ success: true, order, payment });
    } catch (error) {
      console.error("Error approving driver:", error);
      res.status(500).json({ success: false, error: "Failed to approve driver" });
    }
  });

  // ─── Get payment for an order ─────────────────────────────────────────────
  app.get("/api/payments/order/:orderId", async (req, res) => {
    try {
      const payment = await storage.getPaymentByOrderId(req.params.orderId);
      res.json({ success: true, payment: payment || null });
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ success: false, error: "Failed to fetch payment" });
    }
  });

  // ─── Client uploads proof of payment ─────────────────────────────────────
  app.put("/api/payments/order/:orderId/upload-proof", async (req, res) => {
    try {
      const { proofImageUrl, transactionRef } = req.body;
      if (!proofImageUrl) {
        return res.status(400).json({ success: false, error: "Proof image is required" });
      }

      const payment = await storage.getPaymentByOrderId(req.params.orderId);
      if (!payment) {
        return res.status(404).json({ success: false, error: "Payment not found" });
      }

      const updated = await storage.updatePayment(payment.id, {
        proofImageUrl,
        transactionRef: transactionRef || undefined,
        status: "pending_review",
      });

      // Notify all connected users (admin will see this on refresh)
      broadcastToClients({ type: "PAYMENT_PROOF_UPLOADED", orderId: req.params.orderId });

      res.json({ success: true, payment: updated });
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      res.status(500).json({ success: false, error: "Failed to upload payment proof" });
    }
  });

  // ─── Admin: list all payments ─────────────────────────────────────────────
  app.get("/api/payments", async (req, res) => {
    try {
      const { status } = req.query;
      const allPayments = await storage.getPayments(status as string | undefined);
      
      // Enrich with order + client + driver info
      const enriched = await Promise.all(allPayments.map(async (p) => {
        const order = await storage.getOrderById(p.orderId);
        return { ...p, order };
      }));

      res.json({ success: true, payments: enriched });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ success: false, error: "Failed to fetch payments" });
    }
  });

  // ─── Admin: accept payment ────────────────────────────────────────────────
  app.put("/api/payments/:paymentId/accept", async (req, res) => {
    try {
      const { adminId } = req.body;

      const payment = await storage.updatePayment(req.params.paymentId, {
        status: "accepted",
        reviewedBy: adminId || "admin",
        reviewedAt: new Date(),
      } as any);

      if (!payment) {
        return res.status(404).json({ success: false, error: "Payment not found" });
      }

      // Update order status to "paid" (accepted payment = driver can proceed)
      const order = await storage.updateOrder(payment.orderId, { status: "paid" });

      // Notify driver (wallet will be credited when client confirms delivery)
      if (order?.driverId) {
        sendToUser(order.driverId, { type: "PAYMENT_ACCEPTED", order, message: "Le paiement a été vérifié. Vous pouvez procéder à la livraison." });
      }

      // Notify client
      if (order?.clientId) {
        sendToUser(order.clientId, { type: "PAYMENT_ACCEPTED_CLIENT", order, message: "Votre paiement a été vérifié. Le chauffeur va procéder à la livraison." });
      }

      broadcastToClients({ type: "ORDER_PAID", order });

      if (order?.driverId) {
        notifications.sendPushNotification(order.driverId, 'driver', {
          title: 'Paiement confirmé',
          body: 'Le paiement de votre client a été vérifié. Vous pouvez procéder à la livraison.',
          data: { type: 'PAYMENT_CONFIRMED', orderId: order.id },
        }).catch(err => console.error("Error sending payment push notification:", err));
      }

      if (order?.clientId) {
        notifications.sendPushNotification(order.clientId, 'client', {
          title: 'Paiement vérifié',
          body: 'Votre paiement a été vérifié. Le chauffeur va procéder à la livraison.',
          data: { type: 'PAYMENT_CONFIRMED', orderId: order.id },
        }).catch(err => console.error("Error sending payment push notification:", err));
      }

      res.json({ success: true, payment, order });
    } catch (error) {
      console.error("Error accepting payment:", error);
      res.status(500).json({ success: false, error: "Failed to accept payment" });
    }
  });

  // ─── Admin: reject payment ────────────────────────────────────────────────
  app.put("/api/payments/:paymentId/reject", async (req, res) => {
    try {
      const { adminId, reason } = req.body;

      const payment = await storage.updatePayment(req.params.paymentId, {
        status: "rejected",
        reviewedBy: adminId || "admin",
        reviewedAt: new Date(),
      } as any);

      if (!payment) {
        return res.status(404).json({ success: false, error: "Payment not found" });
      }

      // Keep order in waiting_for_payment so client can retry
      const order = await storage.getOrderById(payment.orderId);

      if (order?.clientId) {
        sendToUser(order.clientId, { 
          type: "PAYMENT_REJECTED_CLIENT", 
          order, 
          message: reason || "Votre preuve de paiement a été refusée. Veuillez soumettre une nouvelle preuve." 
        });
      }

      res.json({ success: true, payment });
    } catch (error) {
      console.error("Error rejecting payment:", error);
      res.status(500).json({ success: false, error: "Failed to reject payment" });
    }
  });

  // ─── Client confirms delivery ─────────────────────────────────────────────
  app.put("/api/orders/:id/confirm-delivery", async (req, res) => {
    try {
      const existingOrder = await storage.getOrderById(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      if (existingOrder.status !== "delivered") {
        return res.status(400).json({ success: false, error: "Order is not in delivered state" });
      }

      // Already confirmed — return success without double-crediting
      if ((existingOrder as any).completedAt) {
        return res.json({ success: true, order: existingOrder });
      }

      const { clientSignature, deliveryNote } = req.body || {};
      const order = await storage.updateOrder(req.params.id, {
        completedAt: new Date(),
        ...(clientSignature ? { clientSignature } : {}),
        ...(deliveryNote ? { deliveryNote } : {}),
      } as any);

      // Credit driver wallet now that delivery is confirmed by client
      if (order?.driverId) {
        const payment = await storage.getPaymentByOrderId(req.params.id);
        if (payment && payment.status === "accepted") {
          await storage.creditDriverWallet(order.driverId, payment.driverEarning, payment.commissionAmount);
          sendToUser(order.driverId, {
            type: "DELIVERY_CONFIRMED",
            order,
            message: `La livraison a été confirmée. ${payment.driverEarning} MAD ont été ajoutés à votre portefeuille.`,
          });
        } else {
          sendToUser(order.driverId, { type: "DELIVERY_CONFIRMED", order, message: "Le client a confirmé la livraison." });
        }
      }

      broadcastToClients({ type: "ORDER_COMPLETED", order });

      if (order?.driverId) {
        notifications.sendPushNotification(order.driverId, 'driver', {
          title: 'Livraison terminée',
          body: 'Le client a confirmé la livraison. Votre gain a été crédité.',
          data: { type: 'ORDER_COMPLETED', orderId: order.id },
        }).catch(err => console.error("Error sending completion push notification:", err));
      }

      res.json({ success: true, order });
    } catch (error) {
      console.error("Error confirming delivery:", error);
      res.status(500).json({ success: false, error: "Failed to confirm delivery" });
    }
  });

  // ─── Get driver wallet ────────────────────────────────────────────────────
  app.get("/api/driver-wallet/:driverId", async (req, res) => {
    try {
      const wallet = await storage.getDriverWallet(req.params.driverId);
      res.json({ success: true, wallet: wallet || { driverId: req.params.driverId, balance: 0, totalEarnings: 0, totalCommission: 0 } });
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ success: false, error: "Failed to fetch wallet" });
    }
  });

  // ─── Payment receiver settings ────────────────────────────────────────────
  app.get("/api/settings/payment-receiver", async (req, res) => {
    try {
      const phone = await storage.getAppSetting("payment_receiver_phone");
      const name = await storage.getAppSetting("payment_receiver_name");
      res.json({ 
        success: true, 
        receiverPhone: phone?.settingValue || "",
        receiverName: name?.settingValue || "FAYAGE"
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch payment settings" });
    }
  });

  app.put("/api/settings/payment-receiver", async (req, res) => {
    try {
      const { receiverPhone, receiverName } = req.body;
      if (receiverPhone !== undefined) await storage.upsertAppSetting("payment_receiver_phone", receiverPhone);
      if (receiverName !== undefined) await storage.upsertAppSetting("payment_receiver_name", receiverName);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update payment settings" });
    }
  });

  // ─── RIB settings (public — read only) ────────────────────────────────────
  app.get("/api/settings/ribs", async (_req, res) => {
    try {
      const wafacash = await storage.getAppSetting("rib_wafacash");
      const cashplus = await storage.getAppSetting("rib_cashplus");
      res.json({
        success: true,
        ribWafacash: wafacash?.settingValue || "",
        ribCashplus: cashplus?.settingValue || "",
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch RIB settings" });
    }
  });

  app.put("/api/orders/:id/client-reject", async (req, res) => {
    try {
      const { offerId, driverId } = req.body;
      
      const existingOrder = await storage.getOrderById(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }
      if (existingOrder.status !== "awaiting_client_approval") {
        return res.status(400).json({ success: false, error: "Order is not awaiting approval" });
      }

      if (offerId) {
        await storage.updateDriverOfferStatus(offerId, "rejected");
      }

      const remainingOffers = await storage.getDriverOffersForOrder(req.params.id);
      
      let order;
      if (remainingOffers.length === 0) {
        order = await storage.updateOrder(req.params.id, {
          status: "pending",
        });
      } else {
        order = existingOrder;
      }

      broadcastToClients({ type: "DRIVER_REJECTED", order, offers: remainingOffers });
      if (driverId) {
        sendToUser(driverId, { type: "OFFER_REJECTED_NOTIFICATION", orderId: req.params.id });
      }
      
      res.json({ success: true, order, remainingOffers });
    } catch (error) {
      console.error("Error rejecting driver:", error);
      res.status(500).json({ success: false, error: "Failed to reject driver" });
    }
  });

  app.get("/api/drivers/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getDriverReviews(req.params.id);
      const driver = await storage.getDriverById(req.params.id);
      const stats = await storage.getDriverStats(req.params.id);
      res.json({ 
        success: true, 
        reviews,
        rating: driver?.rating || 0,
        totalRatings: driver?.totalRatings || 0,
        totalDeliveries: stats.totalDeliveries || 0,
        bio: driver?.bio || null,
        vehicleType: driver?.vehicleType || null,
        avatarUrl: driver?.avatarUrl || null,
        verificationStatus: driver?.verificationStatus || null,
      });
    } catch (error) {
      console.error("Error fetching driver reviews:", error);
      res.status(500).json({ success: false, error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/drivers/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getDriverStats(req.params.id);
      res.json({ success: true, ...stats });
    } catch (error) {
      console.error("Error fetching driver stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch driver stats" });
    }
  });

  app.post("/api/verification/send", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, error: "Email is required" });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await storage.createEmailVerification(email, code, expiresAt);

      const sent = await sendVerificationEmail(email, code);
      
      if (!sent) {
        return res.status(500).json({ success: false, error: "Failed to send email" });
      }

      res.json({ success: true, message: "Verification code sent" });
    } catch (error) {
      console.error("Error sending verification:", error);
      res.status(500).json({ success: false, error: "Failed to send verification" });
    }
  });

  app.post("/api/verification/verify", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ success: false, error: "Email and code are required" });
      }

      const verification = await storage.verifyEmailCode(email, code);
      
      if (!verification) {
        return res.status(400).json({ success: false, error: "Invalid or expired code" });
      }

      res.json({ success: true, verified: true });
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ success: false, error: "Failed to verify code" });
    }
  });

  app.get("/api/verification/check/:email", async (req, res) => {
    try {
      const isVerified = await storage.isEmailVerified(req.params.email);
      res.json({ success: true, verified: isVerified });
    } catch (error) {
      console.error("Error checking verification:", error);
      res.status(500).json({ success: false, error: "Failed to check verification" });
    }
  });

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["pending", "awaiting_client_approval", "accepted", "pickup", "in_transit", "delivered", "cancelled"];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status" });
      }

      const order = await storage.updateOrder(req.params.id, { status });
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      broadcastToClients({ type: "ORDER_STATUS_CHANGED", order });
      
      if (order.clientId) {
        let notificationType: string | null = null;
        
        switch (status) {
          case "pickup":
            notificationType = "DRIVER_EN_ROUTE";
            break;
          case "in_transit":
            notificationType = "GOODS_PICKED_UP";
            break;
          case "delivered":
            notificationType = "DELIVERY_COMPLETE";
            break;
        }
        
        if (notificationType) {
          sendToUser(order.clientId, {
            type: "STATUS_NOTIFICATION",
            notificationType,
            order,
          });
        }
      }

      notifications.notifyOrderStatusChange(order, status).catch(err =>
        console.error("Error sending status change push notification:", err)
      );
      
      res.json({ success: true, order });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ success: false, error: "Failed to update order status" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await storage.deleteOrder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ success: false, error: "Failed to delete order" });
    }
  });

  app.get("/api/orders/:id/delivery-note", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      const deliveryDate = order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR");
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("fr-FR") : "";
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Bon de Livraison - FAYAGE</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1E3A8A; padding-bottom: 20px; }
            .logo { font-size: 32px; font-weight: bold; color: #1E3A8A; }
            .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
            .doc-title { font-size: 24px; margin-top: 20px; color: #1E3A8A; }
            .info-section { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .label { font-weight: bold; color: #666; width: 40%; }
            .value { width: 60%; }
            .addresses { display: flex; gap: 30px; margin: 30px 0; }
            .address-box { flex: 1; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1E3A8A; }
            .address-box.delivery { border-left-color: #10B981; }
            .address-title { font-weight: bold; color: #1E3A8A; margin-bottom: 10px; }
            .address-box.delivery .address-title { color: #10B981; }
            .price-box { background: #1E3A8A; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
            .price-amount { font-size: 36px; font-weight: bold; }
            .price-label { font-size: 14px; opacity: 0.8; }
            .signature-section { margin-top: 40px; padding: 24px; border: 2px solid #e5e7eb; border-radius: 12px; background: #f9fafb; }
            .signature-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
            .signature-icon { width: 32px; height: 32px; background: #1E3A8A; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; }
            .signature-title { font-weight: bold; color: #1E3A8A; font-size: 15px; }
            .signature-box { background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; display: inline-block; }
            .signature-image { max-width: 320px; height: 120px; display: block; object-fit: contain; }
            .signature-pending { color: #9ca3af; font-style: italic; font-size: 14px; padding: 20px; text-align: center; border: 2px dashed #e5e7eb; border-radius: 8px; }
            .signature-date { color: #6b7280; font-size: 12px; margin-top: 10px; }
            .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
            .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .status-delivered { background: #10B981; color: white; }
            .status-pending { background: #F59E0B; color: white; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">FAYAGE</div>
            <div class="subtitle">Transport de marchandises au Maroc</div>
            <div class="doc-title">BON DE LIVRAISON</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="label">N° Commande:</span>
              <span class="value">${order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="label">Date de commande:</span>
              <span class="value">${orderDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Date de livraison:</span>
              <span class="value">${deliveryDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Statut:</span>
              <span class="value">
                <span class="status-badge ${order.status === 'delivered' ? 'status-delivered' : 'status-pending'}">
                  ${order.status === 'delivered' ? 'LIVRÉ' : order.status?.toUpperCase()}
                </span>
              </span>
            </div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="label">Client:</span>
              <span class="value">${order.clientName}</span>
            </div>
            <div class="info-row">
              <span class="label">Téléphone:</span>
              <span class="value">${order.clientPhone}</span>
            </div>
            ${order.driverName ? `
            <div class="info-row">
              <span class="label">Chauffeur:</span>
              <span class="value">${order.driverName}</span>
            </div>
            <div class="info-row">
              <span class="label">Tél. chauffeur:</span>
              <span class="value">${order.driverPhone}</span>
            </div>
            ` : ''}
          </div>

          <div class="addresses">
            <div class="address-box">
              <div class="address-title">📍 POINT DE RAMASSAGE</div>
              <div>${order.pickupAddress}</div>
            </div>
            <div class="address-box delivery">
              <div class="address-title">🚩 POINT DE LIVRAISON</div>
              <div>${order.deliveryAddress}</div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="label">Type de véhicule:</span>
              <span class="value">${order.vehicleType}</span>
            </div>
            <div class="info-row">
              <span class="label">Description:</span>
              <span class="value">${order.goodsDescription}</span>
            </div>
            ${order.estimatedWeight ? `
            <div class="info-row">
              <span class="label">Poids estimé:</span>
              <span class="value">${order.estimatedWeight} kg</span>
            </div>
            ` : ''}
          </div>

          <div class="price-box">
            <div class="price-label">MONTANT TOTAL</div>
            <div class="price-amount">${order.finalPrice || order.proposedPrice || order.estimatedPrice} MAD</div>
          </div>

          <div class="signature-section">
            <div class="signature-header">
              <div class="signature-icon">✍️</div>
              <div class="signature-title">Signature du client</div>
            </div>
            ${(order as any).clientSignature ? `
              <div class="signature-box">
                <img class="signature-image" src="${(order as any).clientSignature}" alt="Signature du client" />
              </div>
              <div class="signature-date">Signé le ${(order as any).completedAt ? new Date((order as any).completedAt).toLocaleString("fr-FR") : deliveryDate}</div>
              <div style="margin-top:12px;color:#10B981;font-weight:bold;font-size:13px;">✓ Livraison confirmée par le client</div>
            ` : `
              <div class="signature-pending">En attente de confirmation par le client</div>
            `}
          </div>

          <div class="footer">
            <p>Document généré par FAYAGE - ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
            <p>Ce document fait foi de livraison</p>
          </div>
        </body>
        </html>
      `;

      const orderId = order.id.substring(0, 8).toUpperCase();
      if (req.query.dl === "1") {
        res.setHeader("Content-Disposition", `attachment; filename="bon-livraison-${orderId}.html"`);
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(htmlContent);
    } catch (error) {
      console.error("Error generating delivery note:", error);
      res.status(500).json({ success: false, error: "Failed to generate delivery note" });
    }
  });

  app.post("/api/orders/:id/complete", async (req, res) => {
    try {
      const { deliveryPhoto } = req.body;

      if (!deliveryPhoto) {
        return res.status(400).json({ success: false, error: "Delivery photo is required" });
      }

      const order = await storage.updateOrder(req.params.id, { 
        status: "delivered",
        deliveryPhoto: deliveryPhoto,
        deliveredAt: new Date(),
      });

      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      broadcastToClients({ type: "ORDER_STATUS_CHANGED", order });
      
      sendToUser(order.clientId, {
        type: "STATUS_NOTIFICATION",
        notificationType: "DELIVERY_COMPLETE",
        order,
      });
      
      res.json({ success: true, order });
    } catch (error) {
      console.error("Error completing order:", error);
      res.status(500).json({ success: false, error: "Failed to complete order" });
    }
  });

  app.get("/api/drivers/:id/status", async (req, res) => {
    try {
      const driver = await storage.getDriverById(req.params.id);
      if (!driver) {
        return res.status(404).json({ success: false, error: "Driver not found" });
      }
      
      res.json({ 
        success: true, 
        status: driver.verificationStatus,
        isVerified: driver.verificationStatus === "verified",
        isBanned: driver.isBanned || false,
        banReason: driver.banReason,
        verificationNotes: driver.verificationNotes,
      });
    } catch (error) {
      console.error("Error fetching driver status:", error);
      res.status(500).json({ success: false, error: "Failed to fetch driver status" });
    }
  });

  app.post("/api/orders/:id/rating", async (req, res) => {
    try {
      const { isClientRating, rating, review } = req.body;
      
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, error: "Rating must be between 1 and 5" });
      }

      const order = await storage.submitRating(req.params.id, {
        isClientRating: Boolean(isClientRating),
        rating,
        review,
      });

      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      broadcastToClients({ type: "ORDER_RATED", order });
      
      res.json({ success: true, order });
    } catch (error) {
      console.error("Error submitting rating:", error);
      res.status(500).json({ success: false, error: "Failed to submit rating" });
    }
  });

  app.put("/api/drivers/:id/documents", async (req, res) => {
    try {
      const { documents } = req.body;
      if (!documents) {
        return res.status(400).json({ success: false, error: "Documents are required" });
      }

      const driver = await storage.upsertDriver({
        id: req.params.id,
        documents,
        verificationStatus: "pending_verification",
      });

      res.json({ success: true, driver });
    } catch (error) {
      console.error("Error updating driver documents:", error);
      res.status(500).json({ success: false, error: "Failed to update documents" });
    }
  });

  app.get("/api/admin/drivers", async (_req, res) => {
    try {
      const drivers = await storage.getDrivers();
      res.json({ success: true, drivers });
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ success: false, error: "Failed to fetch drivers" });
    }
  });

  app.get("/api/admin/drivers/:id", async (req, res) => {
    try {
      const driver = await storage.getDriverById(req.params.id);
      if (!driver) {
        return res.status(404).json({ success: false, error: "Driver not found" });
      }
      res.json({ success: true, driver });
    } catch (error) {
      console.error("Error fetching driver:", error);
      res.status(500).json({ success: false, error: "Failed to fetch driver" });
    }
  });

  app.post("/api/clients/sync", async (req, res) => {
    try {
      const { client } = req.body as { client: any };
      if (!client || !client.id) {
        return res.status(400).json({ success: false, error: "Invalid client data" });
      }

      // Check if this is a new client
      const existingClient = await storage.getClientById(client.id);
      const isNewClient = !existingClient;

      // Duplicate check on new registrations
      if (isNewClient) {
        if (client.phone) {
          const phoneUsedByClient = await storage.getClientByPhone(client.phone);
          const phoneUsedByDriver = await storage.getDriverByPhone(client.phone);
          if (phoneUsedByClient || phoneUsedByDriver) {
            return res.status(409).json({ success: false, error: "Un compte avec ce numéro de téléphone existe déjà" });
          }
        }
        if (client.email && !client.email.endsWith("@fayage.ma")) {
          const emailUsedByClient = await storage.getClientByEmail(client.email);
          const emailUsedByDriver = await storage.getDriverByEmail(client.email);
          if (emailUsedByClient || emailUsedByDriver) {
            return res.status(409).json({ success: false, error: "Un compte avec cet email existe déjà" });
          }
        }
      }

      await storage.upsertClient({
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        email: client.email,
        password: client.password,
        avatarUrl: client.avatarUrl,
        rating: client.rating || 0,
      });

      // Send welcome email to new clients
      if (isNewClient && client.email) {
        sendClientWelcomeEmail(client.email, client.fullName).catch(err => {
          console.error("Failed to send client welcome email:", err);
        });
      }

      wss.clients.forEach((wsClient) => {
        if (wsClient.readyState === 1) {
          wsClient.send(JSON.stringify({
            type: "USER_REGISTERED",
            userId: client.id,
            userType: "client"
          }));
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error syncing client:", error);
      res.status(500).json({ success: false, error: "Failed to sync client" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body as { phone: string; password: string };
      
      if (!phone || !password) {
        return res.status(400).json({ success: false, error: "Phone and password required" });
      }

      // Find account by phone + password (multiple accounts may share the same phone)
      const matchingClients = await storage.getClientsByPhone(phone);
      const client = matchingClients.find(c => c.password === password);
      if (client) {
        if (client.isBanned) {
          return res.status(403).json({ success: false, error: "Account is banned", reason: client.banReason });
        }
        return res.json({
          success: true,
          user: {
            id: client.id,
            fullName: client.fullName,
            phone: client.phone,
            email: client.email,
            role: "client",
            isVerified: true,
            avatarUrl: client.avatarUrl,
            rating: client.rating || 0,
            totalDeliveries: 0,
          }
        });
      }

      const matchingDrivers = await storage.getDriversByPhone(phone);
      const driver = matchingDrivers.find(d => d.password === password);
      if (driver) {
        if (driver.isBanned) {
          return res.status(403).json({ success: false, error: "Account is banned", reason: driver.banReason });
        }
        
        let documents = null;
        if (driver.documents) {
          try {
            documents = typeof driver.documents === "string" ? JSON.parse(driver.documents) : driver.documents;
          } catch (e) {
            documents = null;
          }
        }
        
        return res.json({
          success: true,
          user: {
            id: driver.id,
            fullName: driver.fullName,
            phone: driver.phone,
            email: driver.email,
            role: "driver",
            isVerified: driver.verificationStatus === "verified",
            verificationStatus: driver.verificationStatus,
            rejectionReason: driver.verificationNotes,
            avatarUrl: driver.avatarUrl,
            rating: driver.rating || 0,
            totalDeliveries: 0,
            vehicleType: driver.vehicleType,
            nationalId: driver.nationalId,
            documents: documents,
          }
        });
      }

      res.status(401).json({ success: false, error: "Invalid phone or password" });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  // Forgot password - request reset code
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body as { email: string };
      
      if (!email) {
        return res.status(400).json({ success: false, error: "Email required" });
      }

      // Check if user exists (client or driver)
      const client = await storage.getClientByEmail(email);
      const driver = await storage.getDriverByEmail(email);
      
      if (!client && !driver) {
        return res.status(404).json({ 
          success: false, 
          error: "EMAIL_NOT_FOUND",
          message: "No account found with this email" 
        });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save code to database
      await storage.createEmailVerification(email, code, expiresAt);

      // Send email
      const { sendPasswordResetEmail } = await import("./email");
      const sent = await sendPasswordResetEmail(email, code);
      
      if (!sent) {
        return res.status(500).json({ success: false, error: "Failed to send email" });
      }

      res.json({ success: true, message: "Reset code sent to email" });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ success: false, error: "Failed to process request" });
    }
  });

  // Verify reset code
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code } = req.body as { email: string; code: string };
      
      if (!email || !code) {
        return res.status(400).json({ success: false, error: "Email and code required" });
      }

      const verification = await storage.verifyEmailCode(email, code);
      
      if (!verification) {
        return res.status(400).json({ success: false, error: "Invalid or expired code" });
      }

      res.json({ success: true, message: "Code verified" });
    } catch (error) {
      console.error("Error verifying reset code:", error);
      res.status(500).json({ success: false, error: "Failed to verify code" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body as { email: string; code: string; newPassword: string };
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ success: false, error: "Email, code, and new password required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
      }

      // Verify the code is valid (already verified)
      const isVerified = await storage.isEmailVerified(email);
      if (!isVerified) {
        return res.status(400).json({ success: false, error: "Please verify your code first" });
      }

      // Update password for client or driver
      const client = await storage.getClientByEmail(email);
      if (client) {
        await storage.updateClientPassword(email, newPassword);
        return res.json({ success: true, message: "Password reset successfully", role: "client" });
      }

      const driver = await storage.getDriverByEmail(email);
      if (driver) {
        await storage.updateDriverPassword(email, newPassword);
        return res.json({ success: true, message: "Password reset successfully", role: "driver" });
      }

      res.status(404).json({ success: false, error: "User not found" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ success: false, error: "Failed to reset password" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const client = await storage.upsertClient({ id, ...updates });
      res.json({ success: true, client });
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ success: false, error: "Failed to update client" });
    }
  });

  app.put("/api/drivers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const driver = await storage.upsertDriver({ id, ...updates });
      res.json({ success: true, driver });
    } catch (error) {
      console.error("Error updating driver:", error);
      res.status(500).json({ success: false, error: "Failed to update driver" });
    }
  });

  app.post("/api/admin/drivers/sync", async (req, res) => {
    try {
      const { drivers } = req.body as { drivers: any[] };
      if (!Array.isArray(drivers)) {
        return res.status(400).json({ success: false, error: "Invalid drivers data" });
      }

      for (const driver of drivers) {
        if (driver.id) {
          // Check if this is a new driver
          const existingDriver = await storage.getDriverById(driver.id);
          const isNewDriver = !existingDriver;

          // Duplicate phone check on new registrations
          if (isNewDriver && driver.phone) {
            const phoneUsedByClient = await storage.getClientByPhone(driver.phone);
            const phoneUsedByDriver = await storage.getDriverByPhone(driver.phone);
            if (phoneUsedByClient || phoneUsedByDriver) {
              return res.status(409).json({ success: false, error: "Un compte avec ce numéro de téléphone existe déjà" });
            }
          }

          await storage.upsertDriver({
            id: driver.id,
            fullName: driver.fullName,
            phone: driver.phone,
            email: driver.email,
            password: driver.password,
            nationalId: driver.nationalId,
            vehicleType: driver.vehicleType,
            verificationStatus: driver.verificationStatus,
            documents: driver.documents,
            avatarUrl: driver.avatarUrl,
          });

          // Send welcome email to new drivers
          if (isNewDriver && driver.email) {
            sendDriverWelcomeEmail(driver.email, driver.fullName).catch(err => {
              console.error("Failed to send driver welcome email:", err);
            });
            // Auto-approved: send approval email immediately
            if (driver.verificationStatus === "verified") {
              sendDriverApprovalEmail(driver.email, driver.fullName).catch(err => {
                console.error("Failed to send driver auto-approval email:", err);
              });
            }
          }
        }
      }

      res.json({ success: true, count: drivers.length });
    } catch (error) {
      console.error("Error syncing drivers:", error);
      res.status(500).json({ success: false, error: "Failed to sync drivers" });
    }
  });

  app.put("/api/admin/drivers/:id/verify", async (req, res) => {
    try {
      const { status, notes } = req.body as { status: "verified" | "rejected"; notes?: string };

      if (!["verified", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status" });
      }

      const driver = await storage.updateDriverVerification(req.params.id, status, notes);
      if (!driver) {
        return res.status(404).json({ success: false, error: "Driver not found" });
      }

      // Send approval or rejection email
      if (driver.email) {
        if (status === "verified") {
          sendDriverApprovalEmail(driver.email, driver.fullName).catch(err => {
            console.error("Failed to send driver approval email:", err);
          });
        } else if (status === "rejected") {
          sendDriverRejectionEmail(driver.email, driver.fullName, notes).catch(err => {
            console.error("Failed to send driver rejection email:", err);
          });
        }
      }

      res.json({ success: true, driver });
    } catch (error) {
      console.error("Error verifying driver:", error);
      res.status(500).json({ success: false, error: "Failed to update driver status" });
    }
  });

  app.get("/api/drivers/:id/status", async (req, res) => {
    try {
      const status = await storage.getDriverVerificationStatus(req.params.id);
      res.json({ success: true, ...status });
    } catch (error) {
      console.error("Error fetching driver status:", error);
      res.status(500).json({ success: false, error: "Failed to fetch status" });
    }
  });

  // Admin login — username + password
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password, code } = req.body as { username?: string; password?: string; code?: string };

      // Legacy code-based login still accepted for backwards compat (mobile app)
      if (code && code === "FAYAGE2024" && !username) {
        return res.json({ success: true, message: "Admin authenticated", admin: { id: "legacy", username: "admin", isSuperAdmin: true } });
      }

      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Identifiant et mot de passe requis" });
      }

      const admin = await storage.getAdminByUsername(username.trim());
      if (!admin) {
        return res.status(401).json({ success: false, error: "Identifiant ou mot de passe incorrect" });
      }

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        return res.status(401).json({ success: false, error: "Identifiant ou mot de passe incorrect" });
      }

      res.json({
        success: true,
        message: "Admin authenticated",
        admin: { id: admin.id, username: admin.username, email: admin.email, isSuperAdmin: admin.isSuperAdmin },
      });
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  // List all admin accounts
  app.get("/api/admin/accounts", async (_req, res) => {
    try {
      const list = await storage.listAdmins();
      res.json({ success: true, admins: list.map(a => ({ id: a.id, username: a.username, email: a.email, isSuperAdmin: a.isSuperAdmin, createdAt: a.createdAt })) });
    } catch (error) {
      console.error("Error listing admins:", error);
      res.status(500).json({ success: false, error: "Failed to list admins" });
    }
  });

  // Create admin account
  app.post("/api/admin/accounts", async (req, res) => {
    try {
      const { username, email, password, isSuperAdmin } = req.body as { username: string; email?: string; password: string; isSuperAdmin?: boolean };
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Identifiant et mot de passe requis" });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères" });
      }
      const existing = await storage.getAdminByUsername(username.trim());
      if (existing) {
        return res.status(409).json({ success: false, error: "Cet identifiant est déjà utilisé" });
      }
      const hash = await bcrypt.hash(password, 12);
      const admin = await storage.createAdminAccount(username.trim(), email, hash, isSuperAdmin || false);
      res.json({ success: true, admin: { id: admin.id, username: admin.username, email: admin.email, isSuperAdmin: admin.isSuperAdmin, createdAt: admin.createdAt } });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ success: false, error: "Failed to create admin account" });
    }
  });

  // Delete admin account
  app.delete("/api/admin/accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const count = await storage.countAdmins();
      if (count <= 1) {
        return res.status(400).json({ success: false, error: "Impossible de supprimer le dernier compte admin" });
      }
      await storage.deleteAdminAccount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting admin:", error);
      res.status(500).json({ success: false, error: "Failed to delete admin account" });
    }
  });

  // Change admin password
  app.put("/api/admin/accounts/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body as { password: string };
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères" });
      }
      const hash = await bcrypt.hash(password, 12);
      await storage.updateAdminPassword(id, hash);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating admin password:", error);
      res.status(500).json({ success: false, error: "Failed to update password" });
    }
  });

  // Admin stats
  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json({ success: true, stats });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  });

  // Get all clients
  app.get("/api/admin/clients", async (_req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json({ success: true, clients });
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ success: false, error: "Failed to fetch clients" });
    }
  });

  // Get client by ID
  app.get("/api/admin/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ success: false, error: "Client not found" });
      }
      res.json({ success: true, client });
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ success: false, error: "Failed to fetch client" });
    }
  });

  // Get client ride history
  app.get("/api/admin/clients/:id/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByClientId(req.params.id);
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Error fetching client orders:", error);
      res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
  });

  // Get driver ride history
  app.get("/api/admin/drivers/:id/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByDriverId(req.params.id);
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Error fetching driver orders:", error);
      res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
  });

  // Ban client
  app.post("/api/admin/clients/:id/ban", async (req, res) => {
    try {
      const { reason } = req.body as { reason: string };
      const client = await storage.banClient(req.params.id, reason || "Banned by admin");
      if (!client) {
        return res.status(404).json({ success: false, error: "Client not found" });
      }
      res.json({ success: true, client });
    } catch (error) {
      console.error("Error banning client:", error);
      res.status(500).json({ success: false, error: "Failed to ban client" });
    }
  });

  // Unban client
  app.post("/api/admin/clients/:id/unban", async (req, res) => {
    try {
      const client = await storage.unbanClient(req.params.id);
      if (!client) {
        return res.status(404).json({ success: false, error: "Client not found" });
      }
      res.json({ success: true, client });
    } catch (error) {
      console.error("Error unbanning client:", error);
      res.status(500).json({ success: false, error: "Failed to unban client" });
    }
  });

  // Ban driver
  app.post("/api/admin/drivers/:id/ban", async (req, res) => {
    try {
      const { reason } = req.body as { reason: string };
      const driver = await storage.banDriver(req.params.id, reason || "Banned by admin");
      if (!driver) {
        return res.status(404).json({ success: false, error: "Driver not found" });
      }
      res.json({ success: true, driver });
    } catch (error) {
      console.error("Error banning driver:", error);
      res.status(500).json({ success: false, error: "Failed to ban driver" });
    }
  });

  // Unban driver
  app.post("/api/admin/drivers/:id/unban", async (req, res) => {
    try {
      const driver = await storage.unbanDriver(req.params.id);
      if (!driver) {
        return res.status(404).json({ success: false, error: "Driver not found" });
      }
      res.json({ success: true, driver });
    } catch (error) {
      console.error("Error unbanning driver:", error);
      res.status(500).json({ success: false, error: "Failed to unban driver" });
    }
  });

  // Get all orders for admin
  app.get("/api/admin/orders", async (_req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
  });

  // Get app settings
  app.get("/api/admin/settings", async (_req, res) => {
    try {
      const settings = await storage.getAppSettings();
      const settingsObj: Record<string, string> = {};
      settings.forEach(s => {
        settingsObj[s.settingKey] = s.settingValue;
      });
      // Replace the full base64 logo with just a URL indicator so the JSON stays small
      if (settingsObj.appLogo && settingsObj.appLogo.startsWith("data:")) {
        settingsObj.appLogo = "/api/admin/logo";
      }
      res.json({ success: true, settings: settingsObj });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ success: false, error: "Failed to fetch settings" });
    }
  });

  // Serve the app logo as a proper binary image (avoids embedding 1MB+ base64 in settings JSON)
  app.get("/api/admin/logo", async (_req, res) => {
    try {
      const settings = await storage.getAppSettings();
      const logoSetting = settings.find(s => s.settingKey === "appLogo");
      if (!logoSetting || !logoSetting.settingValue || !logoSetting.settingValue.startsWith("data:")) {
        return res.status(404).json({ error: "No logo configured" });
      }
      const dataUri = logoSetting.settingValue;
      const mimeMatch = dataUri.match(/^data:([^;]+);base64,/);
      if (!mimeMatch) return res.status(400).json({ error: "Invalid logo format" });
      const mimeType = mimeMatch[1];
      const base64Data = dataUri.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (error) {
      console.error("Error serving logo:", error);
      res.status(500).json({ error: "Failed to serve logo" });
    }
  });

  // Save app settings
  app.post("/api/admin/settings", async (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, error: "Invalid settings data" });
      }
      // If appLogo is just the placeholder URL path (not a real base64), remove it so
      // we don't overwrite the actual stored logo
      if (settings.appLogo && typeof settings.appLogo === 'string' && !settings.appLogo.startsWith('data:')) {
        delete settings.appLogo;
      }
      await storage.saveAllAppSettings(settings);
      res.json({ success: true, message: "Settings saved successfully" });
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ success: false, error: "Failed to save settings" });
    }
  });

  app.post("/api/location/update", async (req, res) => {
    try {
      const { userId, requestId, location, timestamp } = req.body as LocationUpdate;
      if (!userId || !requestId || !location) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      locationStore.set(requestId, { userId, requestId, location, timestamp });
      
      await storage.updateDriverLocation({
        driverId: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        isAvailable: true,
      });

      broadcastToClients({ type: "LOCATION_UPDATE", userId, requestId, location, timestamp });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ success: false, error: "Failed to update location" });
    }
  });

  app.get("/api/location/:requestId", async (req, res) => {
    try {
      const locationData = locationStore.get(req.params.requestId);
      if (!locationData) {
        return res.json({ success: true, location: null });
      }
      res.json({ success: true, location: locationData.location, timestamp: locationData.timestamp });
    } catch (error) {
      console.error("Error getting location:", error);
      res.status(500).json({ success: false, error: "Failed to get location" });
    }
  });

  app.get("/api/drivers/nearby", async (req, res) => {
    try {
      const { lat, lng, radius = 10 } = req.query;
      
      const nearbyDrivers = await storage.getNearbyDrivers(
        lat ? parseFloat(lat as string) : undefined,
        lng ? parseFloat(lng as string) : undefined,
        parseFloat(radius as string)
      );

      const formattedDrivers = nearbyDrivers.map(driver => ({
        id: driver.driverId,
        name: driver.name || "Driver",
        vehicleType: driver.vehicleType || "van",
        location: {
          latitude: driver.latitude,
          longitude: driver.longitude,
        },
        isAvailable: driver.isAvailable,
        rating: driver.rating || 0,
      }));

      res.json({ success: true, drivers: formattedDrivers });
    } catch (error) {
      console.error("Error getting nearby drivers:", error);
      res.status(500).json({ success: false, error: "Failed to get nearby drivers" });
    }
  });

  app.post("/api/drivers/location", async (req, res) => {
    try {
      const { driverId, name, vehicleType, location, isAvailable, rating } = req.body;
      if (!driverId || !location) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      await storage.updateDriverLocation({
        driverId,
        name,
        vehicleType,
        latitude: location.latitude,
        longitude: location.longitude,
        isAvailable,
        rating,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating driver location:", error);
      res.status(500).json({ success: false, error: "Failed to update driver location" });
    }
  });

  app.get("/api/messages/:requestId", async (req, res) => {
    try {
      const msgType = req.query.type as string | undefined;
      const msgs = await storage.getMessagesByRequestId(req.params.requestId, msgType);
      res.json({ success: true, messages: msgs });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ success: false, error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { requestId, senderId, senderName, senderType, senderProfilePicture, text, messageType } = req.body;
      if (!requestId || !senderId || !text) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const isSupport = messageType === "support";

      const message = await storage.createMessage({
        requestId,
        senderId,
        senderName: senderName || "User",
        text,
        isRead: false,
        messageType: isSupport ? "support" : "direct",
        senderRole: senderType || "client",
      });

      const chatMessage = {
        type: isSupport ? "NEW_SUPPORT_MESSAGE" : "NEW_CHAT_MESSAGE",
        message: {
          ...message,
          timestamp: message.createdAt?.toISOString(),
          senderAvatarUrl: senderProfilePicture || null,
        },
      };

      if (isSupport) {
        // Support messages → send to all admin WebSocket connections + back to sender
        sendToUser(senderId, chatMessage);
        broadcastToRole("admin" as any, chatMessage);
      } else {
        // Direct messages → client & driver only
        const order = await storage.getOrderById(requestId);
        if (order) {
          if (order.clientId) sendToUser(order.clientId, chatMessage);
          if (order.driverId) sendToUser(order.driverId, chatMessage);

          try {
            let recipientId: string | null = null;
            let recipientType: 'client' | 'driver' = 'client';
            if (senderType === 'client' && order.driverId) {
              recipientId = order.driverId;
              recipientType = 'driver';
            } else if (senderType === 'driver' && order.clientId) {
              recipientId = order.clientId;
              recipientType = 'client';
            }
            if (recipientId) {
              await notifications.notifyChatMessage(
                recipientId, recipientType, senderName || "User",
                senderProfilePicture || null, text, requestId
              );
            }
          } catch (notifError) {
            console.log("Failed to send message notification:", notifError);
          }
        }
      }

      res.json({ success: true, message });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ success: false, error: "Failed to send message" });
    }
  });

  // ── Support Conversations (Admin) ────────────────────────────────────────
  app.get("/api/support/conversations", async (req, res) => {
    try {
      const conversations = await storage.getSupportConversations();
      // Enrich with order info
      const enriched = await Promise.all(
        conversations.map(async (conv) => {
          try {
            const order = await storage.getOrderById(conv.requestId);
            return {
              ...conv,
              clientName: order?.clientName || null,
              driverName: order?.driverName || null,
              orderStatus: order?.status || null,
            };
          } catch {
            return conv;
          }
        })
      );
      res.json({ success: true, conversations: enriched });
    } catch (error) {
      console.error("Error fetching support conversations:", error);
      res.status(500).json({ success: false, error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/support/reply", async (req, res) => {
    try {
      const { requestId, text, adminName } = req.body;
      if (!requestId || !text) {
        return res.status(400).json({ success: false, error: "Missing fields" });
      }

      const message = await storage.createMessage({
        requestId,
        senderId: "admin",
        senderName: adminName || "Support Fayage",
        text,
        isRead: false,
        messageType: "support",
        senderRole: "admin",
      });

      const chatMessage = {
        type: "NEW_SUPPORT_MESSAGE",
        message: {
          ...message,
          timestamp: message.createdAt?.toISOString(),
        },
      };

      // Get order to notify the right user (client or driver who initiated)
      const order = await storage.getOrderById(requestId);
      if (order) {
        if (order.clientId) sendToUser(order.clientId, chatMessage);
        if (order.driverId) sendToUser(order.driverId, chatMessage);
      }
      // Also notify all admins (so the admin panel refreshes)
      broadcastToRole("admin" as any, chatMessage);

      res.json({ success: true, message });
    } catch (error) {
      console.error("Error sending support reply:", error);
      res.status(500).json({ success: false, error: "Failed to send reply" });
    }
  });

  // Mark support messages as read
  app.post("/api/support/read/:requestId", async (req, res) => {
    try {
      await storage.markMessagesAsRead(req.params.requestId, "admin");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to mark as read" });
    }
  });

  app.get("/api/messages/:requestId/unread/:userId", async (req, res) => {
    try {
      const msgType = req.query.type as string | undefined;
      const count = await storage.getUnreadMessageCount(req.params.requestId, req.params.userId, msgType);
      res.json({ success: true, count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ success: false, error: "Failed to get unread count" });
    }
  });

  app.post("/api/messages/:requestId/read/:userId", async (req, res) => {
    try {
      await storage.markMessagesAsRead(req.params.requestId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ success: false, error: "Failed to mark messages as read" });
    }
  });

  app.get("/api/conversations/:userId/:userType", async (req, res) => {
    try {
      const { userId, userType } = req.params;
      if (!userId || !userType || (userType !== "client" && userType !== "driver")) {
        return res.status(400).json({ success: false, error: "Invalid parameters" });
      }
      const conversations = await storage.getUserConversations(userId, userType as "client" | "driver");
      res.json({ success: true, conversations });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ success: false, error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/eta/:requestId", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.requestId);
      if (!order || !order.driverId) {
        return res.status(404).json({ success: false, error: "Order or driver not found" });
      }

      const driverLocation = await storage.getDriverLocation(order.driverId);
      if (!driverLocation) {
        return res.json({ success: true, eta: null, message: "Driver location not available" });
      }

      let destinationCoords: { latitude: number; longitude: number } | null = null;
      
      if (order.status === "accepted" || order.status === "pickup") {
        destinationCoords = order.pickupCoords as { latitude: number; longitude: number } | null;
      } else if (order.status === "in_transit") {
        destinationCoords = order.deliveryCoords as { latitude: number; longitude: number } | null;
      }

      if (!destinationCoords) {
        return res.json({ success: true, eta: null, message: "Destination not set" });
      }

      const R = 6371;
      const dLat = (destinationCoords.latitude - driverLocation.latitude) * Math.PI / 180;
      const dLon = (destinationCoords.longitude - driverLocation.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(driverLocation.latitude * Math.PI / 180) * 
                Math.cos(destinationCoords.latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceKm = R * c;
      
      const avgSpeedKmh = 30;
      const etaMinutes = Math.ceil((distanceKm / avgSpeedKmh) * 60);
      
      const arrivalTime = new Date(Date.now() + etaMinutes * 60 * 1000);

      res.json({
        success: true,
        eta: {
          minutes: etaMinutes,
          arrivalTime: arrivalTime.toISOString(),
          distanceKm: Math.round(distanceKm * 10) / 10,
          driverLocation: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          destination: destinationCoords,
          status: order.status,
        },
      });
    } catch (error) {
      console.error("Error calculating ETA:", error);
      res.status(500).json({ success: false, error: "Failed to calculate ETA" });
    }
  });

  // Push Token routes
  app.post("/api/push-tokens", async (req, res) => {
    try {
      const { userId, userType, token, platform } = req.body;
      if (!userId || !userType || !token) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      const pushToken = await storage.savePushToken(userId, userType, token, platform);
      res.json({ success: true, pushToken });
    } catch (error) {
      console.error("Error saving push token:", error);
      res.status(500).json({ success: false, error: "Failed to save push token" });
    }
  });

  app.delete("/api/push-tokens/:userId/:userType", async (req, res) => {
    try {
      await storage.deletePushToken(req.params.userId, req.params.userType);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push token:", error);
      res.status(500).json({ success: false, error: "Failed to delete push token" });
    }
  });

  // ─── Withdrawal Requests ─────────────────────────────────────────────────────

  // Driver creates a withdrawal request
  app.post("/api/withdrawal-requests", async (req, res) => {
    try {
      const { driverId, driverName, driverPhone, receiverPhone, paymentMethod } = req.body;
      if (!driverId || !receiverPhone) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      const hasPending = await storage.hasPendingWithdrawal(driverId);
      if (hasPending) {
        return res.status(400).json({ success: false, error: "Vous avez déjà une demande de retrait en attente" });
      }
      const wallet = await storage.getDriverWallet(driverId);
      const amount = wallet?.balance || 0;
      if (amount <= 0) {
        return res.status(400).json({ success: false, error: "Solde insuffisant pour effectuer un retrait" });
      }
      const request = await storage.createWithdrawalRequest({
        driverId,
        driverName: driverName || "Chauffeur",
        driverPhone: driverPhone || "",
        amount,
        receiverPhone,
        paymentMethod: paymentMethod || "wafacash",
        status: "pending",
      });
      sendToUser(driverId, { type: "WITHDRAWAL_CREATED", request, message: `Demande de retrait de ${amount} MAD créée avec succès.` });
      res.json({ success: true, request });
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      res.status(500).json({ success: false, error: "Failed to create withdrawal request" });
    }
  });

  // Driver views their own withdrawal requests
  app.get("/api/withdrawal-requests/driver/:driverId", async (req, res) => {
    try {
      const requests = await storage.getWithdrawalRequestsByDriver(req.params.driverId);
      res.json({ success: true, requests });
    } catch (error) {
      console.error("Error fetching driver withdrawal requests:", error);
      res.status(500).json({ success: false, error: "Failed to fetch requests" });
    }
  });

  // Driver confirms receipt of payment
  app.put("/api/withdrawal-requests/:id/confirm", async (req, res) => {
    try {
      const wr = await storage.getWithdrawalRequestById(req.params.id);
      if (!wr) return res.status(404).json({ success: false, error: "Request not found" });
      if (wr.status !== "sent") return res.status(400).json({ success: false, error: "Payment not yet sent by admin" });
      await storage.debitDriverWallet(wr.driverId, wr.amount);
      const updated = await storage.updateWithdrawalRequest(req.params.id, {
        status: "confirmed",
        confirmedAt: new Date(),
      });
      sendToUser(wr.driverId, { type: "WITHDRAWAL_CONFIRMED", request: updated, message: `Retrait de ${wr.amount} MAD confirmé. Votre solde a été mis à jour.` });
      res.json({ success: true, request: updated });
    } catch (error) {
      console.error("Error confirming withdrawal:", error);
      res.status(500).json({ success: false, error: "Failed to confirm withdrawal" });
    }
  });

  // Admin gets all withdrawal requests
  app.get("/api/admin/withdrawal-requests", async (_req, res) => {
    try {
      const requests = await storage.getAllWithdrawalRequests();
      res.json({ success: true, requests });
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      res.status(500).json({ success: false, error: "Failed to fetch requests" });
    }
  });

  // Admin sends payment code to driver
  app.put("/api/admin/withdrawal-requests/:id/send", async (req, res) => {
    try {
      const { paymentCode, adminNote } = req.body;
      if (!paymentCode) return res.status(400).json({ success: false, error: "Payment code required" });
      const wr = await storage.getWithdrawalRequestById(req.params.id);
      if (!wr) return res.status(404).json({ success: false, error: "Request not found" });
      if (wr.status !== "pending") return res.status(400).json({ success: false, error: "Request already processed" });
      const updated = await storage.updateWithdrawalRequest(req.params.id, {
        status: "sent",
        paymentCode,
        adminNote: adminNote || null,
        sentAt: new Date(),
      });
      sendToUser(wr.driverId, {
        type: "WITHDRAWAL_SENT",
        request: updated,
        message: `💰 Votre retrait de ${wr.amount} MAD a été envoyé! Code: ${paymentCode}. Confirmez la réception dans l'app.`,
      });
      res.json({ success: true, request: updated });
    } catch (error) {
      console.error("Error sending withdrawal code:", error);
      res.status(500).json({ success: false, error: "Failed to send payment code" });
    }
  });

  // Admin rejects withdrawal request
  app.put("/api/admin/withdrawal-requests/:id/reject", async (req, res) => {
    try {
      const { adminNote } = req.body;
      const wr = await storage.getWithdrawalRequestById(req.params.id);
      if (!wr) return res.status(404).json({ success: false, error: "Request not found" });
      const updated = await storage.updateWithdrawalRequest(req.params.id, {
        status: "rejected",
        adminNote: adminNote || "Demande refusée par l'administrateur",
      });
      sendToUser(wr.driverId, {
        type: "WITHDRAWAL_REJECTED",
        request: updated,
        message: `Votre demande de retrait de ${wr.amount} MAD a été refusée. ${adminNote || ""}`,
      });
      res.json({ success: true, request: updated });
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      res.status(500).json({ success: false, error: "Failed to reject withdrawal" });
    }
  });

  // Announcements routes
  app.get("/api/announcements", async (_req, res) => {
    try {
      const allAnnouncements = await storage.getAllAnnouncements();
      res.json({ success: true, announcements: allAnnouncements });
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ success: false, error: "Failed to fetch announcements" });
    }
  });

  app.get("/api/announcements/active", async (req, res) => {
    try {
      const { audience } = req.query;
      const activeAnnouncements = await storage.getActiveAnnouncements(audience as string);
      res.json({ success: true, announcements: activeAnnouncements });
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      res.status(500).json({ success: false, error: "Failed to fetch active announcements" });
    }
  });

  app.get("/api/announcements/:id", async (req, res) => {
    try {
      const announcement = await storage.getAnnouncementById(req.params.id);
      if (!announcement) {
        return res.status(404).json({ success: false, error: "Announcement not found" });
      }
      res.json({ success: true, announcement });
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ success: false, error: "Failed to fetch announcement" });
    }
  });

  app.post("/api/announcements", async (req, res) => {
    try {
      const { title, message, type, targetAudience, isActive, expiresAt, createdBy } = req.body;
      if (!title || !message) {
        return res.status(400).json({ success: false, error: "Title and message are required" });
      }
      const announcement = await storage.createAnnouncement({
        title,
        message,
        type: type || "info",
        targetAudience: targetAudience || "all",
        isActive: isActive !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: createdBy || null,
      });
      
      // Broadcast new announcement via WebSocket
      broadcastToClients({ type: "new_announcement", announcement });
      
      res.json({ success: true, announcement });
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ success: false, error: "Failed to create announcement" });
    }
  });

  app.put("/api/announcements/:id", async (req, res) => {
    try {
      const { title, message, type, targetAudience, isActive, expiresAt } = req.body;
      const announcement = await storage.updateAnnouncement(req.params.id, {
        title,
        message,
        type,
        targetAudience,
        isActive,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      if (!announcement) {
        return res.status(404).json({ success: false, error: "Announcement not found" });
      }
      
      // Broadcast updated announcement via WebSocket
      broadcastToClients({ type: "announcement_updated", announcement });
      
      res.json({ success: true, announcement });
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ success: false, error: "Failed to update announcement" });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAnnouncement(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: "Announcement not found" });
      }
      
      // Broadcast announcement deletion via WebSocket
      broadcastToClients({ type: "announcement_deleted", announcementId: req.params.id });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ success: false, error: "Failed to delete announcement" });
    }
  });

  // Favorite Drivers routes
  app.get("/api/clients/:clientId/favorites", async (req, res) => {
    try {
      const favorites = await storage.getFavoriteDrivers(req.params.clientId);
      res.json({ success: true, favorites });
    } catch (error) {
      console.error("Error fetching favorite drivers:", error);
      res.status(500).json({ success: false, error: "Failed to fetch favorite drivers" });
    }
  });

  app.post("/api/clients/:clientId/favorites", async (req, res) => {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ success: false, error: "Missing driverId" });
      }
      const favorite = await storage.addFavoriteDriver(req.params.clientId, driverId);
      res.json({ success: true, favorite });
    } catch (error) {
      console.error("Error adding favorite driver:", error);
      res.status(500).json({ success: false, error: "Failed to add favorite driver" });
    }
  });

  app.delete("/api/clients/:clientId/favorites/:driverId", async (req, res) => {
    try {
      await storage.removeFavoriteDriver(req.params.clientId, req.params.driverId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing favorite driver:", error);
      res.status(500).json({ success: false, error: "Failed to remove favorite driver" });
    }
  });

  app.get("/api/clients/:clientId/favorites/:driverId/check", async (req, res) => {
    try {
      const isFavorite = await storage.isFavoriteDriver(req.params.clientId, req.params.driverId);
      res.json({ success: true, isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ success: false, error: "Failed to check favorite status" });
    }
  });

  // Scheduled orders route
  app.get("/api/orders/scheduled", async (req, res) => {
    try {
      const orders = await storage.getScheduledOrders();
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Error fetching scheduled orders:", error);
      res.status(500).json({ success: false, error: "Failed to fetch scheduled orders" });
    }
  });

  // Referral routes
  app.get("/api/referrals/:userId/:userType/code", async (req, res) => {
    try {
      const { userId, userType } = req.params;
      if (!["client", "driver"].includes(userType)) {
        return res.status(400).json({ success: false, error: "Invalid user type" });
      }
      const code = await storage.generateUserReferralCode(userId, userType as "client" | "driver");
      res.json({ success: true, referralCode: code });
    } catch (error) {
      console.error("Error generating referral code:", error);
      res.status(500).json({ success: false, error: "Failed to generate referral code" });
    }
  });

  app.get("/api/referrals/:userId/:userType/stats", async (req, res) => {
    try {
      const { userId, userType } = req.params;
      if (!["client", "driver"].includes(userType)) {
        return res.status(400).json({ success: false, error: "Invalid user type" });
      }
      const stats = await storage.getReferralStats(userId, userType as "client" | "driver");
      res.json({ success: true, stats });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch referral stats" });
    }
  });

  app.get("/api/referrals/:userId/:userType/history", async (req, res) => {
    try {
      const { userId, userType } = req.params;
      if (!["client", "driver"].includes(userType)) {
        return res.status(400).json({ success: false, error: "Invalid user type" });
      }
      const referrals = await storage.getUserReferrals(userId, userType as "client" | "driver");
      res.json({ success: true, referrals });
    } catch (error) {
      console.error("Error fetching referral history:", error);
      res.status(500).json({ success: false, error: "Failed to fetch referral history" });
    }
  });

  app.post("/api/referrals/validate", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, error: "Referral code is required" });
      }
      const referrer = await storage.getUserByReferralCode(code);
      if (!referrer) {
        return res.json({ success: false, valid: false, error: "Invalid referral code" });
      }
      res.json({ 
        success: true, 
        valid: true,
        referrerName: referrer.user.fullName,
        referrerType: referrer.userType
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ success: false, error: "Failed to validate referral code" });
    }
  });

  app.post("/api/referrals/apply", async (req, res) => {
    try {
      const { referredId, referredType, referralCode } = req.body;
      if (!referredId || !referredType || !referralCode) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      if (!["client", "driver"].includes(referredType)) {
        return res.status(400).json({ success: false, error: "Invalid user type" });
      }
      const referral = await storage.applyReferralCode(referredId, referredType as "client" | "driver", referralCode);
      if (!referral) {
        return res.json({ success: false, error: "Invalid or already used referral code" });
      }
      res.json({ success: true, referral });
    } catch (error) {
      console.error("Error applying referral code:", error);
      res.status(500).json({ success: false, error: "Failed to apply referral code" });
    }
  });

  app.post("/api/referrals/complete", async (req, res) => {
    try {
      const { referredId, referredType } = req.body;
      if (!referredId || !referredType) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      if (!["client", "driver"].includes(referredType)) {
        return res.status(400).json({ success: false, error: "Invalid user type" });
      }
      const completed = await storage.completeReferral(referredId, referredType as "client" | "driver");
      res.json({ success: true, completed });
    } catch (error) {
      console.error("Error completing referral:", error);
      res.status(500).json({ success: false, error: "Failed to complete referral" });
    }
  });

  const httpServer = createServer(app);

  // Use noServer mode so we can accept WebSocket connections on multiple paths:
  // - /ws  (direct server access, local dev)
  // - /api/ws (Replit proxy strips /api prefix before forwarding, but /api/ws also works)
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = request.url?.split("?")[0] ?? "";
    if (pathname === "/ws" || pathname === "/api/ws") {
      wss.handleUpgrade(request, socket as any, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });
  
  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");
    const connection: ClientConnection = { ws };
    wsClients.set(ws, connection);
    
    ws.on("message", async (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());
        console.log("WebSocket message received:", data.type);
        
        if (data.type === "REGISTER_USER") {
          const conn = wsClients.get(ws);
          if (conn) {
            conn.userId = data.userId;
            conn.userRole = data.role;
            console.log(`User registered: ${data.userId} as ${data.role}`);
          }
          ws.send(JSON.stringify({ type: "USER_REGISTERED", userId: data.userId, role: data.role }));
        }
        
        if (data.type === "SUBSCRIBE_ORDERS") {
          ws.send(JSON.stringify({ type: "SUBSCRIBED", channel: "orders" }));
        }
        
        // ── Voice call signaling ────────────────────────────────────────────
        if (data.type === "CALL_REQUEST") {
          // Caller → callee: incoming call notification
          const { calleeId, callerId, callerName, channelName, token: callToken, requestId: callRequestId } = data;
          if (calleeId) {
            sendToUser(calleeId, {
              type: "INCOMING_CALL",
              callerId,
              callerName,
              channelName,
              token: callToken,
              requestId: callRequestId,
            });
          }
        }

        if (data.type === "CALL_ACCEPTED") {
          const { callerId, channelName: ch } = data;
          if (callerId) {
            sendToUser(callerId, { type: "CALL_ACCEPTED", channelName: ch });
          }
        }

        if (data.type === "CALL_REJECTED") {
          const { callerId, channelName: ch } = data;
          if (callerId) {
            sendToUser(callerId, { type: "CALL_REJECTED", channelName: ch });
          }
        }

        if (data.type === "CALL_ENDED") {
          const { channelName: ch, requestId: callReqId } = data;
          // Notify both parties: look up the order
          try {
            if (callReqId) {
              const order = await storage.getOrderById(callReqId);
              if (order?.clientId) sendToUser(order.clientId, { type: "CALL_ENDED", channelName: ch });
              if (order?.driverId) sendToUser(order.driverId, { type: "CALL_ENDED", channelName: ch });
            }
          } catch {}
        }

        if (data.type === "CHAT_MESSAGE") {
          const isSupport = data.messageType === "support";
          const newMessage = await storage.createMessage({
            requestId: data.requestId,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text,
            isRead: false,
            messageType: isSupport ? "support" : "direct",
            senderRole: data.senderType || "client",
          });

          const chatMessage = {
            type: isSupport ? "NEW_SUPPORT_MESSAGE" : "NEW_CHAT_MESSAGE",
            message: {
              ...newMessage,
              timestamp: newMessage.createdAt?.toISOString(),
              senderAvatarUrl: data.senderProfilePicture || null,
            },
          };

          if (isSupport) {
            // Support → send to sender + all admin connections
            sendToUser(data.senderId, chatMessage);
            broadcastToRole("admin" as any, chatMessage);
          } else {
            // Direct → client & driver only
            const order = await storage.getOrderById(data.requestId);
            if (order) {
              if (order.clientId) sendToUser(order.clientId, chatMessage);
              if (order.driverId) sendToUser(order.driverId, chatMessage);
            }

            try {
              if (order) {
                let recipientId: string | null = null;
                let recipientType: 'client' | 'driver' = 'client';
                if (data.senderType === 'client' && order.driverId) {
                  recipientId = order.driverId;
                  recipientType = 'driver';
                } else if (data.senderType === 'driver' && order.clientId) {
                  recipientId = order.clientId;
                  recipientType = 'client';
                }
                if (recipientId) {
                  await notifications.notifyChatMessage(
                    recipientId, recipientType, data.senderName || "User",
                    data.senderProfilePicture || null, data.text, data.requestId
                  );
                }
              }
            } catch (notifError) {
              console.log("Failed to send message notification:", notifError);
            }
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      wsClients.delete(ws);
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      wsClients.delete(ws);
    });
  });

  // ── Voice call token endpoint (Agora removed) ─────────────────────────────
  app.post("/api/agora/token", async (req, res) => {
    return res.status(503).json({ error: "Voice call feature not configured" });
  });

  const aiDevBypass = process.env.NODE_ENV === "development"
    && !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
    && !process.env.AI_INTEGRATIONS_GEMINI_API_KEY
    && !process.env.GOOGLE_AI_API_KEY;

  app.post("/api/ai/verify-cin", async (req, res) => {
    try {
      const { cinFrontBase64, enteredCinNumber, mimeType } = req.body;
      if (!cinFrontBase64) {
        return res.status(400).json({ error: "cinFrontBase64 is required" });
      }
      if (aiDevBypass) {
        console.log("[DEV] AI verify-cin bypassed");
        return res.json({ success: true, result: { cinNumberMatch: true, cinNumberExtracted: enteredCinNumber || "A123456", expired: false, expiryDate: "01/01/2030", dateOfBirth: "01/01/1990", underAge: false, warnings: [] } });
      }
      const result = await verifyCINDocuments({ cinFrontBase64, enteredCinNumber, mimeType });
      return res.json({ success: true, result });
    } catch (error) {
      console.error("AI verify-cin error:", error);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/ai/verify-license-front", async (req, res) => {
    try {
      const { imageBase64, cinNumberFromCard, mimeType } = req.body;
      if (!imageBase64 || !cinNumberFromCard) {
        return res.status(400).json({ error: "imageBase64 and cinNumberFromCard are required" });
      }
      if (aiDevBypass) {
        console.log("[DEV] AI verify-license-front bypassed");
        return res.json({ success: true, result: { cinNumberExtracted: cinNumberFromCard, cinNumberMatch: true, warnings: [] } });
      }
      const result = await verifyLicenseFront({ imageBase64, cinNumberFromCard, mimeType });
      return res.json({ success: true, result });
    } catch (error) {
      console.error("AI verify-license-front error:", error);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/ai/verify-license-back", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }
      if (aiDevBypass) {
        console.log("[DEV] AI verify-license-back bypassed");
        return res.json({ success: true, result: { expiryDate: "01/01/2030", expired: false, warnings: [] } });
      }
      const result = await verifyLicenseBack({ imageBase64, mimeType });
      return res.json({ success: true, result });
    } catch (error) {
      console.error("AI verify-license-back error:", error);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/ai/verify-carte-grise", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }
      if (aiDevBypass) {
        console.log("[DEV] AI verify-carte-grise bypassed");
        return res.json({ success: true, result: { expiryDate: "01/01/2030", expired: false, warnings: [] } });
      }
      const result = await verifyCarteGrise({ imageBase64, mimeType });
      return res.json({ success: true, result });
    } catch (error) {
      console.error("AI verify-carte-grise error:", error);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/drivers/:id/ai-verify", async (req, res) => {
    try {
      const driver = await storage.getDriverById(req.params.id);
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      const docs = driver.documents as Record<string, string> | null;
      if (!docs?.cinFront) {
        return res.status(400).json({ error: "No CIN document found" });
      }

      const readImageAsBase64 = (uri: string): string => {
        if (uri.startsWith("data:")) {
          return uri.split(",")[1];
        }
        if (uri.startsWith("/") || uri.startsWith("file://")) {
          try {
            const filePath = uri.replace("file://", "");
            return fs.readFileSync(filePath).toString("base64");
          } catch { return ""; }
        }
        return uri;
      };

      const result = await verifyCINDocuments({
        cinFrontBase64: readImageAsBase64(docs.cinFront),
        enteredCinNumber: driver.nationalId || undefined,
      });

      return res.json({ success: true, result });
    } catch (error) {
      console.error("AI driver verify error:", error);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  // ─── Auto-complete delivered orders after 24 hours ────────────────────────
  const AUTO_COMPLETE_MS = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const deliveredOrders = await storage.getOrders({ status: "delivered" });
      const now = Date.now();
      for (const order of deliveredOrders) {
        // Skip if client already confirmed
        if ((order as any).completedAt) continue;
        const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).getTime() : 0;
        if (deliveredAt && now - deliveredAt >= AUTO_COMPLETE_MS) {
          const updated = await storage.updateOrder(order.id, {
            completedAt: new Date(),
          } as any);
          broadcastToClients({ type: "ORDER_UPDATED", order: updated });
          if (order.driverId) {
            // Credit driver wallet on auto-confirm after 24h
            const payment = await storage.getPaymentByOrderId(order.id);
            if (payment && payment.status === "accepted") {
              await storage.creditDriverWallet(order.driverId, payment.driverEarning, payment.commissionAmount);
            }
            sendToUser(order.driverId, { type: "DELIVERY_CONFIRMED", order: updated, message: "Livraison confirmée automatiquement après 24h. Gains crédités." });
          }
          console.log(`Auto-confirmed order ${order.id}`);
        }
      }
    } catch (err) {
      console.error("Auto-complete cron error:", err);
    }
  }, 60 * 60 * 1000); // check every hour

  return httpServer;
}
