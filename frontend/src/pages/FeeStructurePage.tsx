/**
 * Fee Structure Page - Comprehensive fee information for traders
 * Shows trading fees, deposit fees, withdrawal fees, and FAQ
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Send as SendIcon,
  HelpOutline as HelpOutlineIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import TradingFeesSection from '../components/Info/TradingFeesSection';
import DepositFeesSection from '../components/Info/DepositFeesSection';
import WithdrawalFeesSection from '../components/Info/WithdrawalFeesSection';
import FaqSection from '../components/Info/FaqSection';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`fee-tabpanel-${index}`}
      aria-labelledby={`fee-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `fee-tab-${index}`,
    'aria-controls': `fee-tabpanel-${index}`,
  };
};

const FeeStructurePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), {
    noSsr: true, // Disable SSR for tests
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumb navigation */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          href="/"
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
          Ana Sayfa
        </Link>
        <Typography
          sx={{ display: 'flex', alignItems: 'center' }}
          color="text.primary"
        >
          Ücret Yapısı
        </Typography>
      </Breadcrumbs>

      {/* Hero Section */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
          }}
        >
          Ücret Yapısı
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            maxWidth: '800px',
            mx: 'auto',
            fontSize: { xs: '1rem', sm: '1.25rem' },
          }}
        >
          MyCrypto Platform'da işlem yaparken uygulanacak tüm ücretler hakkında detaylı bilgi edinin.
          Maker/Taker ücretleri, yatırım ve çekim işlem maliyetlerini şeffaf bir şekilde paylaşıyoruz.
        </Typography>
      </Box>

      {/* Main Content with Tabs */}
      <Paper elevation={2} sx={{ borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              minHeight: { xs: 56, sm: 64 },
            },
          }}
        >
          <Tab
            icon={<TrendingUpIcon />}
            iconPosition="start"
            label="İşlem Ücretleri"
            {...a11yProps(0)}
          />
          <Tab
            icon={<AccountBalanceIcon />}
            iconPosition="start"
            label="Yatırım Ücretleri"
            {...a11yProps(1)}
          />
          <Tab
            icon={<SendIcon />}
            iconPosition="start"
            label="Çekim Ücretleri"
            {...a11yProps(2)}
          />
          <Tab
            icon={<HelpOutlineIcon />}
            iconPosition="start"
            label="Sık Sorulan Sorular"
            {...a11yProps(3)}
          />
        </Tabs>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <TradingFeesSection />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <DepositFeesSection />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <WithdrawalFeesSection />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <FaqSection />
        </TabPanel>
      </Paper>

      {/* Disclaimer */}
      <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>Önemli Notlar:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2, m: 0 }}>
          <li>Blockchain ağ ücretleri (BTC, ETH, USDT) anlık olarak değişkenlik gösterebilir ve ağın yoğunluğuna bağlıdır.</li>
          <li>TRY yatırımlarınız için banka işlem ücreti MyCrypto Platform tarafından karşılanmaktadır.</li>
          <li>Tüm ücret oranları önceden bildirimde bulunularak güncellenebilir.</li>
          <li>İşlem yapmadan önce lütfen güncel ücret bilgilerini kontrol ediniz.</li>
        </Typography>
      </Box>
    </Container>
  );
};

export default FeeStructurePage;
