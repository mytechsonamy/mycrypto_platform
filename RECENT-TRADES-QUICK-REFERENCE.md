# RecentTradesComponent - Quick Reference Guide

## Overview
The RecentTradesComponent displays the most recent 50 trades for a cryptocurrency trading pair with real-time updates via WebSocket.

## Component Location
```
/frontend/src/components/Trading/RecentTrades/RecentTradesComponent.tsx
```

## Usage

### Basic Usage
```tsx
import RecentTradesComponent from '../components/Trading/RecentTrades/RecentTradesComponent';

<RecentTradesComponent
  trades={recentTrades}
  symbol="BTC_TRY"
  loading={false}
  error={null}
  maxHeight={400}
/>
```

### With Redux
```tsx
import { useAppSelector } from '../store';
import { selectRecentTrades, selectSelectedSymbol } from '../store/slices/tradingSlice';

const recentTrades = useAppSelector(selectRecentTrades);
const symbol = useAppSelector(selectSelectedSymbol);

<RecentTradesComponent
  trades={recentTrades}
  symbol={symbol}
  loading={loading}
  error={error}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `trades` | `Trade[]` | Yes | - | Array of trade objects |
| `symbol` | `string` | Yes | - | Trading pair symbol (e.g., "BTC_TRY") |
| `loading` | `boolean` | No | `false` | Show loading skeleton |
| `error` | `string \| null` | No | `null` | Error message to display |
| `maxHeight` | `number` | No | `600` | Maximum height in pixels for scrollable area |

## Trade Object Structure

```typescript
interface Trade {
  id: string;
  symbol: string;
  price: string;              // e.g., "850000.00"
  quantity: string;           // e.g., "0.15000000"
  quoteQuantity: string;      // e.g., "127500.00"
  time: number;               // Unix timestamp in milliseconds
  isBuyerMaker: boolean;      // true = SELL, false = BUY
  isBestMatch: boolean;
}
```

## Features

### 1. Display Columns
- **Fiyat (Price):** In TRY with Turkish locale formatting (e.g., 850.000,00)
- **Miktar (Quantity):** Crypto amount with up to 8 decimals (e.g., 0,15000000)
- **Zaman (Time):** HH:MM:SS format in Turkish locale (e.g., 14:35:22)
- **Taraf (Side):** "Alış" (Buy) or "Satış" (Sell) with icon

### 2. Color Coding
- **BUY Trades:** Blue (#2196F3) with downward arrow ↓
- **SELL Trades:** Orange (#FF9800) with upward arrow ↑

### 3. Trade Side Logic
- `isBuyerMaker: false` → BUY (buyer took the order)
- `isBuyerMaker: true` → SELL (seller took the order)

### 4. States
- **Loading:** Shows 10 skeleton rows
- **Error:** Red background with error message
- **Empty:** "Henüz işlem bulunmamaktadır" message
- **Normal:** Table with trades

### 5. Responsive Design
- **Desktop:** Full table layout
- **Mobile:** Compact table with smaller fonts
- **Scrolling:** Vertical scroll within container

### 6. Accessibility
- ARIA labels for screen readers
- Semantic table markup
- Keyboard navigation support
- WCAG 2.1 AA compliant

## WebSocket Integration

### Subscribe to Trades
```typescript
import websocketService from '../services/websocket.service';
import { addTrade } from '../store/slices/tradingSlice';

// Subscribe
websocketService.subscribeToTrades('BTC_TRY', (message) => {
  if (message.type === WebSocketMessageType.TRADE_EXECUTED) {
    dispatch(addTrade(message.data));
  }
});

// Unsubscribe
websocketService.unsubscribe('trades:BTC_TRY');
```

### Redux Actions
```typescript
import { setRecentTrades, addTrade } from '../store/slices/tradingSlice';

// Set initial trades
dispatch(setRecentTrades(tradesArray));

// Add new trade (WebSocket)
dispatch(addTrade(newTrade));
```

## Formatting Functions

### Price Formatting
```typescript
// Input: "850000.00"
// Output: "850.000,00"
formatPrice(value: string): string {
  return parseFloat(value).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
```

### Quantity Formatting
```typescript
// Input: "0.15000000"
// Output: "0,15000000"
formatQuantity(value: string): string {
  return parseFloat(value).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}
```

### Time Formatting
```typescript
// Input: 1732362922000 (Unix timestamp)
// Output: "14:35:22"
formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
```

## Testing

### Run Tests
```bash
cd frontend
npm test -- RecentTradesComponent.test.tsx --coverage
```

### Test Coverage
- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%

### Mock Data
```typescript
const mockTrades: Trade[] = [
  {
    id: 'trade-001',
    symbol: 'BTC_TRY',
    price: '850000.00',
    quantity: '0.15000000',
    quoteQuantity: '127500.00',
    time: Date.now(),
    isBuyerMaker: false, // BUY
    isBestMatch: true,
  },
];
```

## Styling

### Theme Colors
- BUY: `theme.palette.info.main` (#2196F3)
- SELL: `theme.palette.warning.main` (#FF9800)
- Border: `theme.palette.divider`
- Background: `theme.palette.background.paper`

### Responsive Breakpoints
- xs (mobile): < 600px
- sm (tablet): 600px - 960px
- md (desktop): > 960px

## Common Issues

### Issue: Trades not updating
**Solution:** Check WebSocket connection status
```typescript
const wsConnected = useAppSelector(selectWsConnected);
```

### Issue: Wrong side color
**Solution:** Verify `isBuyerMaker` logic
- `isBuyerMaker: false` = BUY (blue)
- `isBuyerMaker: true` = SELL (orange)

### Issue: Time not formatted correctly
**Solution:** Ensure timestamp is in milliseconds (not seconds)
```typescript
// Correct
time: 1732362922000

// Incorrect
time: 1732362922
```

### Issue: Too many trades displayed
**Solution:** Redux automatically limits to 50 in `addTrade` action
```typescript
state.recentTrades = [action.payload, ...state.recentTrades].slice(0, 50);
```

## Performance Tips

1. **Limit trades to 50:** Prevents UI lag
2. **Use maxHeight:** Enables virtual scrolling
3. **Memoize sorting:** Already implemented with `useMemo`
4. **Optimize re-renders:** Component only re-renders when `trades` array changes

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies
- React 18+
- Material-UI 5+
- TypeScript 4.9+
- Redux Toolkit 1.9+

## Related Files
- Component: `/frontend/src/components/Trading/RecentTrades/RecentTradesComponent.tsx`
- Tests: `/frontend/src/components/Trading/RecentTrades/RecentTradesComponent.test.tsx`
- Types: `/frontend/src/types/trading.types.ts`
- Redux: `/frontend/src/store/slices/tradingSlice.ts`
- Page: `/frontend/src/pages/TradingPage.tsx`

## Support
For issues or questions, contact the Frontend Development team.

---

**Version:** 1.0.0
**Last Updated:** November 23, 2025
**Status:** Production Ready ✅
