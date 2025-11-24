# OpenOrdersComponent - Developer Guide

## Overview

Enhanced open orders display component with filtering, sorting, real-time updates, and mobile responsiveness.

## Usage

```typescript
import OpenOrdersComponent from './components/Trading/OpenOrders/OpenOrdersComponent';

// Basic usage
<OpenOrdersComponent />

// With callback
<OpenOrdersComponent onOrderCanceled={handleRefresh} />
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onOrderCanceled` | `() => void` | No | Callback triggered after successful order cancellation |

## Features

### Display
- 11-column comprehensive table (Symbol, Side, Type, Price, Amount, Filled, Remaining, Total, Status, Time, Action)
- Color-coded sides (Buy: green, Sell: red)
- Status chips with appropriate colors
- Progress bars for partial fills
- Formatted prices and amounts
- Turkish locale

### Filtering
- **Symbol**: All, BTC_TRY, ETH_TRY, USDT_TRY
- **Side**: All, Buy, Sell
- **Type**: All, Market, Limit
- **Status**: All, Open, Partially Filled
- Collapsible filter panel
- Reset filters button

### Sorting
- Time (default: newest first)
- Symbol (alphabetical)
- Price (numeric)
- Amount (numeric)
- Click header to sort, click again to reverse

### Real-Time Updates
- Automatic WebSocket subscription
- Live order updates (fills, cancellations)
- Toast notifications for important events
- Progress bar updates

### Pagination
- Configurable rows per page (5, 10, 25, 50)
- Page navigation
- Turkish labels

### Mobile Responsive
- Responsive columns (hides non-essential columns on mobile)
- Horizontal scroll for full table
- Touch-friendly interactions

## Redux Integration

### Required State
```typescript
interface TradingState {
  openOrders: Order[];
  selectedSymbol: TradingPair;
  // ...
}
```

### Actions Used
- `setOpenOrders(orders: Order[])` - Set all open orders
- `updateOrder(order: Order)` - Update single order
- `selectOpenOrders(state)` - Select open orders from state

## WebSocket Integration

Component automatically subscribes to order updates:

```typescript
websocketService.subscribeToOrders((message) => {
  if (message.type === WebSocketMessageType.ORDER_UPDATE) {
    // Handles order updates automatically
  }
});
```

**Required WebSocket Methods**:
- `isConnected()` - Check connection status
- `subscribeToOrders(callback)` - Subscribe to order updates

## API Integration

### Required Endpoints

1. **GET /api/orders/open** (via `getOpenOrders()`)
   - Fetches all open orders
   - Returns: `Order[]`

2. **DELETE /api/orders/:id** (via `cancelOrder(orderId)`)
   - Cancels specific order
   - Returns: Success response

## Order Type

```typescript
interface Order {
  orderId: string;
  symbol: TradingPair;
  clientOrderId: string;
  side: OrderSide;         // 'BUY' | 'SELL'
  type: OrderType;         // 'MARKET' | 'LIMIT'
  timeInForce: TimeInForce;
  quantity: string;
  price: string;           // '0' for market orders
  status: OrderStatus;     // 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED'
  executedQty: string;
  cummulativeQuoteQty: string;
  createdAt: number;       // Unix timestamp
  updatedAt: number;
}
```

## Styling

Component uses Material-UI theming. Customize via theme:

```typescript
// Color coding
Buy orders: theme.palette.success.main
Sell orders: theme.palette.error.main
Status chips: theme.palette[color].main
```

## Accessibility

- All interactive elements have aria-labels
- Keyboard navigation supported
- Table has proper semantic structure
- Screen reader compatible

## Error Handling

- API errors display in dismissible Alert
- Loading states show CircularProgress
- Empty states with helpful messages
- WebSocket disconnection gracefully handled

## Performance

- Filters use `useMemo` for optimization
- Sorting uses `useMemo` for optimization
- Pagination limits rendered rows
- WebSocket updates only for relevant symbols

## Testing

Run tests:
```bash
npm test -- OpenOrdersComponent.test.tsx
```

Core test coverage:
- Rendering
- Order display
- Filtering
- Sorting
- Pagination
- Cancel workflow
- WebSocket integration
- Accessibility

## Common Issues

### Orders not appearing
- Check Redux state has `openOrders` populated
- Verify `getOpenOrders()` API returns data
- Check browser console for errors

### Real-time updates not working
- Verify WebSocket is connected (`wsConnected` in state)
- Check WebSocket service has `subscribeToOrders()` method
- Verify backend emits `ORDER_UPDATE` messages

### Cancel not working
- Verify `cancelOrder(orderId)` API endpoint
- Check order status allows cancellation (NEW or PARTIALLY_FILLED only)
- Check browser console for errors

### TypeScript errors
- Ensure `Order` type matches backend response
- Verify all required props are provided
- Check Redux state types match component expectations

## Examples

### Basic Integration
```typescript
import OpenOrdersComponent from './components/Trading/OpenOrders/OpenOrdersComponent';

const TradingPage: React.FC = () => {
  return (
    <Container>
      {/* Other trading components */}
      <Box sx={{ mt: 3 }}>
        <OpenOrdersComponent />
      </Box>
    </Container>
  );
};
```

### With Refresh Callback
```typescript
const TradingPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOrderCanceled = () => {
    setRefreshTrigger(prev => prev + 1);
    // Refresh other components
  };

  return (
    <Container>
      <OpenOrdersComponent onOrderCanceled={handleOrderCanceled} />
      <OrderHistory refreshTrigger={refreshTrigger} />
    </Container>
  );
};
```

## File Location
```
frontend/src/components/Trading/OpenOrders/
├── OpenOrdersComponent.tsx       (Main component)
├── OpenOrdersComponent.test.tsx  (Tests)
└── README.md                     (This file)
```

## Related Components
- `OrderStatusPanel` - Order history display
- `MarketOrderForm` - Place market orders
- `LimitOrderForm` - Place limit orders
- `TradingPage` - Main trading interface

## Support

For issues or questions, refer to:
- Main task report: `/TASK-FE-006-COMPLETION-REPORT.md`
- Engineering guidelines: `/engineering-guidelines.md`
- Trading types: `/frontend/src/types/trading.types.ts`
