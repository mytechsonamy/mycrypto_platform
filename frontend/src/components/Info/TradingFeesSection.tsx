/**
 * Trading Fees Section - Maker vs Taker fee explanation with examples
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
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
} from '@mui/material';
import {
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface TradingFeeExample {
  type: 'MAKER' | 'TAKER';
  orderType: string;
  price: number;
  quantity: number;
  totalValue: number;
  feeRate: number;
  fee: number;
  finalCost: number;
}

const TRADING_FEES = {
  maker: 0.001, // 0.1%
  taker: 0.002, // 0.2%
};

const TRADING_FEE_EXAMPLES: TradingFeeExample[] = [
  {
    type: 'MAKER',
    orderType: 'Limit',
    price: 2850000,
    quantity: 0.5,
    totalValue: 1425000,
    feeRate: 0.001,
    fee: 1425,
    finalCost: 1426425,
  },
  {
    type: 'TAKER',
    orderType: 'Market',
    price: 2850000,
    quantity: 0.5,
    totalValue: 1425000,
    feeRate: 0.002,
    fee: 2850,
    finalCost: 1427850,
  },
];

const TradingFeesSection: React.FC = () => {
  return (
    <Box sx={{ px: { xs: 2, sm: 3 } }}>
      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Maker Fee Card */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              bgcolor: 'success.50',
              border: 2,
              borderColor: 'success.main',
              height: '100%',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ArrowUpwardIcon color="success" />
                <Typography variant="h5" fontWeight={700} color="success.main">
                  Maker Ücreti
                </Typography>
                <Chip
                  label="0.1%"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Typography variant="body1" paragraph>
                <strong>Tanım:</strong> Limit emirleri kullanarak emir defterine likidite sağlayan işlemler için uygulanır.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Emir defterinde bekleyen limit emirler
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Anında eşleşmeyen emirler
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Piyasaya likidite kazandıran emirler
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Avantaj:</strong> Likidite sağladığınız için daha düşük ücret ödersiniz!
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Taker Fee Card */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              bgcolor: 'warning.50',
              border: 2,
              borderColor: 'warning.main',
              height: '100%',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ArrowDownwardIcon color="warning" />
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  Taker Ücreti
                </Typography>
                <Chip
                  label="0.2%"
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Typography variant="body1" paragraph>
                <strong>Tanım:</strong> Market emirleri veya anında eşleşen limit emirleri için uygulanır.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Anında eşleşen market emirler
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Hızlı alım-satım için ideal
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Emir defterinden likidite alan emirler
              </Typography>
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Not:</strong> Anında işlem için biraz daha yüksek ücret ödersiniz.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* When Each Fee Applies */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Hangi Durumlarda Uygulanır?
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
              <Typography variant="subtitle1" fontWeight={700} color="success.main" gutterBottom>
                Maker Ücreti Örnekleri:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                <li>1 BTC'yi 2,850,000 TRY limit fiyatından almak istiyorsunuz ancak piyasada o fiyatta satıcı yok</li>
                <li>Emriniz emir defterine eklenir ve bir satıcı gelene kadar bekler</li>
                <li>Bir satıcı gelip sizin emrinizle eşleştiğinde, siz "maker" olursunuz</li>
                <li><strong>Ücret: 0.1%</strong></li>
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
              <Typography variant="subtitle1" fontWeight={700} color="warning.main" gutterBottom>
                Taker Ücreti Örnekleri:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                <li>1 BTC'yi market fiyatından hemen almak istiyorsunuz</li>
                <li>Sistem emir defterindeki en iyi satış emriyle sizi eşleştirir</li>
                <li>İşlem anında gerçekleşir, beklemezsiniz</li>
                <li><strong>Ücret: 0.2%</strong></li>
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Fee Calculation Examples */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Ücret Hesaplama Örnekleri
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Aşağıdaki tabloda aynı işlem için maker ve taker ücret karşılaştırmasını görebilirsiniz:
        </Typography>
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Senaryo</strong></TableCell>
                <TableCell><strong>Emir Tipi</strong></TableCell>
                <TableCell align="right"><strong>Fiyat (TRY)</strong></TableCell>
                <TableCell align="right"><strong>Miktar (BTC)</strong></TableCell>
                <TableCell align="right"><strong>Toplam Değer</strong></TableCell>
                <TableCell align="right"><strong>Ücret Oranı</strong></TableCell>
                <TableCell align="right"><strong>Ücret (TRY)</strong></TableCell>
                <TableCell align="right"><strong>Toplam Maliyet</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {TRADING_FEE_EXAMPLES.map((example, index) => (
                <TableRow
                  key={index}
                  sx={{
                    bgcolor: example.type === 'MAKER' ? 'success.50' : 'warning.50',
                    '&:hover': {
                      bgcolor: example.type === 'MAKER' ? 'success.100' : 'warning.100',
                    },
                  }}
                >
                  <TableCell>
                    <Chip
                      label={example.type}
                      color={example.type === 'MAKER' ? 'success' : 'warning'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>{example.orderType}</TableCell>
                  <TableCell align="right">
                    {example.price.toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell align="right">{example.quantity}</TableCell>
                  <TableCell align="right">
                    {example.totalValue.toLocaleString('tr-TR')} TRY
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${(example.feeRate * 100).toFixed(1)}%`}
                      size="small"
                      color={example.type === 'MAKER' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {example.fee.toLocaleString('tr-TR')} TRY
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {example.finalCost.toLocaleString('tr-TR')} TRY
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Fee Savings Tip */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>İpucu:</strong> Acil işlem yapmak zorunda değilseniz, limit emir kullanarak
          maker ücreti ödemek size %50 daha az ücret yükü getirir. Örnek: 1,425,000 TRY'lik
          bir işlemde 1,425 TRY tasarruf edersiniz!
        </Typography>
      </Alert>
    </Box>
  );
};

export default TradingFeesSection;
