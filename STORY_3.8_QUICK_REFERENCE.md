# Story 3.8: Order History - Quick Reference Guide

## Component Location
```
/frontend/src/components/Trading/OrderHistory/OrderHistoryComponent.tsx
```

## Import & Usage
```typescript
import OrderHistoryComponent from '../components/Trading/OrderHistory';

// In your component
<OrderHistoryComponent
  onOrderDetailsClick={(order) => console.log(order)} // optional
/>
```

## Key Features at a Glance

### 1. Table Columns (Turkish)
| Column | Field | Description |
|--------|-------|-------------|
| Sembol | symbol | Trading pair (e.g., BTC/TRY) |
| Taraf | side | Buy (green) / Sell (red) |
| Tür | type | Market / Limit |
| Fiyat | price | Order price (or "-" for market) |
| Miktar | quantity | Total amount ordered |
| Doldurulmuş | filledQuantity | Amount actually filled |
| Durum | status | Filled/Canceled/Rejected |
| Ücret | fee | Trading fee in quote currency |
| Toplam | totalValue | Total value in quote currency |
| Zaman | createdAt | Date and time |
| İşlem | - | View details button |

### 2. Filters
```typescript
// Available filters
{
  symbol: 'all' | 'BTC_TRY' | 'ETH_TRY' | 'USDT_TRY',
  side: 'all' | 'BUY' | 'SELL',
  type: 'all' | 'MARKET' | 'LIMIT',
  status: 'all' | 'FILLED' | 'CANCELED' | 'REJECTED',
  dateRangePreset: 'today' | 'week' | 'month' | 'custom',
  startDate: Date,
  endDate: Date
}
```

### 3. Status Colors
```typescript
const statusColors = {
  FILLED: 'success',      // Green
  CANCELED: 'default',    // Gray
  REJECTED: 'error',      // Red
  PARTIALLY_FILLED: 'info' // Blue
};
```

### 4. Sorting Options
- **Time** (default): Newest first
- **Symbol**: Alphabetical
- **Status**: Alphabetical
- **Amount**: Numerical
- **Total**: Numerical

### 5. Pagination
- Rows per page: 10, 25, 50, 100
- Default: 25 rows per page

### 6. Statistics Displayed
- **Toplam Siparişler**: Total order count
- **Doldurulmuş**: Filled orders count
- **İptal Edildi**: Canceled orders count
- **Reddedildi**: Rejected orders count

### 7. CSV Export Format
```csv
Sembol,Taraf,Tür,Fiyat,Miktar,Doldurulmuş,Durum,Ücret,Toplam,Tarih,Saat
BTC/TRY,Alış,Limit,"850.000,00",0.50000000,0.50000000,Dolduruldu,"850,00","425.000,00",23.11.2025,10:30:45
ETH/TRY,Satış,Market,-,2.00000000,2.00000000,Dolduruldu,"180,00","90.000,00",23.11.2025,09:15:22
```

## Redux Integration

### Dispatching fetchOrderHistory
```typescript
import { fetchOrderHistory } from '../store/slices/tradingSlice';

// With filters
dispatch(fetchOrderHistory({
  symbol: 'BTC_TRY',
  status: 'FILLED',
  startDate: new Date('2025-11-01').getTime(),
  endDate: new Date('2025-11-23').getTime()
}));
```

### Selectors
```typescript
import {
  selectOrderHistory,
  selectOrderHistoryLoading,
  selectOrderHistoryError
} from '../store/slices/tradingSlice';

const orderHistory = useAppSelector(selectOrderHistory);
const loading = useAppSelector(selectOrderHistoryLoading);
const error = useAppSelector(selectOrderHistoryError);
```

## API Endpoint

### Request
```http
GET /api/v1/orders/history?symbol=BTC_TRY&status=FILLED&startDate=1699900800000&endDate=1700870400000
Authorization: Bearer <token>
```

### Response
```json
[
  {
    "orderId": "order-123",
    "symbol": "BTC_TRY",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "0.5",
    "filledQuantity": "0.5",
    "price": "850000",
    "avgPrice": "850000",
    "fee": "850",
    "totalValue": "425000",
    "status": "FILLED",
    "createdAt": 1700000000000,
    "updatedAt": 1700001000000,
    "fills": [
      {
        "price": "850000",
        "quantity": "0.5",
        "commission": "850",
        "commissionAsset": "TRY",
        "tradeId": "trade-456"
      }
    ]
  }
]
```

## Common Customizations

### 1. Change Default Rows Per Page
```typescript
const [rowsPerPage, setRowsPerPage] = useState(50); // Default: 25
```

### 2. Add Custom Filter
```typescript
const [customFilter, setCustomFilter] = useState('');

// In filter section
<TextField
  label="Custom Filter"
  value={customFilter}
  onChange={(e) => setCustomFilter(e.target.value)}
/>
```

### 3. Customize Status Labels
```typescript
const getStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.FILLED]: 'Completed', // Change to English
    [OrderStatus.CANCELED]: 'Cancelled',
    [OrderStatus.REJECTED]: 'Failed',
    // ...
  };
  return labels[status] || status;
};
```

### 4. Add Order Details Modal
```typescript
const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

<OrderHistoryComponent
  onOrderDetailsClick={(order) => setSelectedOrder(order)}
/>

{selectedOrder && (
  <OrderDetailsModal
    order={selectedOrder}
    onClose={() => setSelectedOrder(null)}
  />
)}
```

## Responsive Breakpoints

```typescript
const isMobile = useMediaQuery(theme.breakpoints.down('md')); // < 900px

// Hidden columns on mobile:
// - Tür (Type)
// - Miktar (Amount)
// - Ücret (Fee)
```

## Common Issues & Solutions

### Issue: Date picker not working
**Solution:** Ensure date-fns and @mui/x-date-pickers are installed
```bash
npm install @mui/x-date-pickers date-fns --legacy-peer-deps
```

### Issue: Orders not loading
**Solution:** Check Redux state and API mock flag
```typescript
// In .env
REACT_APP_USE_MOCK_TRADING_API=true // Use mock data
```

### Issue: CSV export produces garbled text
**Solution:** Component includes UTF-8 BOM for Excel compatibility
```typescript
const blob = new Blob(['\uFEFF' + csvContent], {
  type: 'text/csv;charset=utf-8;'
});
```

### Issue: Filters not applying
**Solution:** Click "Filtrele" button after changing filters
```typescript
const handleApplyFilters = () => {
  loadOrderHistory(); // Triggers API call
  setPage(0); // Reset to first page
};
```

## Testing

### Component Test Example
```typescript
it('should render orders table with data', () => {
  const orders = [createMockOrder()];
  renderWithStore(orders);

  expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
  expect(screen.getByText('Alış')).toBeInTheDocument();
});
```

### Integration Test Example
```typescript
it('should fetch and display order history', async () => {
  const mockOrders = [createMockOrder()];
  (getOrderHistory as jest.Mock).mockResolvedValue(mockOrders);

  renderWithStore();

  await waitFor(() => {
    expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
  });
});
```

## Performance Tips

1. **Limit initial load:** Default to last 30 days
2. **Use pagination:** Don't load all orders at once
3. **Memoize calculations:** Use useMemo for statistics
4. **Lazy load components:** Import date picker only when needed
5. **Virtual scrolling:** For >1000 orders (future enhancement)

## Accessibility

```tsx
// All interactive elements have labels
<IconButton aria-label="Yenile" onClick={handleRefresh}>
  <RefreshIcon />
</IconButton>

// Table has proper semantic structure
<TableContainer>
  <Table aria-label="Sipariş geçmişi tablosu">
    {/* ... */}
  </Table>
</TableContainer>

// Keyboard navigation supported
<TableSortLabel
  tabIndex={0}
  onKeyPress={(e) => e.key === 'Enter' && handleSort('time')}
>
  Zaman
</TableSortLabel>
```

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 10+)

## File Structure
```
frontend/src/
├── components/
│   └── Trading/
│       └── OrderHistory/
│           ├── OrderHistoryComponent.tsx     (844 lines)
│           ├── OrderHistoryComponent.test.tsx (272 lines)
│           └── index.ts                       (5 lines)
├── store/
│   └── slices/
│       └── tradingSlice.ts                    (Updated)
├── api/
│   └── tradingApi.ts                          (Updated)
└── pages/
    └── TradingPage.tsx                        (Updated)
```

## Dependencies
```json
{
  "@mui/material": "^5.15.10",
  "@mui/x-date-pickers": "^8.19.0",
  "date-fns": "^4.1.0",
  "@reduxjs/toolkit": "^2.1.0",
  "react-toastify": "^10.0.4"
}
```

---

**Last Updated:** November 23, 2025
**Version:** 1.0.0
**Status:** Production Ready
