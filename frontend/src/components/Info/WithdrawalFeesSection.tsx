/**
 * Withdrawal Fees Section - Breakdown of withdrawal fees by currency
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
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface WithdrawalFeeInfo {
  currency: string;
  currencyIcon: React.ReactElement;
  fee: string;
  unit: string;
  time: string;
  minimum: string;
  notes: string;
  color: 'success' | 'warning' | 'info' | 'secondary';
}

const WITHDRAWAL_FEES: WithdrawalFeeInfo[] = [
  {
    currency: 'TRY',
    currencyIcon: <AccountBalanceIcon />,
    fee: '10 TRY',
    unit: 'TRY',
    time: '1-2 İş Günü',
    minimum: '100 TRY',
    notes: 'Banka işlem ücreti (EFT)',
    color: 'success',
  },
  {
    currency: 'BTC',
    currencyIcon: <CurrencyBitcoinIcon />,
    fee: '0.0005 BTC',
    unit: 'BTC',
    time: '30-60 dakika',
    minimum: '0.001 BTC',
    notes: 'Bitcoin ağ ücreti (kullanıcı öder)',
    color: 'warning',
  },
  {
    currency: 'ETH',
    currencyIcon: <TokenIcon />,
    fee: 'Gas Ücreti',
    unit: 'ETH',
    time: '10-30 dakika',
    minimum: '0.01 ETH',
    notes: 'Ethereum gas ücreti (değişken, ağ durumuna bağlı)',
    color: 'info',
  },
  {
    currency: 'USDT',
    currencyIcon: <TokenIcon />,
    fee: 'Ağ Ücreti',
    unit: 'USDT',
    time: '10-30 dakika',
    minimum: '10 USDT',
    notes: 'Blockchain ağ ücreti (ERC-20/TRC-20 seçimine göre)',
    color: 'secondary',
  },
];

const WithdrawalFeesSection: React.FC = () => {
  return (
    <Box sx={{ px: { xs: 2, sm: 3 } }}>
      {/* Overview */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Çekim İşlemleri Ücretleri
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          MyCrypto Platform'dan para çekerken uygulanacak ücretler para birimine ve yönteme göre
          değişiklik gösterir. TRY çekimlerinde sabit ücret, kripto para çekimlerinde ise blockchain
          ağ ücretleri uygulanır.
        </Typography>
      </Box>

      {/* Warning Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ bgcolor: 'warning.50', border: 2, borderColor: 'warning.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WarningIcon color="warning" />
                <Typography variant="h6" fontWeight={700} color="warning.main">
                  Minimum Çekim Tutarları
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Her para birimi için minimum çekim tutarları belirlenmiştir. Bu tutarların altında
                çekim işlemi gerçekleştiremezsiniz.
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
                  Blockchain Ücretleri
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Kripto para çekimlerinde blockchain ağ ücretleri kullanıcı tarafından ödenir.
                Bu ücretler anlık olarak ağ yoğunluğuna göre değişir.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fee Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Para Birimine Göre Çekim Ücretleri
        </Typography>
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Para Birimi</strong></TableCell>
                <TableCell><strong>Ücret</strong></TableCell>
                <TableCell><strong>İşlem Süresi</strong></TableCell>
                <TableCell><strong>Minimum Tutar</strong></TableCell>
                <TableCell><strong>Notlar</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {WITHDRAWAL_FEES.map((fee, index) => (
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
                      color={fee.color}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{fee.time}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {fee.minimum}
                    </Typography>
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
            TRY Çekimleri (Türk Lirası)
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li><strong>Ücret:</strong> Sabit 10 TRY (banka işlem ücreti)</li>
            <li><strong>Minimum Tutar:</strong> 100 TRY</li>
            <li><strong>İşlem Süresi:</strong> 1-2 iş günü (banka EFT işlem süresi)</li>
            <li><strong>Yöntem:</strong> Kayıtlı banka hesabınıza EFT ile gönderilir</li>
            <li><strong>Not:</strong> 10 TRY sabit ücret, banka işlem maliyetlerini karşılar</li>
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.50' }}>
          <Typography variant="subtitle1" fontWeight={700} color="warning.main" gutterBottom>
            BTC Çekimleri (Bitcoin)
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li><strong>Ücret:</strong> Tipik olarak 0.0005 BTC (Bitcoin ağ ücreti)</li>
            <li><strong>Minimum Tutar:</strong> 0.001 BTC</li>
            <li><strong>Kimin Ödediği:</strong> Kullanıcı, Bitcoin ağına güvenlik için öder</li>
            <li><strong>İşlem Süresi:</strong> 30-60 dakika (blockchain onay süresi, genelde 3-6 onay)</li>
            <li><strong>Neden Ücret Var?:</strong> Bitcoin madencilerine işleminizi onaylamaları için ödeme</li>
            <li><strong>Ücret Değişimi:</strong> Ağ yoğunluğuna göre değişebilir, işlem öncesi kontrol edin</li>
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.50' }}>
          <Typography variant="subtitle1" fontWeight={700} color="info.main" gutterBottom>
            ETH Çekimleri (Ethereum)
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li><strong>Ücret:</strong> Ethereum gas ücreti (değişken, ağ yoğunluğuna göre)</li>
            <li><strong>Minimum Tutar:</strong> 0.01 ETH</li>
            <li><strong>Kimin Ödediği:</strong> Kullanıcı, Ethereum ağına öder</li>
            <li><strong>İşlem Süresi:</strong> 10-30 dakika (blockchain onay süresi)</li>
            <li><strong>Gas Ücreti Nedir?:</strong> Ethereum ağında işlem yapmak için gereken yakıt</li>
            <li><strong>Değişkenlik:</strong> Ağ yoğunluğuna göre düşük/normal/yüksek olabilir</li>
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, bgcolor: 'secondary.50' }}>
          <Typography variant="subtitle1" fontWeight={700} color="secondary.main" gutterBottom>
            USDT Çekimleri (Tether)
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li><strong>Ücret:</strong> Blockchain ağ ücreti (ERC-20 veya TRC-20 seçiminize göre)</li>
            <li><strong>Minimum Tutar:</strong> 10 USDT</li>
            <li><strong>ERC-20 (Ethereum):</strong> Ethereum gas ücreti ödersiniz (genelde daha pahalı)</li>
            <li><strong>TRC-20 (Tron):</strong> Tron ağ ücreti ödersiniz (genelde daha ucuz)</li>
            <li><strong>İşlem Süresi:</strong> Blockchain seçimine bağlı (10-30 dakika)</li>
            <li><strong>Tavsiye:</strong> Düşük ücretli işlemler için TRC-20 tercih edebilirsiniz</li>
          </Typography>
        </Paper>
      </Box>

      {/* Fee Responsibility Explanation */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Ücretleri Kim Öder?
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.main' }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
                Platform Ücretleri
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>TRY Çekimleri:</strong> 10 TRY sabit ücret, banka işlem maliyetlerini karşılar.
                Bu ücret MyCrypto Platform tarafından alınır ve banka transferi için kullanılır.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'warning.50', border: 1, borderColor: 'warning.main' }}>
              <Typography variant="subtitle1" fontWeight={700} color="warning.main" gutterBottom>
                Blockchain Ücretleri
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Kripto Çekimleri (BTC, ETH, USDT):</strong> Blockchain ağ ücretleri kullanıcı
                tarafından blockchain ağına ödenir. MyCrypto bu ücretleri almaz - tamamı blockchain
                madencilerine/validatörlere gider.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Important Notices */}
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Dikkat:</strong> Çekim işlemlerinizde doğru adres bilgilerini girdiğinizden emin olun.
          Blockchain işlemleri geri alınamaz! Yanlış adrese gönderilen kripto paralar kurtarılamaz.
          Küçük bir test çekimi yaparak adresi doğrulamanız önerilir.
        </Typography>
      </Alert>

      <Alert severity="info">
        <Typography variant="body2">
          <strong>Bilgi:</strong> Kripto para çekim ücretleri (BTC, ETH, USDT) blockchain ağının
          anlık durumuna göre değişebilir. Çekim işlemi yapmadan önce sistemimiz size güncel ağ
          ücretini gösterecektir. Yoğun zamanlarda ağ ücretleri artabilir, bu normaldir.
        </Typography>
      </Alert>
    </Box>
  );
};

export default WithdrawalFeesSection;
