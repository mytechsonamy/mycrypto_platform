/**
 * Market Analysis Panel Component
 * Comprehensive market analysis summary with buy/sell recommendations
 */

import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as NeutralIcon,
  Assessment as AssessmentIcon,
  ShowChart as ChartIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  MarketTrend,
  TradingSignal,
  RSISignal,
  MACDSignal,
  SMASignal,
  MarketAnalysis,
} from '../../../types/indicators.types';
import { TradingPair } from '../../../types/trading.types';

interface MarketAnalysisPanelProps {
  symbol: TradingPair;
  analysis: MarketAnalysis | null;
  loading?: boolean;
}

const MarketAnalysisPanel: React.FC<MarketAnalysisPanelProps> = ({
  symbol,
  analysis,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Get signal color
  const getSignalColor = (signal: TradingSignal): 'success' | 'error' | 'warning' | 'default' => {
    switch (signal) {
      case TradingSignal.STRONG_BUY:
      case TradingSignal.BUY:
        return 'success';
      case TradingSignal.STRONG_SELL:
      case TradingSignal.SELL:
        return 'error';
      case TradingSignal.NEUTRAL:
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get signal text
  const getSignalText = (signal: TradingSignal): string => {
    switch (signal) {
      case TradingSignal.STRONG_BUY:
        return 'Güçlü AL';
      case TradingSignal.BUY:
        return 'AL';
      case TradingSignal.NEUTRAL:
        return 'NÖTR';
      case TradingSignal.SELL:
        return 'SAT';
      case TradingSignal.STRONG_SELL:
        return 'Güçlü SAT';
      default:
        return 'NÖTR';
    }
  };

  // Get signal icon
  const getSignalIcon = (signal: TradingSignal) => {
    if (signal === TradingSignal.STRONG_BUY || signal === TradingSignal.BUY) {
      return <TrendingUpIcon />;
    } else if (signal === TradingSignal.STRONG_SELL || signal === TradingSignal.SELL) {
      return <TrendingDownIcon />;
    } else {
      return <NeutralIcon />;
    }
  };

  // Get trend color
  const getTrendColor = (trend: MarketTrend): string => {
    switch (trend) {
      case MarketTrend.STRONG_BULLISH:
      case MarketTrend.BULLISH:
        return theme.palette.success.main;
      case MarketTrend.STRONG_BEARISH:
      case MarketTrend.BEARISH:
        return theme.palette.error.main;
      case MarketTrend.NEUTRAL:
        return theme.palette.warning.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  // Get trend text
  const getTrendText = (trend: MarketTrend): string => {
    switch (trend) {
      case MarketTrend.STRONG_BULLISH:
        return 'Güçlü Yükseliş';
      case MarketTrend.BULLISH:
        return 'Yükseliş';
      case MarketTrend.NEUTRAL:
        return 'Nötr';
      case MarketTrend.BEARISH:
        return 'Düşüş';
      case MarketTrend.STRONG_BEARISH:
        return 'Güçlü Düşüş';
      default:
        return 'Belirsiz';
    }
  };

  // Get RSI signal text and color
  const getRSIInfo = (signal: RSISignal, value: number): { text: string; color: string } => {
    switch (signal) {
      case RSISignal.OVERSOLD:
        return { text: `Aşırı Satım (${value.toFixed(1)})`, color: theme.palette.success.main };
      case RSISignal.OVERBOUGHT:
        return { text: `Aşırı Alım (${value.toFixed(1)})`, color: theme.palette.error.main };
      case RSISignal.NEUTRAL:
        return { text: `Nötr (${value.toFixed(1)})`, color: theme.palette.info.main };
      default:
        return { text: 'Belirsiz', color: theme.palette.text.secondary };
    }
  };

  // Get MACD signal text and color
  const getMACDInfo = (signal: MACDSignal): { text: string; color: string } => {
    switch (signal) {
      case MACDSignal.BULLISH:
        return { text: 'Yükseliş Sinyali', color: theme.palette.success.main };
      case MACDSignal.BEARISH:
        return { text: 'Düşüş Sinyali', color: theme.palette.error.main };
      case MACDSignal.NEUTRAL:
        return { text: 'Nötr', color: theme.palette.warning.main };
      default:
        return { text: 'Belirsiz', color: theme.palette.text.secondary };
    }
  };

  // Get SMA signal text and color
  const getSMAInfo = (signal: SMASignal): { text: string; color: string; icon: React.ReactNode } => {
    switch (signal) {
      case SMASignal.ABOVE:
        return {
          text: 'Yukarıda',
          color: theme.palette.success.main,
          icon: <TrendingUpIcon fontSize="small" />,
        };
      case SMASignal.BELOW:
        return {
          text: 'Aşağıda',
          color: theme.palette.error.main,
          icon: <TrendingDownIcon fontSize="small" />,
        };
      case SMASignal.CROSSING_UP:
        return {
          text: 'Yukarı Kesiyor',
          color: theme.palette.success.dark,
          icon: <TrendingUpIcon fontSize="small" />,
        };
      case SMASignal.CROSSING_DOWN:
        return {
          text: 'Aşağı Kesiyor',
          color: theme.palette.error.dark,
          icon: <TrendingDownIcon fontSize="small" />,
        };
      default:
        return {
          text: 'Belirsiz',
          color: theme.palette.text.secondary,
          icon: <NeutralIcon fontSize="small" />,
        };
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Piyasa Analizi - {symbol.replace('_', '/')}
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Analiz yapılıyor...
        </Typography>
      </Paper>
    );
  }

  if (!analysis) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Piyasa Analizi - {symbol.replace('_', '/')}
        </Typography>
        <Alert severity="info">
          Analiz verisi bulunmamaktadır. Lütfen daha sonra tekrar deneyin.
        </Alert>
      </Paper>
    );
  }

  const rsiInfo = getRSIInfo(analysis.rsiSignal, analysis.rsiValue);
  const macdInfo = getMACDInfo(analysis.macdSignal);

  return (
    <Paper sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon />
          Piyasa Analizi - {symbol.replace('_', '/')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Son Güncelleme: {new Date(analysis.timestamp).toLocaleString('tr-TR')}
        </Typography>
      </Box>

      {/* Main Signal Card */}
      <Card
        sx={{
          mb: 3,
          bgcolor: getSignalColor(analysis.signal) === 'success'
            ? theme.palette.success.light
            : getSignalColor(analysis.signal) === 'error'
            ? theme.palette.error.light
            : theme.palette.warning.light,
          color: getSignalColor(analysis.signal) === 'success'
            ? theme.palette.success.contrastText
            : getSignalColor(analysis.signal) === 'error'
            ? theme.palette.error.contrastText
            : theme.palette.warning.contrastText,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Önerilen İşlem
              </Typography>
              <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                {getSignalIcon(analysis.signal)}
                {getSignalText(analysis.signal)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Güven Seviyesi
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                %{analysis.confidence.toFixed(0)}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2, borderColor: 'currentColor', opacity: 0.3 }} />
          <Typography variant="body2">
            {analysis.recommendation}
          </Typography>
        </CardContent>
      </Card>

      {/* Trend and Price */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Piyasa Trendi
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: getTrendColor(analysis.trend), fontWeight: 'bold' }}
              >
                {getTrendText(analysis.trend)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Güncel Fiyat
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {analysis.currentPrice.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} TRY
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Technical Indicators */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
        <ChartIcon />
        Teknik İndikatörler
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* RSI */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                RSI (14)
              </Typography>
              <Typography variant="h6" sx={{ color: rsiInfo.color, fontWeight: 'bold' }}>
                {rsiInfo.text}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analysis.rsiValue}
                sx={{
                  mt: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    bgcolor: rsiInfo.color,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* MACD */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                MACD
              </Typography>
              <Typography variant="h6" sx={{ color: macdInfo.color, fontWeight: 'bold' }}>
                {macdInfo.text}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                MACD: {analysis.macdValue.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Signal: {analysis.macdSignalValue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Trend Strength */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Trend Gücü
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {analysis.confidence > 70 ? 'Güçlü' : analysis.confidence > 40 ? 'Orta' : 'Zayıf'}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analysis.confidence}
                sx={{
                  mt: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: theme.palette.grey[200],
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SMA Signals */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
        <TimelineIcon />
        Hareketli Ortalama Sinyalleri
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    SMA 20
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {analysis.smaValues.sma20?.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '-'}
                  </Typography>
                </Box>
                <Chip
                  label={getSMAInfo(analysis.smaSignals.sma20).text}
                  size="small"
                  icon={getSMAInfo(analysis.smaSignals.sma20).icon}
                  sx={{
                    bgcolor: getSMAInfo(analysis.smaSignals.sma20).color,
                    color: 'white',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    SMA 50
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {analysis.smaValues.sma50?.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '-'}
                  </Typography>
                </Box>
                <Chip
                  label={getSMAInfo(analysis.smaSignals.sma50).text}
                  size="small"
                  icon={getSMAInfo(analysis.smaSignals.sma50).icon}
                  sx={{
                    bgcolor: getSMAInfo(analysis.smaSignals.sma50).color,
                    color: 'white',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    SMA 200
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {analysis.smaValues.sma200?.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '-'}
                  </Typography>
                </Box>
                <Chip
                  label={getSMAInfo(analysis.smaSignals.sma200).text}
                  size="small"
                  icon={getSMAInfo(analysis.smaSignals.sma200).icon}
                  sx={{
                    bgcolor: getSMAInfo(analysis.smaSignals.sma200).color,
                    color: 'white',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Disclaimer */}
      <Alert severity="warning" sx={{ mt: 3 }}>
        Bu analiz sadece bilgilendirme amaçlıdır. Yatırım kararları alırken kendi araştırmanızı yapın ve
        gerekirse finansal danışmanınıza başvurun.
      </Alert>
    </Paper>
  );
};

export default MarketAnalysisPanel;
