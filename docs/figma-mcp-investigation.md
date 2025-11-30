# Figma MCP Tools - Investigation Report

## Summary
The Figma MCP extension is installed in Claude Desktop, but the tools are not currently accessible through the CLI environment. The MCP tools require the Figma desktop app to be running with Dev Mode enabled.

## Available Figma MCP Tools

Based on the extension manifest, the following tools are available when properly configured:

### 1. `get_design_context`
**Description:** Generate UI code for a given node or the currently selected node in the Figma desktop app.
**Parameters:** 
- `nodeId` (optional): Specify a node ID. If no node ID is provided, the currently selected node will be used.
- Supports URL extraction: If given `https://figma.com/design/:fileKey/:fileName?node-id=1-2`, extracts nodeId as `1:2`

### 2. `get_screenshot`
**Description:** Generate a screenshot for a given node or the currently selected node in the Figma desktop app.
**Parameters:**
- `nodeId` (optional): Specify a node ID. If no node ID is provided, the currently selected node will be used.
- Supports URL extraction from Figma URLs

### 3. `get_metadata`
**Description:** Get metadata for a node or page in the Figma desktop app in XML format.
**Use case:** Getting an overview of structure (includes node IDs, layer types, names, positions, and sizes)
**Parameters:**
- `nodeId` (optional): Can be a node ID or page ID (e.g., "0:1")
- Supports URL extraction from Figma URLs

### 4. `get_variable_defs`
**Description:** Get variable definitions for a given node ID.
**Returns:** Reusable values like `{'icon/default/secondary': '#949494'}`
**Use case:** Variables for fonts, colors, sizes, and spacings
**Parameters:**
- `nodeId` (optional): Specify a node ID

### 5. `get_code_connect_map`
**Description:** Get a mapping of Figma nodes to code components.
**Returns:** `{[nodeId]: {codeConnectSrc: 'location in codebase', codeConnectName: 'component name'}}`
**Example:** `{'1:2': { codeConnectSrc: 'https://github.com/foo/components/Button.tsx', codeConnectName: 'Button' }}`
**Parameters:**
- `nodeId` (optional): Specify a node ID

### 6. `add_code_connect_map`
**Description:** Map the currently selected Figma node to a code component in your codebase using Code Connect.
**Use case:** Creating connections between Figma designs and actual code components

### 7. `create_design_system_rules`
**Description:** Provides a prompt to generate design system rules for the repository.
**Use case:** Analyzing codebase and creating comprehensive design system documentation

## Current Status

### Extension Installation
✅ **INSTALLED** - Figma MCP Extension v1.0.4
- Location: `/Users/musti/Library/Application Support/Claude/Claude Extensions/ant.dir.ant.figma.figma/`
- Manifest confirmed with all 7 tools registered
- Extension properly configured in Claude Desktop

### Figma Desktop App
⚠️ **RUNNING** - Figma Agent is running
- Process: `figma_agent` (PID: 85936)
- However, Dev Mode MCP Server is not active

### MCP Server Status
❌ **NOT RUNNING** - MCP Server at port 3845 is not accessible
- Expected endpoint: `http://127.0.0.1:3845/mcp`
- Expected SSE endpoint: `http://127.0.0.1:3845/sse`
- Connection refused - server not started

### Figma File Access
✅ **ACCESSIBLE** - Can access Figma file via REST API
- File ID: `quIyI228k8AvUwAB20rSFX`
- File Name: "MyCrypto Platform - Frontend Design"
- Access token is valid and working
- Current structure:
  - Document root (0:0)
  - Page 1 (0:1)
  - Frame 1 (1:2) - empty white frame 100x100

## What Operations Can Be Performed

### Via Figma REST API (Currently Available)
✅ **Read Operations:**
- Get file structure and metadata
- Get file versions
- Get comments
- Export images and screenshots
- Get file thumbnails

❌ **Cannot Do:**
- Create new frames, pages, or components
- Modify existing designs
- Create design system elements
- Add text or shapes
- Modify colors or styles

### Via Figma MCP Tools (Requires Setup)
When properly configured, MCP tools can:
- Generate code from selected designs
- Extract design tokens and variables
- Get component metadata
- Create code connections
- Generate design system rules

### Via Figma Plugin API (Alternative)
To create design elements, you would need:
- A custom Figma plugin
- Runs inside the Figma desktop app
- Full access to create/modify designs

## Setup Instructions for MCP Tools

To enable the Figma MCP tools:

1. **Open Figma Desktop App**
   - Ensure you have the latest version installed
   - Launch the application

2. **Open a Design File**
   - Create or open your design file (quIyI228k8AvUwAB20rSFX)
   - Make sure you're in a design file, not just the file browser

3. **Enable Dev Mode MCP Server**
   - Click the Figma menu in the upper-left corner
   - Go to Preferences
   - Find and enable "Enable Dev Mode MCP Server"

4. **Open Dev Mode**
   - Switch to Dev Mode in your design file
   - The Dev Mode inspect panel should show MCP Server options

5. **Restart Claude Desktop**
   - Completely quit Claude Desktop app
   - Relaunch the application
   - The MCP tools should now be available

6. **Verify Connection**
   - The MCP server should be running on `http://127.0.0.1:3845`
   - Tools will be prefixed with the extension name in Claude Desktop

## Alternative Approaches

### 1. Manual Design Creation
- Open Figma desktop app directly
- Create design system pages manually
- Use the provided file ID: `quIyI228k8AvUwAB20rSFX`

### 2. Figma Community Resources
- Search Figma Community for crypto trading UI kits
- Duplicate existing design systems
- Customize for MyCrypto Platform needs

### 3. Design System as Code
- Create design tokens in JSON format
- Use tools like Style Dictionary
- Export to Figma later via plugins

### 4. Figma Plugin Development
- Create a custom plugin to automate design creation
- Use Figma Plugin API
- Run within Figma desktop app

## Recommended Design System Structure

For your MyCrypto Platform, I recommend creating these pages in Figma:

### Page 1: Design Tokens
**Colors:**
- Primary: #0052FF (Brand Blue)
- Secondary: #00D4AA (Crypto Green)
- Success: #00C853
- Warning: #FFB300
- Error: #E53935
- Neutral/Gray Scale: #000000, #212121, #424242, #757575, #BDBDBD, #E0E0E0, #F5F5F5, #FFFFFF
- Background: #0A0E27 (Dark), #FFFFFF (Light)
- Surface: #1A1F3A (Dark), #F8F9FA (Light)

**Typography:**
- Font Family: Inter (Primary), Roboto Mono (Code/Numbers)
- Heading 1: 48px/56px, Bold
- Heading 2: 36px/44px, SemiBold
- Heading 3: 28px/36px, SemiBold
- Heading 4: 24px/32px, Medium
- Body Large: 18px/28px, Regular
- Body: 16px/24px, Regular
- Body Small: 14px/20px, Regular
- Caption: 12px/16px, Regular
- Code: Roboto Mono 14px/20px

**Spacing Scale:**
- 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px

**Border Radius:**
- Small: 4px (inputs, small buttons)
- Medium: 8px (cards, modals)
- Large: 16px (containers)
- Round: 9999px (pills, avatars)

**Shadows:**
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.07)
- lg: 0 10px 15px rgba(0,0,0,0.1)
- xl: 0 20px 25px rgba(0,0,0,0.15)

### Page 2: Components
**Buttons:**
- Primary (solid, gradient option)
- Secondary (outline)
- Tertiary (text only)
- Icon buttons
- Sizes: Small, Medium, Large
- States: Default, Hover, Active, Disabled, Loading

**Form Inputs:**
- Text Input (single line)
- Text Area (multi-line)
- Select Dropdown
- Search Input (with icon)
- Number Input (for crypto amounts)
- States: Default, Focus, Error, Disabled, Success

**Cards:**
- Basic Card
- Asset Card (crypto currency display)
- Trade Card (order book entry)
- Alert Card (notification)
- Stats Card (metrics display)

**Navigation:**
- Top Navigation Bar
- Side Navigation Menu
- Tab Bar
- Breadcrumbs
- Pagination

**Data Display:**
- Table (for order history)
- List Items
- Price Ticker
- Chart Container
- Badge/Label
- Progress Indicators

**Modals & Overlays:**
- Modal Dialog
- Drawer/Sidebar
- Tooltip
- Popover
- Toast Notification

### Page 3: Authentication Screens
1. **Login Screen**
   - Email/username input
   - Password input
   - "Remember me" checkbox
   - Login button
   - "Forgot password?" link
   - "Sign up" link
   - Social login options

2. **Register Screen**
   - Email input
   - Username input
   - Password input
   - Confirm password input
   - Terms acceptance checkbox
   - Sign up button
   - "Already have an account?" link

3. **Forgot Password Screen**
   - Email input
   - Submit button
   - Back to login link

4. **2FA Verification Screen**
   - 6-digit code input
   - Verify button
   - Resend code link

### Page 4: Wallet Screens
1. **Wallet Overview**
   - Total balance display
   - Asset list with balances
   - Quick actions (deposit, withdraw, transfer)
   - Recent transactions

2. **Wallet Details**
   - Single asset view
   - Balance and value in USD
   - Price chart
   - Action buttons (buy, sell, send, receive)
   - Transaction history

3. **Deposit Screen**
   - Asset selection
   - Wallet address display
   - QR code
   - Copy address button
   - Network selection

4. **Withdraw Screen**
   - Asset selection
   - Recipient address input
   - Amount input
   - Network selection
   - Fee display
   - Confirm button

### Page 5: Trading Screens
1. **Trading Dashboard**
   - Order book (bids/asks)
   - Price chart
   - Trading pair selector
   - Order form (buy/sell)
   - Open orders list
   - Trade history

2. **Order Form**
   - Order type selector (Market, Limit, Stop)
   - Price input (for limit orders)
   - Amount input
   - Total calculation
   - Available balance display
   - Buy/Sell buttons

3. **Order Book**
   - Price column
   - Amount column
   - Total column
   - Visual depth indicator
   - Spread display

4. **Portfolio View**
   - Asset allocation chart
   - Holdings table
   - Performance metrics
   - Profit/Loss indicators

### Page 6: Alerts Screens
1. **Alerts List**
   - Active alerts
   - Triggered alerts
   - Create new alert button
   - Filter options

2. **Create Alert Screen**
   - Asset selection
   - Condition type (price above/below, % change)
   - Target value input
   - Notification preferences
   - Create alert button

3. **Alert Detail Screen**
   - Alert conditions
   - Current status
   - Alert history
   - Edit/Delete options

4. **Notifications Panel**
   - Recent notifications
   - Alert triggers
   - System messages
   - Mark as read option

## Next Steps

1. **Enable Figma MCP Server** (if you want to use MCP tools)
   - Follow the setup instructions above
   - Restart Claude Desktop
   - MCP tools will become available

2. **Manual Design Creation** (immediate option)
   - Open Figma desktop app
   - Navigate to file: https://www.figma.com/file/quIyI228k8AvUwAB20rSFX
   - Create pages and frames based on the structure above

3. **Use Figma Community** (quick start option)
   - Search for "crypto trading UI kit"
   - Search for "dark mode design system"
   - Duplicate and customize

4. **Design Tokens First** (code-based approach)
   - Create design tokens in your codebase
   - Use Style Dictionary for transformation
   - Apply in your React components
   - Document in Storybook

## Useful Resources

- Figma MCP Documentation: https://help.figma.com/hc/en-us/articles/32132100833559
- Figma REST API: https://www.figma.com/developers/api
- Figma Plugin API: https://www.figma.com/plugin-docs/
- Model Context Protocol: https://modelcontextprotocol.io/
- Your Figma File: https://www.figma.com/file/quIyI228k8AvUwAB20rSFX

## Contact Information

**File Details:**
- File ID: `quIyI228k8AvUwAB20rSFX`
- File Name: "MyCrypto Platform - Frontend Design"
- Access Level: Owner
- Last Modified: 2025-11-24T16:44:48Z

**API Access:**
- Token: (provided and verified)
- API endpoint: `https://api.figma.com/v1`
- Rate limits: Standard Figma API limits apply
