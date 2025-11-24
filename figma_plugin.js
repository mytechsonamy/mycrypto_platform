/**
 * MyCrypto Platform - Figma Design Plugin
 * Creates design system, screens, and components programmatically
 *
 * To use this:
 * 1. Open the Figma file
 * 2. Plugins > Development > New plugin
 * 3. Paste this code into the main.ts file
 * 4. Run the plugin
 */

// Color palette
const COLORS = {
  'Primary Blue': '#006FFF',
  'Electric Purple': '#7C3AED',
  'Vibrant Cyan': '#00D9FF',
  'Success Green': '#10B981',
  'Danger Red': '#FF4757',
  'Warning Orange': '#F59E0B',
  'Info Blue': '#3B82F6',
  'Dark BG': '#0F1419',
  'Card BG': '#1A1F29',
  'Border': '#2D3748',
  'Text Primary': '#F8F9FA',
  'Text Secondary': '#A8ADB5',
  'Placeholder': '#666B77',
};

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };

  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

// Create a frame
function createFrame(name, width, height, x = 0, y = 0, parent = figma.currentPage) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(width, height);
  frame.x = x;
  frame.y = y;
  frame.fills = [{ type: 'SOLID', color: hexToRgb('#0F1419') }];
  parent.appendChild(frame);
  return frame;
}

// Create a section frame
function createSection(name, x = 0, y = 0) {
  const section = figma.createSection();
  section.name = name;
  section.x = x;
  section.y = y;
  figma.currentPage.appendChild(section);
  return section;
}

// Create color palette display
function createColorPalette() {
  const section = createSection('[00] Design System', 0, 0);

  const frame = createFrame('Color Palette', 1920, 1200, 0, 0, figma.currentPage);
  frame.parent = figma.currentPage;

  // Title
  const title = figma.createText();
  title.characters = 'Color Palette';
  title.fontSize = 32;
  title.fontWeight = 700;
  title.fills = [{ type: 'SOLID', color: hexToRgb('#F8F9FA') }];
  title.x = 40;
  title.y = 40;
  frame.appendChild(title);

  // Color items
  let yPos = 140;
  Object.entries(COLORS).forEach(([name, hex]) => {
    // Color swatch
    const swatch = figma.createRectangle();
    swatch.resize(80, 80);
    swatch.x = 40;
    swatch.y = yPos;
    swatch.fills = [{ type: 'SOLID', color: hexToRgb(hex) }];
    swatch.strokeWeight = 1;
    swatch.strokes = [{ type: 'SOLID', color: hexToRgb('#2D3748') }];
    frame.appendChild(swatch);

    // Color name
    const colorName = figma.createText();
    colorName.characters = name;
    colorName.fontSize = 14;
    colorName.fontWeight = 600;
    colorName.fills = [{ type: 'SOLID', color: hexToRgb('#F8F9FA') }];
    colorName.x = 140;
    colorName.y = yPos;
    frame.appendChild(colorName);

    // Color hex value
    const hexValue = figma.createText();
    hexValue.characters = hex;
    hexValue.fontSize = 12;
    hexValue.fontWeight = 400;
    hexValue.fills = [{ type: 'SOLID', color: hexToRgb('#A8ADB5') }];
    hexValue.x = 140;
    hexValue.y = yPos + 24;
    frame.appendChild(hexValue);

    yPos += 100;
  });

  return frame;
}

// Create button components
function createButtonComponents() {
  const frame = createFrame('Button Components', 1920, 1000, 1920, 0, figma.currentPage);

  // Title
  const title = figma.createText();
  title.characters = 'Button Components';
  title.fontSize = 32;
  title.fontWeight = 700;
  title.fills = [{ type: 'SOLID', color: hexToRgb('#F8F9FA') }];
  title.x = 40;
  title.y = 40;
  frame.appendChild(title);

  // Primary Button
  let xPos = 40;
  let yPos = 140;

  const buttonStates = ['Default', 'Hover', 'Active', 'Disabled'];

  buttonStates.forEach((state) => {
    // Button background
    const btn = figma.createRectangle();
    btn.resize(200, 48);
    btn.x = xPos;
    btn.y = yPos;
    btn.cornerRadius = 8;

    if (state === 'Disabled') {
      btn.fills = [{ type: 'SOLID', color: hexToRgb('#006FFF'), opacity: 0.5 }];
    } else {
      btn.fills = [{ type: 'SOLID', color: hexToRgb('#006FFF') }];
    }

    frame.appendChild(btn);

    // Button text
    const btnText = figma.createText();
    btnText.characters = `Primary (${state})`;
    btnText.fontSize = 14;
    btnText.fontWeight = 600;
    btnText.fills = [{ type: 'SOLID', color: hexToRgb('#F8F9FA') }];
    btnText.x = xPos + 20;
    btnText.y = yPos + 12;
    frame.appendChild(btnText);

    xPos += 240;
  });

  return frame;
}

// Create authentication screens
function createAuthScreens() {
  const section = createSection('[01] Authentication', 0, 2000);

  // Login screen
  const loginFrame = createFrame('Login (Desktop)', 1920, 1080, 0, 2000, figma.currentPage);

  // Add background
  loginFrame.fills = [{ type: 'SOLID', color: hexToRgb('#0F1419') }];

  // Title
  const title = figma.createText();
  title.characters = 'Login Screen';
  title.fontSize = 32;
  title.fontWeight = 700;
  title.fills = [{ type: 'SOLID', color: hexToRgb('#F8F9FA') }];
  title.x = 960 - 100;
  title.y = 100;
  loginFrame.appendChild(title);

  // Subtitle
  const subtitle = figma.createText();
  subtitle.characters = 'Desktop Layout (1920x1080)';
  subtitle.fontSize = 14;
  subtitle.fontWeight = 400;
  subtitle.fills = [{ type: 'SOLID', color: hexToRgb('#A8ADB5') }];
  subtitle.x = 960 - 150;
  subtitle.y = 150;
  loginFrame.appendChild(subtitle);

  return loginFrame;
}

// Create wallet screens
function createWalletScreens() {
  const section = createSection('[02] Wallet', 1920, 2000);

  const walletFrame = createFrame('Wallet Dashboard (Desktop)', 1920, 1080, 1920, 2000, figma.currentPage);
  walletFrame.fills = [{ type: 'SOLID', color: hexToRgb('#0F1419') }];

  // Title
  const title = figma.createText();
  title.characters = 'Wallet Dashboard';
  title.fontSize = 32;
  title.fontWeight = 700;
  title.fills = [{ type: 'SOLID', color: hexToRgb('#F8F9FA') }];
  title.x = 40;
  title.y = 40;
  walletFrame.appendChild(title);

  // Balance card (gradient)
  const balanceCard = figma.createRectangle();
  balanceCard.resize(600, 200);
  balanceCard.x = 40;
  balanceCard.y = 140;
  balanceCard.cornerRadius = 12;
  balanceCard.fills = [
    {
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { color: hexToRgb('#006FFF'), position: 0 },
        { color: hexToRgb('#7C3AED'), position: 1 }
      ]
    }
  ];
  balanceCard.strokes = [{ type: 'SOLID', color: hexToRgb('#2D3748') }];
  balanceCard.strokeWeight = 1;
  walletFrame.appendChild(balanceCard);

  // Balance text
  const balanceText = figma.createText();
  balanceText.characters = '₺245,850.50';
  balanceText.fontSize = 28;
  balanceText.fontWeight = 700;
  balanceText.fills = [{ type: 'SOLID', color: hexToRgb('#F8F9FA') }];
  balanceText.x = 60;
  balanceText.y = 170;
  walletFrame.appendChild(balanceText);

  return walletFrame;
}

// Create trading screens
function createTradingScreens() {
  const section = createSection('[03] Trading', 0, 3100);

  const tradingFrame = createFrame('Trading Dashboard (Desktop)', 1920, 1080, 0, 3100, figma.currentPage);
  tradingFrame.fills = [{ type: 'SOLID', color: hexToRgb('#0F1419') }];

  // Title
  const title = figma.createText();
  title.characters = 'Trading Dashboard';
  title.fontSize = 32;
  title.fontWeight = 700;
  title.fills = [{ type: 'SOLID', color: hexToRgb('#F8F9FA') }];
  title.x = 40;
  title.y = 40;
  tradingFrame.appendChild(title);

  // Buy side (green)
  const buyCard = figma.createRectangle();
  buyCard.resize(600, 400);
  buyCard.x = 40;
  buyCard.y = 140;
  buyCard.cornerRadius = 12;
  buyCard.fills = [{ type: 'SOLID', color: hexToRgb('#1A1F29') }];
  buyCard.strokes = [{ type: 'SOLID', color: hexToRgb('#10B981'), opacity: 0.3 }];
  buyCard.strokeWeight = 2;
  tradingFrame.appendChild(buyCard);

  const buyText = figma.createText();
  buyText.characters = 'BUY ORDERS';
  buyText.fontSize = 14;
  buyText.fontWeight = 600;
  buyText.fills = [{ type: 'SOLID', color: hexToRgb('#10B981') }];
  buyText.x = 60;
  buyText.y = 160;
  tradingFrame.appendChild(buyText);

  // Sell side (red)
  const sellCard = figma.createRectangle();
  sellCard.resize(600, 400);
  sellCard.x = 680;
  sellCard.y = 140;
  sellCard.cornerRadius = 12;
  sellCard.fills = [{ type: 'SOLID', color: hexToRgb('#1A1F29') }];
  sellCard.strokes = [{ type: 'SOLID', color: hexToRgb('#FF4757'), opacity: 0.3 }];
  sellCard.strokeWeight = 2;
  tradingFrame.appendChild(sellCard);

  const sellText = figma.createText();
  sellText.characters = 'SELL ORDERS';
  sellText.fontSize = 14;
  sellText.fontWeight = 600;
  sellText.fills = [{ type: 'SOLID', color: hexToRgb('#FF4757') }];
  sellText.x = 700;
  sellText.y = 160;
  tradingFrame.appendChild(sellText);

  return tradingFrame;
}

// Main function
async function main() {
  console.log('🎨 Creating MyCrypto Platform Design System...\n');

  try {
    // Create design system
    console.log('📐 Creating design system...');
    createColorPalette();
    createButtonComponents();
    console.log('✅ Design system created\n');

    // Create screens
    console.log('📄 Creating authentication screens...');
    createAuthScreens();
    console.log('✅ Authentication screens created\n');

    console.log('💰 Creating wallet screens...');
    createWalletScreens();
    console.log('✅ Wallet screens created\n');

    console.log('📊 Creating trading screens...');
    createTradingScreens();
    console.log('✅ Trading screens created\n');

    console.log('🎉 Design system setup complete!');
    console.log('\n✨ Figma file has been populated with:');
    console.log('   • Color palette (13 colors)');
    console.log('   • Button components');
    console.log('   • Authentication screens');
    console.log('   • Wallet screens');
    console.log('   • Trading screens');
    console.log('\n📋 Next steps:');
    console.log('   1. Check your Figma file');
    console.log('   2. Continue adding remaining screens manually');
    console.log('   3. Create reusable components');
    console.log('   4. Add interactions and prototypes');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the main function
main();

// Show notification
figma.notify('MyCrypto Design System Created! ✨', { timeout: 3 });
