/**
 * Deposit Fees Section - Breakdown of deposit fees by currency
 */

import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  CurrencyBitcoin as CurrencyBitcoinIcon,
  Token as TokenIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface DepositFeeInfo {
  currency: string;
  currencyIcon: React.ReactElement;
  fee: string;
  unit: string;
  time: string;
  method: string;
  notes: string;
  color: 'success' | 'warning' | 'info' | 'secondary';
  isFree: boolean;
}

const DEPOSIT_FEES: DepositFeeInfo[] = [
  {
    currency: 'TRY',
    currencyIcon: <AccountBalanceIcon />,
    fee: 'ÜCRETSİZ',
    unit: 'TRY',
    time: 'Hemen (Aynı Gün)',
    method: 'Banka Transferi (EFT/Havale)',
    notes: 'Minimum 100 TRY',
    color: 'success',
    isFree: true,
  },
  {
    currency: 'BTC',
    currencyIcon: <CurrencyBitcoinIcon />,
    fee: 'Ağ Ücreti',
    unit: 'BTC',
    time: '10+ dakika (Onay sayısına göre)',
    method: 'Bitcoin Blockchain',
    notes: 'Kullanıcı blockchain ağına ödeme yapar (~0.0001 - 0.001 BTC)',
    color: 'warning',
    isFree: false,
  },
  {
    currency: 'ETH',
    currencyIcon: <TokenIcon />,
    fee: 'Gas Ücreti',
    unit: 'ETH',
    time: '10+ dakika (Onay sayısına göre)',
    method: 'Ethereum Blockchain',
    notes: 'Kullanıcı Ethereum ağına gas ücreti öder (ağ yoğunluğuna bağlı)',
    color: 'info',
    isFree: false,
  },
  {
    currency: 'USDT',
    currencyIcon: <TokenIcon />,
    fee: 'Ağ Ücreti',
    unit: 'USDT',
    time: '10+ dakika (Blockchain\'e göre)',
    method: 'Blockchain (ERC-20/TRC-20)',
    notes: 'USDT ağ ücreti blockchain seçimine göre değişir',
    color: 'secondary',
    isFree: false,
  },
];

const DepositFeesSection: React.FC = () => {
  return (
    <Box sx={{ px: { xs: 2, sm: 3 } }}>
      {/* Overview */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Yatırım İşlemleri Ücretleri
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          MyCrypto Platform'a para yatırırken uygulanacak ücretler para birimine göre değişiklik gösterir.
          TRY yatırımlarınız için hiçbir ücret ödemezsiniz. Kripto para yatırımlarında ise blockchain ağ
          ücretleri kullanıcılar tarafından ödenir.
        </Typography>
      </Box>

      {/* Highlight Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ bgcolor: 'success.50', border: 2, borderColor: 'success.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6" fontWeight={700} color="success.main">
                  TRY Yatırımları ÜCRETSİZ!
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Türk Lirası yatırımlarınızda hiçbir ücret ödemezsiniz. Banka işlem ücretleri
                MyCrypto Platform tarafından karşılanır.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ bgcolor: 'info.50', border: 2, borderColor: 'info.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <InfoIcon color="info" />
                <Typography variant="h6" fontWeight={700} color="info.main">
                  Kripto Ağ Ücretleri
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                BTC, ETH ve USDT yatırımlarında blockchain ağ ücretleri kullanıcılar tarafından
                blockchain ağına ödenir. MyCrypto bu ücreti almaz.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fee Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Para Birimine Göre Yatırım Ücretleri
        </Typography>
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Para Birimi</strong></TableCell>
                <TableCell><strong>Ücret</strong></TableCell>
                <TableCell><strong>İşlem Süresi</strong></TableCell>
                <TableCell><strong>Yöntem</strong></TableCell>
                <TableCell><strong>Notlar</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DEPOSIT_FEES.map((fee, index) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {React.cloneElement(fee.currencyIcon, {
                        color: fee.color,
                        sx: { fontSize: 28 }
                      })}
                      <Typography variant="body1" fontWeight={700}>
                        {fee.currency}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={fee.fee}
                      color={fee.isFree ? 'success' : fee.color}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{fee.time}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{fee.method}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {fee.notes}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Detailed Explanations */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Detaylı Açıklamalar
        </Typography>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.50' }}>
          <Typography variant="subtitle1" fontWeight={700} color="success.main" gutterBottom>
            TRY Yatırımları (Türk Lirası)
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li><strong>Ücret:</strong> Tamamen ücretsiz! Banka işlem ücretleri platform tarafından karşılanır.</li>
            <li><strong>Minimum Tutar:</strong> 100 TRY</li>
            <li><strong>İşlem Süresi:</strong> Aynı gün içinde hesabınıza yansır (EFT/Havale ile)</li>
            <li><strong>Yöntem:</strong> Banka transferi (EFT veya Havale)</li>
            <li><strong>Avantaj:</strong> Hızlı, güvenli ve tamamen ücretsiz!</li>
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.50' }}>
          <Typography variant="subtitle1" fontWeight={700} color="warning.main" gutterBottom>
            BTC Yatırımları (Bitcoin)
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li><strong>Ücret:</strong> Bitcoin ağ ücreti (network fee) - ağın yoğunluğuna göre değişir</li>
            <li><strong>Tipik Ücret:</strong> 0.0001 - 0.001 BTC (ağ durumuna göre)</li>
            <li><strong>Kimin Ödediği:</strong> Kullanıcı, Bitcoin ağına doğrudan öder</li>
            <li><strong>İşlem Süresi:</strong> 10-60 dakika (blockchain onayı gerektirir, genelde 1-6 onay)</li>
            <li><strong>Not:</strong> MyCrypto bu ücreti almaz, tümüyle Bitcoin ağına ödenir</li>
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.50' }}>
          <Typography variant="subtitle1" fontWeight={700} color="info.main" gutterBottom>
            ETH Yatırımları (Ethereum)
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li><strong>Ücret:</strong> Ethereum gas ücreti - ağ yoğunluğuna göre değişken</li>
            <li><strong>Tipik Ücret:</strong> Ağ durumuna göre değişir (düşük/normal/yüksek)</li>
            <li><strong>Kimin Ödediği:</strong> Kullanıcı, Ethereum ağına doğrudan öder</li>
            <li><strong>İşlem Süresi:</strong> 10-30 dakika (blockchain onayı gerektirir)</li>
            <li><strong>Not:</strong> Gas ücreti anlık değişkenlik gösterir, işlem yapmadan önce kontrol edin</li>
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, bgcolor: 'secondary.50' }}>
          <Typography variant="subtitle1" fontWeight={700} color="secondary.main" gutterBottom>
            USDT Yatırımları (Tether)
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li><strong>Ücret:</strong> Blockchain ağ ücreti (ERC-20 veya TRC-20 seçiminize göre)</li>
            <li><strong>ERC-20 (Ethereum):</strong> Ethereum gas ücreti ödersiniz</li>
            <li><strong>TRC-20 (Tron):</strong> Tron ağ ücreti ödersiniz (genelde daha ucuz)</li>
            <li><strong>Kimin Ödediği:</strong> Kullanıcı, seçilen blockchain ağına öder</li>
            <li><strong>İşlem Süresi:</strong> Blockchain seçimine bağlı (10-30 dakika)</li>
          </Typography>
        </Paper>
      </Box>

      {/* Important Notice */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>Önemli Not:</strong> Kripto para yatırımlarında (BTC, ETH, USDT) blockchain ağ ücretleri
          anlık olarak değişkenlik gösterebilir. Bu ücretler blockchain ağının yoğunluğuna ve işlem
          önceliğinize bağlıdır. MyCrypto Platform bu ücretleri almaz - tamamı blockchain ağına ödenir.
          Yatırım yapmadan önce cüzdanınızda güncel ağ ücretini kontrol edebilirsiniz.
        </Typography>
      </Alert>
    </Box>
  );
};

export default DepositFeesSection;
