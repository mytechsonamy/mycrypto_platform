/**
 * Price Alert types for cryptocurrency price notifications
 */

import { TradingPair } from './trading.types';

// Alert condition
export enum AlertCondition {
  ABOVE = 'ABOVE',
  BELOW = 'BELOW',
}

// Notification type
export enum NotificationType {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  BOTH = 'BOTH',
}

// Alert status
export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  TRIGGERED = 'TRIGGERED',
  INACTIVE = 'INACTIVE',
}

// Price alert
export interface PriceAlert {
  id: string;
  symbol: TradingPair;
  condition: AlertCondition;
  price: number;
  notificationType: NotificationType;
  status: AlertStatus;
  createdAt: number;
  triggeredAt?: number;
}

// Triggered alert (extends PriceAlert)
export interface TriggeredAlert extends PriceAlert {
  currentPrice: number;
  triggeredAt: number;
}

// Create alert request
export interface CreateAlertRequest {
  symbol: TradingPair;
  condition: AlertCondition;
  price: number;
  notificationType: NotificationType;
  isActive: boolean;
}

// Update alert request
export interface UpdateAlertRequest {
  id: string;
  price?: number;
  condition?: AlertCondition;
  notificationType?: NotificationType;
  isActive?: boolean;
}

// Alert form data
export interface AlertFormData {
  symbol: TradingPair;
  condition: AlertCondition;
  price: string;
  notificationType: NotificationType;
  isActive: boolean;
}

// Alert validation error
export interface AlertValidationError {
  field: keyof AlertFormData;
  message: string;
}

// Alert limits
export const MAX_ACTIVE_ALERTS = 10;
export const MAX_PRICE_DEVIATION_PERCENT = 50; // Max 50% deviation from current price

// Alert trigger notification
export interface AlertTriggeredNotification {
  alertId: string;
  symbol: TradingPair;
  condition: AlertCondition;
  targetPrice: number;
  currentPrice: number;
  triggeredAt: number;
  message: string;
}

// Alert distance calculation
export interface AlertDistance {
  alertId: string;
  distancePercent: number;
  distanceAbsolute: number;
}

// Alert statistics
export interface AlertStatistics {
  totalActive: number;
  totalTriggered: number;
  totalInactive: number;
  recentTriggered: TriggeredAlert[];
}
