# MyCrypto Platform - Figma Design System

## 🎨 Complete Design Specification

### Dosya Bilgisi
- **File ID**: quIyI228k8AvUwAB20rSFX
- **File URL**: https://www.figma.com/design/quIyI228k8AvUwAB20rSFX/MyCrypto-Platform---Frontend-Design
- **Type**: Design System + Wireframes
- **Status**: Ready for Design Implementation

---

## 📊 Renk Paleti (Color Palette)

### Ana Renkler (Primary Colors)
| Renk | Hex | RGB | Kullanım |
|------|-----|-----|----------|
| **Primary Blue** | #006FFF | 0, 111, 255 | CTA Buttons, Navigation, Focus States |
| **Electric Purple** | #7C3AED | 124, 58, 237 | Accent, Gradients, Secondary Actions |
| **Vibrant Cyan** | #00D9FF | 0, 217, 255 | Modern Accent, Highlights |

### İşlevsel Renkler (Semantic Colors)
| Renk | Hex | RGB | Kullanım |
|------|-----|-----|----------|
| **Success Green** | #10B981 | 16, 185, 129 | Buy Orders, Profit, Success |
| **Danger Red** | #FF4757 | 255, 71, 87 | Sell Orders, Loss, Error |
| **Warning Orange** | #F59E0B | 245, 158, 11 | Warning, Info, Attention |
| **Info Blue** | #3B82F6 | 59, 130, 246 | Information, Secondary Info |

### Nötr Renkler (Neutral Colors)
| Renk | Hex | RGB | Kullanım |
|------|-----|-----|----------|
| **Dark BG** | #0F1419 | 15, 20, 25 | Page Background |
| **Card BG** | #1A1F29 | 26, 31, 41 | Card Background, Elevated Surfaces |
| **Border** | #2D3748 | 45, 55, 72 | Borders, Dividers |
| **Text Primary** | #F8F9FA | 248, 249, 250 | Main Text, Headings |
| **Text Secondary** | #A8ADB5 | 168, 173, 181 | Secondary Text, Labels |
| **Placeholder** | #666B77 | 102, 107, 119 | Placeholder Text, Disabled |

---

## 🔤 Tipografi (Typography)

### Başlıklar (Headings)
| Style | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|-----------------|
| **H1** | 32px | 700 | 1.2 (38.4px) | 0px |
| **H2** | 24px | 700 | 1.3 (31.2px) | 0px |
| **H3** | 18px | 600 | 1.4 (25.2px) | 0px |

### Gövde Metni (Body Text)
| Style | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|-----------------|
| **Body Large** | 16px | 400 | 1.5 (24px) | 0px |
| **Body Regular** | 14px | 400 | 1.5 (21px) | 0px |
| **Body Small** | 12px | 400 | 1.4 (16.8px) | 0px |

### Font Ailesi (Font Family)
- **Primary**: Inter, -apple-system, BlinkMacSystemFont
- **Fallback**: Segoe UI, Helvetica, Arial, sans-serif

---

## 📐 Spacing System

### Base Unit: 8px Grid

| Size | Value | Kullanım |
|------|-------|----------|
| **XS** | 4px | Micro spacing |
| **S** | 8px | Small spacing |
| **M** | 16px | Standard spacing |
| **L** | 24px | Large spacing |
| **XL** | 32px | Section spacing |
| **2XL** | 48px | Major sections |

---

## 🎛️ Bileşenler (Components)

### Butonlar (Buttons)

#### Primary Button
```
Size: 48px height
Padding: 12px 24px
Border Radius: 8px
Font: Body Regular (14px, Weight 600)
Background: Linear Gradient (#006FFF → #7C3AED)
Text Color: #F8F9FA
States:
  - Default: Full opacity
  - Hover: Opacity 0.9 + Shadow
  - Active: Scale 0.98
  - Disabled: Opacity 0.5
Transition: all 0.3s ease
```

#### Secondary Button
```
Size: 48px height
Padding: 12px 24px
Border Radius: 8px
Font: Body Regular (14px, Weight 600)
Background: Transparent
Border: 1.5px solid #2D3748
Text Color: #006FFF
States:
  - Default: Border #2D3748
  - Hover: Border #006FFF, Background rgba(0, 111, 255, 0.1)
  - Active: Background rgba(0, 111, 255, 0.15)
Transition: all 0.3s ease
```

#### Danger Button
```
Size: 48px height
Padding: 12px 24px
Border Radius: 8px
Font: Body Regular (14px, Weight 600)
Background: #FF4757
Text Color: #F8F9FA
States:
  - Default: Full opacity
  - Hover: Background #FF6B7D + Shadow
  - Active: Scale 0.98
Transition: all 0.3s ease
```

### Input Fields

```
Height: 48px
Padding: 12px 16px
Border Radius: 8px
Border: 1px solid #2D3748
Background: rgba(255, 255, 255, 0.05)
Font: Body Regular (14px)
Text Color: #F8F9FA
Placeholder Color: #666B77

States:
  - Default: Border #2D3748
  - Focus: Border #006FFF, Box-Shadow: 0 0 0 3px rgba(0, 111, 255, 0.1)
  - Hover: Border #3D4758
  - Error: Border #FF4757
  - Success: Border #10B981
  - Disabled: Opacity 0.5

Icons:
  - Right-aligned, 20x20px
  - Color: #A8ADB5
  - Spacing: 12px from right edge
```

### Kartlar (Cards)

```
Background: #1A1F29
Border: 1px solid #2D3748
Border Radius: 12px
Padding: 20px
Box Shadow: 0 4px 12px rgba(0, 0, 0, 0.3)
Transition: all 0.3s ease

States:
  - Default: As above
  - Hover: Border #006FFF, Shadow 0 8px 24px rgba(0, 111, 255, 0.2)
  - Active: Border #006FFF, Background rgba(0, 111, 255, 0.05)
```

### Bakiye Kartları (Balance Cards)

```
Background: Linear Gradient #006FFF → #7C3AED
Border Radius: 12px
Padding: 24px
Text Color: #F8F9FA

Layout:
  - Title: 12px, Weight 600, Opacity 0.8
  - Amount: 28px, Weight 700
  - Details: 12px, Weight 400, Opacity 0.7
  - Icon: Top-right, 40x40px, Opacity 0.2

States:
  - Default: Full opacity
  - Hover: Scale 1.02, Enhanced shadow
```

### Durum Rozetleri (Status Badges)

#### Success Badge
```
Background: rgba(16, 185, 129, 0.2)
Border: 1px solid #10B981
Text: #10B981
Font: 12px, Weight 500
Padding: 4px 8px
Border Radius: 6px
Icon: ✓
```

#### Error Badge
```
Background: rgba(255, 71, 87, 0.2)
Border: 1px solid #FF4757
Text: #FF4757
Font: 12px, Weight 500
Padding: 4px 8px
Border Radius: 6px
Icon: ✕
```

#### Warning Badge
```
Background: rgba(245, 158, 11, 0.2)
Border: 1px solid #F59E0B
Text: #F59E0B
Font: 12px, Weight 500
Padding: 4px 8px
Border Radius: 6px
Icon: ⚠
```

### Modaller (Modals)

```
Overlay:
  - Background: rgba(0, 0, 0, 0.7)
  - Backdrop Filter: blur(4px)
  - Animation: Fade-in 0.3s ease

Content:
  - Background: #1A1F29
  - Border: 1px solid #2D3748
  - Border Radius: 16px
  - Padding: 32px
  - Max Width: 500px (Desktop), 90vw (Mobile)
  - Animation: Slide-up 0.3s ease + scale

Header:
  - Title: H2 (#F8F9FA)
  - Close Button: Top-right, 24x24px
  - Divider: 1px #2D3748

Body:
  - Padding: 24px 0
  - Text: 14px, #F8F9FA

Footer:
  - Divider: 1px #2D3748
  - Padding: 24px 0 0 0
  - Button Layout: Flex, Gap 12px
```

### Toast Bildirimler (Toast Notifications)

```
Position: Bottom-right, 16px margin
Max Width: 400px
Animation: Slide-in from right 0.3s ease

Success:
  - Background: #10B981
  - Icon: ✓ Circle, White
  - Duration: 4 seconds

Error:
  - Background: #FF4757
  - Icon: ✕ Circle, White
  - Duration: 6 seconds

Warning:
  - Background: #F59E0B
  - Icon: ⚠ Triangle, White
  - Duration: 5 seconds

Info:
  - Background: #3B82F6
  - Icon: ℹ Circle, White
  - Duration: 4 seconds
```

---

## 📱 Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| **Mobile** | 375px | 1 column, full-width, bottom nav |
| **Tablet** | 768px | 1-2 columns, stacked where needed |
| **Desktop** | 1920px | 2-3 columns, optimized spacing |

### Mobile Navigation
```
Position: Bottom fixed
Height: 56px
Items: 5 tabs
Active State: Blue accent (#006FFF)
Touch Target: Min 44x44px
```

---

## 🗂️ Sayfalar ve Ekranlar (Pages & Screens)

### [00] Design System
- Color Palette
- Typography Scales
- Spacing System
- Shadow & Elevation Guide
- Component Guidelines

### [01] Authentication (11 Screens)
1. Login (Desktop)
2. Login (Mobile)
3. Register (Desktop)
4. Register (Mobile)
5. 2FA Setup
6. 2FA Verification Modal
7. Email Verification
8. Forgot Password
9. Reset Password
10. KYC Submission
11. KYC Status

### [02] Wallet (8 Screens)
1. Wallet Dashboard (Desktop)
2. Wallet Dashboard (Mobile)
3. TRY Deposit Flow
4. Crypto Deposit
5. TRY Withdrawal
6. Crypto Withdrawal
7. Transaction History
8. Transaction Detail

### [03] Trading (12 Screens)
1. Trading Dashboard (Desktop)
2. Trading Dashboard (Mobile)
3. Order Book
4. Market Data Panel
5. Recent Trades
6. Order Entry Panel
7. Limit Order Form
8. Open Orders
9. Order History
10. Trade History
11. Order Confirmation Modal
12. Order Status

### [04] Alerts (4 Screens)
1. Price Alerts Page
2. Create Alert Form
3. Alert Confirmation
4. Alert History

### [05] Information (3 Screens)
1. Fee Structure
2. Trading Fees
3. Deposit/Withdrawal Fees

### [06] Components Library (11 Groups)
1. Buttons (Primary, Secondary, Danger) - All states
2. Input Fields - All states
3. Toggles & Checkboxes
4. Select Dropdowns
5. Modals & Dialogs
6. Toast Notifications
7. Status Badges
8. Cards & Containers
9. Tabs & Navigation
10. Loaders & States
11. Data Tables

---

## 🎯 Ekran Akışları (User Flows)

### Authentication Flow
```
RegisterPage
  ↓ [Email + Password]
VerifyEmailPage
  ↓ [Email Link]
LoginPage
  ↓ [Login]
TwoFactorSetupPage (if not enabled)
  ↓ [QR Code]
TwoFactorVerifyModal (if enabled)
  ↓ [Code]
KYCPage
  ↓ [Documents]
Dashboard (Success)
```

### Trading Flow
```
TradingPage
  ↓ [Order Book + Market Data]
OrderEntryPanel
  ├─ Market Order → Instant Fill
  └─ Limit Order → GTC/IOC/FOK Selection
  ↓ [Confirm]
OrderConfirmationModal
  ↓
OpenOrdersComponent
  ↓
OrderHistoryComponent
  ↓
TradeHistoryComponent (P&L Analysis)
```

### Wallet Flow
```
WalletDashboardPage
  ├─ [Para Yatır Button]
  │  ├─ TRY Deposit
  │  └─ Crypto Deposit
  └─ [Para Çek Button]
     ├─ TRY Withdrawal
     └─ Crypto Withdrawal
  ↓
TransactionHistoryPage
```

---

## 🎨 Design System Implementation Checklist

- [ ] Create all color styles (13 colors)
- [ ] Create all typography styles (6 styles)
- [ ] Create button components (Primary, Secondary, Danger)
- [ ] Create input field components (all states)
- [ ] Create card components
- [ ] Create badge components
- [ ] Create modal components
- [ ] Create toast notification components
- [ ] Create authentication screens (11 screens)
- [ ] Create wallet screens (8 screens)
- [ ] Create trading screens (12 screens)
- [ ] Create alert screens (4 screens)
- [ ] Create information screens (3 screens)
- [ ] Create responsive variants (mobile, tablet, desktop)
- [ ] Add interactions and prototypes
- [ ] Document all components
- [ ] Export for developers
- [ ] Conduct design review
- [ ] Get stakeholder approval
- [ ] Share with development team

---

## 🚀 Next Steps

1. **Open Figma File**: https://www.figma.com/design/quIyI228k8AvUwAB20rSFX/MyCrypto-Platform---Frontend-Design

2. **Set Up Design System**:
   - Create color styles
   - Create typography styles
   - Create spacing guide
   - Create component guidelines

3. **Build Component Library**:
   - Main components with variants
   - Document each component
   - Show all states and interactions

4. **Design All Screens**:
   - Follow the page structure
   - Use components consistently
   - Ensure responsive design

5. **Add Prototypes**:
   - Link screens together
   - Show user flows
   - Add micro-interactions

6. **Export and Share**:
   - Export design tokens
   - Create handoff documentation
   - Share with development team

---

## 📚 Resources

- Figma File: https://www.figma.com/design/quIyI228k8AvUwAB20rSFX/MyCrypto-Platform---Frontend-Design
- Design Spec JSON: figma_design_spec.json
- Plugin Script: figma_plugin.js
- React Frontend: /frontend/src

---

## ✅ Quality Checklist

- [ ] All colors match brand palette
- [ ] All typography follows hierarchy
- [ ] Spacing is consistent (8px grid)
- [ ] Components are reusable
- [ ] All states are documented
- [ ] Responsive designs created
- [ ] Accessibility standards met
- [ ] Design system documented
- [ ] Developer handoff ready
- [ ] Team has approved design

---

**Status**: Ready for Design Implementation ✨

**Last Updated**: 2025-11-24

**Design System Owner**: MyCrypto Platform Team
