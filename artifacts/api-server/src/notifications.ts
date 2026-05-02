import { Expo } from 'expo-server-sdk';
import * as storage from './storage';

const expo = new Expo();

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
}

export async function sendPushNotification(
  userId: string,
  userType: 'client' | 'driver',
  notification: NotificationData
): Promise<boolean> {
  try {
    const tokenRecord = await storage.getPushToken(userId, userType);
    if (!tokenRecord) {
      console.log(`No push token found for ${userType} ${userId}`);
      return false;
    }

    const { token } = tokenRecord;
    
    if (!Expo.isExpoPushToken(token)) {
      console.log(`Invalid Expo push token: ${token}`);
      return false;
    }

    const messages = [{
      to: token,
      sound: 'default' as const,
      title: notification.title,
      body: notification.body,
      data: {
        ...(notification.data || {}),
        ...(notification.image ? { image: notification.image } : {}),
      },
    }];

    const chunks = expo.chunkPushNotifications(messages);
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Push notification sent:', ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

export async function sendNotificationToAllDrivers(notification: NotificationData): Promise<void> {
  try {
    const driverTokens = await storage.getAllDriverPushTokens();
    
    const validTokens = driverTokens.filter(t => Expo.isExpoPushToken(t.token));
    
    if (validTokens.length === 0) {
      console.log('No valid driver push tokens found');
      return;
    }

    const messages = validTokens.map(t => ({
      to: t.token,
      sound: 'default' as const,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
    }));

    const chunks = expo.chunkPushNotifications(messages);
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Push notifications sent to drivers:', ticketChunk.length);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }
  } catch (error) {
    console.error('Error sending notifications to all drivers:', error);
  }
}

export async function notifyNewOrder(order: any): Promise<void> {
  const notification = {
    title: 'Nouvelle commande disponible',
    body: `Transport de ${order.pickupAddress} vers ${order.deliveryAddress}`,
    data: { 
      type: 'NEW_ORDER',
      orderId: order.id 
    },
  };

  if (order.preferredDriverId) {
    await sendPushNotification(order.preferredDriverId, 'driver', {
      title: 'Un client vous a demandé',
      body: `${order.clientName} vous a demandé pour un transport`,
      data: { type: 'PREFERRED_DRIVER_REQUEST', orderId: order.id },
    });
  }

  await sendNotificationToAllDrivers(notification);
}

export async function notifyOrderStatusChange(
  order: any,
  newStatus: string
): Promise<void> {
  const statusMessages: Record<string, { clientTitle: string; clientBody: string; driverTitle?: string; driverBody?: string }> = {
    'awaiting_client_approval': {
      clientTitle: 'Un chauffeur a proposé',
      clientBody: 'Un chauffeur a fait une offre pour votre commande',
    },
    'accepted': {
      clientTitle: 'Commande acceptée',
      clientBody: `${order.driverName || 'Un chauffeur'} a été assigné à votre commande`,
      driverTitle: 'Commande confirmée',
      driverBody: 'Le client a accepté votre offre',
    },
    'pickup': {
      clientTitle: 'Chauffeur en route',
      clientBody: 'Le chauffeur est en route vers le point de ramassage',
    },
    'in_transit': {
      clientTitle: 'Livraison en cours',
      clientBody: 'Vos marchandises sont en route',
    },
    'delivered': {
      clientTitle: 'Livraison effectuée',
      clientBody: 'Votre commande a été livrée avec succès',
      driverTitle: 'Livraison terminée',
      driverBody: 'La livraison a été marquée comme terminée',
    },
    'cancelled': {
      clientTitle: 'Commande annulée',
      clientBody: 'Votre commande a été annulée',
      driverTitle: 'Commande annulée',
      driverBody: 'La commande a été annulée par le client',
    },
  };

  const statusConfig = statusMessages[newStatus];
  if (!statusConfig) return;

  if (order.clientId) {
    await sendPushNotification(order.clientId, 'client', {
      title: statusConfig.clientTitle,
      body: statusConfig.clientBody,
      data: { type: 'ORDER_STATUS_CHANGE', orderId: order.id, status: newStatus },
    });
  }

  if (order.driverId && statusConfig.driverTitle) {
    await sendPushNotification(order.driverId, 'driver', {
      title: statusConfig.driverTitle,
      body: statusConfig.driverBody!,
      data: { type: 'ORDER_STATUS_CHANGE', orderId: order.id, status: newStatus },
    });
  }
}

export async function notifyDriverOffer(
  order: any,
  driverName: string
): Promise<void> {
  if (!order.clientId) return;

  await sendPushNotification(order.clientId, 'client', {
    title: 'Nouvelle offre',
    body: `${driverName} a proposé de prendre votre commande`,
    data: { type: 'DRIVER_OFFER', orderId: order.id },
  });
}

export async function notifyOfferAccepted(
  order: any,
  driverId: string
): Promise<void> {
  await sendPushNotification(driverId, 'driver', {
    title: 'Offre acceptée',
    body: `${order.clientName} a accepté votre offre`,
    data: { type: 'OFFER_ACCEPTED', orderId: order.id },
  });
}

export async function notifyOfferRejected(
  driverId: string,
  orderId: string
): Promise<void> {
  await sendPushNotification(driverId, 'driver', {
    title: 'Offre refusée',
    body: 'Le client a choisi un autre chauffeur',
    data: { type: 'OFFER_REJECTED', orderId },
  });
}

export async function notifyChatMessage(
  recipientId: string,
  recipientType: 'client' | 'driver',
  senderName: string,
  senderProfilePicture: string | null,
  messageContent: string,
  requestId: string
): Promise<void> {
  const truncatedMessage = messageContent.length > 100 
    ? messageContent.substring(0, 100) + '...' 
    : messageContent;

  await sendPushNotification(recipientId, recipientType, {
    title: senderName,
    body: truncatedMessage,
    image: senderProfilePicture || undefined,
    data: { 
      type: 'NEW_MESSAGE',
      requestId,
      senderName,
      senderProfilePicture: senderProfilePicture || null,
    },
  });
}
