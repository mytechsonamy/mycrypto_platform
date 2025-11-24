/**
 * Alerts Redux Slice Tests
 */

import { configureStore } from '@reduxjs/toolkit';
import alertsReducer, {
  fetchAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  triggerAlert,
  setEditingAlert,
  clearError,
  checkAlertConditions,
  clearTriggeredHistory,
  selectAlerts,
  selectActiveAlerts,
  selectTriggeredAlerts,
  selectActiveAlertsCount,
} from './alertsSlice';
import { AlertStatus, AlertCondition, NotificationType } from '../../types/alerts.types';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      alerts: alertsReducer,
    },
    preloadedState: initialState,
  });
};

describe('alertsSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const store = createMockStore();
      const state = store.getState().alerts;

      expect(state).toEqual({
        alerts: [],
        triggeredAlerts: [],
        loading: false,
        error: null,
        editingAlertId: null,
      });
    });
  });

  describe('Reducers', () => {
    it('sets editing alert ID', () => {
      const store = createMockStore();
      store.dispatch(setEditingAlert('alert-123'));

      const state = store.getState().alerts;
      expect(state.editingAlertId).toBe('alert-123');
    });

    it('clears editing alert ID', () => {
      const store = createMockStore({
        alerts: {
          alerts: [],
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: 'alert-123',
        },
      });

      store.dispatch(setEditingAlert(null));

      const state = store.getState().alerts;
      expect(state.editingAlertId).toBeNull();
    });

    it('clears error', () => {
      const store = createMockStore({
        alerts: {
          alerts: [],
          triggeredAlerts: [],
          loading: false,
          error: 'Test error',
          editingAlertId: null,
        },
      });

      store.dispatch(clearError());

      const state = store.getState().alerts;
      expect(state.error).toBeNull();
    });

    it('clears triggered history', () => {
      const triggeredAlerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY',
          condition: AlertCondition.ABOVE,
          price: 2900000,
          currentPrice: 2905000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.TRIGGERED,
          createdAt: Date.now() - 3600000,
          triggeredAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts: [],
          triggeredAlerts,
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      store.dispatch(clearTriggeredHistory());

      const state = store.getState().alerts;
      expect(state.triggeredAlerts).toEqual([]);
    });

    it('checks alert conditions and marks for triggering', () => {
      const alerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY',
          condition: AlertCondition.ABOVE,
          price: 2900000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.ACTIVE,
          createdAt: Date.now(),
        },
        {
          id: 'alert-2',
          symbol: 'BTC_TRY',
          condition: AlertCondition.BELOW,
          price: 2800000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.ACTIVE,
          createdAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      // Price goes above 2,900,000 - should trigger alert-1
      store.dispatch(
        checkAlertConditions({
          symbol: 'BTC_TRY',
          currentPrice: 2905000,
        })
      );

      const state = store.getState().alerts;
      const triggeredAlert = state.alerts.find((a) => a.id === 'alert-1');
      expect(triggeredAlert?.status).toBe(AlertStatus.TRIGGERED);
      expect(triggeredAlert?.triggeredAt).toBeDefined();
    });

    it('does not trigger alert when condition not met', () => {
      const alerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY',
          condition: AlertCondition.ABOVE,
          price: 2900000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.ACTIVE,
          createdAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      // Price still below target - should not trigger
      store.dispatch(
        checkAlertConditions({
          symbol: 'BTC_TRY',
          currentPrice: 2850000,
        })
      );

      const state = store.getState().alerts;
      const alert = state.alerts.find((a) => a.id === 'alert-1');
      expect(alert?.status).toBe(AlertStatus.ACTIVE);
      expect(alert?.triggeredAt).toBeUndefined();
    });
  });

  describe('Async Thunks - fetchAlerts', () => {
    it('loads alerts from localStorage', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY',
          condition: AlertCondition.ABOVE,
          price: 2900000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.ACTIVE,
          createdAt: Date.now(),
        },
      ];

      localStorage.setItem('priceAlerts', JSON.stringify(mockAlerts));

      const store = createMockStore();
      await store.dispatch(fetchAlerts());

      const state = store.getState().alerts;
      expect(state.alerts).toEqual(mockAlerts);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('returns empty array when no alerts in localStorage', async () => {
      const store = createMockStore();
      await store.dispatch(fetchAlerts());

      const state = store.getState().alerts;
      expect(state.alerts).toEqual([]);
    });

    it('sets loading state during fetch', () => {
      const store = createMockStore();
      store.dispatch(fetchAlerts());

      const state = store.getState().alerts;
      expect(state.loading).toBe(true);
    });
  });

  describe('Async Thunks - createAlert', () => {
    it('creates alert successfully', async () => {
      const store = createMockStore();
      const request = {
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        isActive: true,
      };

      await store.dispatch(createAlert(request));

      const state = store.getState().alerts;
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0]).toMatchObject({
        symbol: 'BTC_TRY',
        condition: AlertCondition.ABOVE,
        price: 2900000,
        status: AlertStatus.ACTIVE,
      });
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('persists alert to localStorage', async () => {
      const store = createMockStore();
      const request = {
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        isActive: true,
      };

      await store.dispatch(createAlert(request));

      const stored = localStorage.getItem('priceAlerts');
      expect(stored).toBeTruthy();
      const alerts = JSON.parse(stored!);
      expect(alerts).toHaveLength(1);
    });

    it('rejects when max alerts limit reached', async () => {
      const existingAlerts = Array.from({ length: 10 }, (_, i) => ({
        id: `alert-${i}`,
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000 + i * 1000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      }));

      const store = createMockStore({
        alerts: {
          alerts: existingAlerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      const request = {
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        isActive: true,
      };

      const result = await store.dispatch(createAlert(request));

      expect(result.type).toBe('alerts/createAlert/rejected');
      expect(result.payload).toContain('Maksimum 10 aktif uyarı');
    });

    it('rejects duplicate alerts', async () => {
      const existingAlert = {
        id: 'alert-1',
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      };

      const store = createMockStore({
        alerts: {
          alerts: [existingAlert],
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      const request = {
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        isActive: true,
      };

      const result = await store.dispatch(createAlert(request));

      expect(result.type).toBe('alerts/createAlert/rejected');
      expect(result.payload).toContain('zaten bir uyarı mevcut');
    });
  });

  describe('Async Thunks - updateAlert', () => {
    it('updates alert successfully', async () => {
      const existingAlert = {
        id: 'alert-1',
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      };

      const store = createMockStore({
        alerts: {
          alerts: [existingAlert],
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: 'alert-1',
        },
      });

      await store.dispatch(
        updateAlert({
          id: 'alert-1',
          price: 2950000,
        })
      );

      const state = store.getState().alerts;
      expect(state.alerts[0].price).toBe(2950000);
      expect(state.editingAlertId).toBeNull();
    });

    it('persists updated alert to localStorage', async () => {
      const existingAlert = {
        id: 'alert-1',
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      };

      const store = createMockStore({
        alerts: {
          alerts: [existingAlert],
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      await store.dispatch(
        updateAlert({
          id: 'alert-1',
          price: 2950000,
        })
      );

      const stored = localStorage.getItem('priceAlerts');
      const alerts = JSON.parse(stored!);
      expect(alerts[0].price).toBe(2950000);
    });
  });

  describe('Async Thunks - deleteAlert', () => {
    it('deletes alert successfully', async () => {
      const existingAlert = {
        id: 'alert-1',
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      };

      const store = createMockStore({
        alerts: {
          alerts: [existingAlert],
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      await store.dispatch(deleteAlert('alert-1'));

      const state = store.getState().alerts;
      expect(state.alerts).toHaveLength(0);
    });

    it('persists deletion to localStorage', async () => {
      const existingAlert = {
        id: 'alert-1',
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      };

      const store = createMockStore({
        alerts: {
          alerts: [existingAlert],
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      await store.dispatch(deleteAlert('alert-1'));

      const stored = localStorage.getItem('priceAlerts');
      const alerts = JSON.parse(stored!);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Async Thunks - triggerAlert', () => {
    it('triggers alert successfully', async () => {
      const existingAlert = {
        id: 'alert-1',
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      };

      const store = createMockStore({
        alerts: {
          alerts: [existingAlert],
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      await store.dispatch(
        triggerAlert({
          alertId: 'alert-1',
          currentPrice: 2905000,
        })
      );

      const state = store.getState().alerts;
      expect(state.alerts[0].status).toBe(AlertStatus.TRIGGERED);
      expect(state.triggeredAlerts).toHaveLength(1);
      expect(state.triggeredAlerts[0].currentPrice).toBe(2905000);
    });

    it('limits triggered alerts history to 50', async () => {
      const existingAlerts = Array.from({ length: 51 }, (_, i) => ({
        id: `alert-${i}`,
        symbol: 'BTC_TRY' as const,
        condition: AlertCondition.ABOVE,
        price: 2900000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      }));

      const store = createMockStore({
        alerts: {
          alerts: existingAlerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      // Trigger all alerts
      for (let i = 0; i < 51; i++) {
        await store.dispatch(
          triggerAlert({
            alertId: `alert-${i}`,
            currentPrice: 2905000,
          })
        );
      }

      const state = store.getState().alerts;
      expect(state.triggeredAlerts).toHaveLength(50);
    });
  });

  describe('Selectors', () => {
    it('selectAlerts returns all alerts', () => {
      const alerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY' as const,
          condition: AlertCondition.ABOVE,
          price: 2900000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.ACTIVE,
          createdAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      const result = selectAlerts(store.getState());
      expect(result).toEqual(alerts);
    });

    it('selectActiveAlerts returns only active alerts', () => {
      const alerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY' as const,
          condition: AlertCondition.ABOVE,
          price: 2900000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.ACTIVE,
          createdAt: Date.now(),
        },
        {
          id: 'alert-2',
          symbol: 'ETH_TRY' as const,
          condition: AlertCondition.BELOW,
          price: 200000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.TRIGGERED,
          createdAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      const result = selectActiveAlerts(store.getState());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert-1');
    });

    it('selectActiveAlertsCount returns count of active alerts', () => {
      const alerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY' as const,
          condition: AlertCondition.ABOVE,
          price: 2900000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.ACTIVE,
          createdAt: Date.now(),
        },
        {
          id: 'alert-2',
          symbol: 'ETH_TRY' as const,
          condition: AlertCondition.ABOVE,
          price: 220000,
          notificationType: NotificationType.BOTH,
          status: AlertStatus.ACTIVE,
          createdAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      const result = selectActiveAlertsCount(store.getState());
      expect(result).toBe(2);
    });
  });
});
