/**
 * Redux slice for price alerts management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  PriceAlert,
  TriggeredAlert,
  CreateAlertRequest,
  UpdateAlertRequest,
  AlertStatus,
  AlertCondition,
  MAX_ACTIVE_ALERTS,
} from '../../types/alerts.types';
import { RootState } from '../index';

// State interface
interface AlertsState {
  alerts: PriceAlert[];
  triggeredAlerts: TriggeredAlert[];
  loading: boolean;
  error: string | null;
  editingAlertId: string | null;
}

// Initial state
const initialState: AlertsState = {
  alerts: [],
  triggeredAlerts: [],
  loading: false,
  error: null,
  editingAlertId: null,
};

// Async thunks (mock implementation - ready for real API)
export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async (_, { rejectWithValue }) => {
    try {
      // Mock API call - replace with real API
      // const response = await api.get('/api/v1/alerts');
      // return response.data;

      // Return mock data from local storage
      const storedAlerts = localStorage.getItem('priceAlerts');
      return storedAlerts ? JSON.parse(storedAlerts) : [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch alerts');
    }
  }
);

export const createAlert = createAsyncThunk(
  'alerts/createAlert',
  async (request: CreateAlertRequest, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const activeAlerts = state.alerts.alerts.filter(
        (a) => a.status === AlertStatus.ACTIVE
      );

      // Validate max alerts limit
      if (activeAlerts.length >= MAX_ACTIVE_ALERTS && request.isActive) {
        return rejectWithValue(
          `Maksimum ${MAX_ACTIVE_ALERTS} aktif uyarı oluşturabilirsiniz`
        );
      }

      // Check for duplicate alerts
      const duplicate = state.alerts.alerts.find(
        (a) =>
          a.symbol === request.symbol &&
          a.condition === request.condition &&
          Math.abs(a.price - request.price) < 0.01 &&
          a.status === AlertStatus.ACTIVE
      );

      if (duplicate) {
        return rejectWithValue(
          'Bu sembol ve koşul için zaten bir uyarı mevcut'
        );
      }

      // Mock API call - replace with real API
      // const response = await api.post('/api/v1/alerts', request);
      // return response.data;

      // Create mock alert
      const newAlert: PriceAlert = {
        id: `alert-${Date.now()}`,
        symbol: request.symbol,
        condition: request.condition,
        price: request.price,
        notificationType: request.notificationType,
        status: request.isActive ? AlertStatus.ACTIVE : AlertStatus.INACTIVE,
        createdAt: Date.now(),
      };

      return newAlert;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create alert');
    }
  }
);

export const updateAlert = createAsyncThunk(
  'alerts/updateAlert',
  async (request: UpdateAlertRequest, { rejectWithValue }) => {
    try {
      // Mock API call - replace with real API
      // const response = await api.put(`/api/v1/alerts/${request.id}`, request);
      // return response.data;

      return request;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update alert');
    }
  }
);

export const deleteAlert = createAsyncThunk(
  'alerts/deleteAlert',
  async (alertId: string, { rejectWithValue }) => {
    try {
      // Mock API call - replace with real API
      // await api.delete(`/api/v1/alerts/${alertId}`);

      return alertId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete alert');
    }
  }
);

export const triggerAlert = createAsyncThunk(
  'alerts/triggerAlert',
  async (
    {
      alertId,
      currentPrice,
    }: {
      alertId: string;
      currentPrice: number;
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const alert = state.alerts.alerts.find((a) => a.id === alertId);

      if (!alert) {
        return rejectWithValue('Alert not found');
      }

      const triggeredAlert: TriggeredAlert = {
        ...alert,
        currentPrice,
        triggeredAt: Date.now(),
        status: AlertStatus.TRIGGERED,
      };

      return triggeredAlert;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to trigger alert');
    }
  }
);

// Slice
const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setEditingAlert: (state, action: PayloadAction<string | null>) => {
      state.editingAlertId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Check alerts against current prices (called from WebSocket updates)
    checkAlertConditions: (
      state,
      action: PayloadAction<{ symbol: string; currentPrice: number }>
    ) => {
      const { symbol, currentPrice } = action.payload;

      state.alerts.forEach((alert) => {
        if (
          alert.symbol === symbol &&
          alert.status === AlertStatus.ACTIVE
        ) {
          const shouldTrigger =
            (alert.condition === AlertCondition.ABOVE &&
              currentPrice >= alert.price) ||
            (alert.condition === AlertCondition.BELOW &&
              currentPrice <= alert.price);

          if (shouldTrigger) {
            // Alert will be triggered by triggerAlert async thunk
            // This is just for marking
            alert.status = AlertStatus.TRIGGERED;
            alert.triggeredAt = Date.now();
          }
        }
      });
    },
    // Clear all triggered alerts history
    clearTriggeredHistory: (state) => {
      state.triggeredAlerts = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch alerts
    builder
      .addCase(fetchAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create alert
    builder
      .addCase(createAlert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAlert.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts.push(action.payload);

        // Persist to local storage
        localStorage.setItem('priceAlerts', JSON.stringify(state.alerts));
      })
      .addCase(createAlert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update alert
    builder
      .addCase(updateAlert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAlert.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.alerts.findIndex(
          (a) => a.id === action.payload.id
        );
        if (index !== -1) {
          state.alerts[index] = {
            ...state.alerts[index],
            ...action.payload,
          };
        }

        // Persist to local storage
        localStorage.setItem('priceAlerts', JSON.stringify(state.alerts));
        state.editingAlertId = null;
      })
      .addCase(updateAlert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete alert
    builder
      .addCase(deleteAlert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAlert.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = state.alerts.filter((a) => a.id !== action.payload);

        // Persist to local storage
        localStorage.setItem('priceAlerts', JSON.stringify(state.alerts));
      })
      .addCase(deleteAlert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Trigger alert
    builder
      .addCase(triggerAlert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(triggerAlert.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.alerts.findIndex(
          (a) => a.id === action.payload.id
        );
        if (index !== -1) {
          state.alerts[index].status = AlertStatus.TRIGGERED;
          state.alerts[index].triggeredAt = action.payload.triggeredAt;
        }
        state.triggeredAlerts.unshift(action.payload);

        // Keep only last 50 triggered alerts
        if (state.triggeredAlerts.length > 50) {
          state.triggeredAlerts = state.triggeredAlerts.slice(0, 50);
        }

        // Persist to local storage
        localStorage.setItem('priceAlerts', JSON.stringify(state.alerts));
      })
      .addCase(triggerAlert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setEditingAlert,
  clearError,
  checkAlertConditions,
  clearTriggeredHistory,
} = alertsSlice.actions;

// Selectors
export const selectAlerts = (state: RootState) => state.alerts.alerts;
export const selectActiveAlerts = (state: RootState) =>
  state.alerts.alerts.filter((a) => a.status === AlertStatus.ACTIVE);
export const selectTriggeredAlerts = (state: RootState) =>
  state.alerts.triggeredAlerts;
export const selectAlertsLoading = (state: RootState) => state.alerts.loading;
export const selectAlertsError = (state: RootState) => state.alerts.error;
export const selectEditingAlertId = (state: RootState) =>
  state.alerts.editingAlertId;
export const selectActiveAlertsCount = (state: RootState) =>
  state.alerts.alerts.filter((a) => a.status === AlertStatus.ACTIVE).length;

// Export reducer
export default alertsSlice.reducer;
