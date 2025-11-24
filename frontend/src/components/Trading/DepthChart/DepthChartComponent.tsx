/**
 * DepthChartComponent - Visualizes order book depth with interactive chart
 * Displays cumulative volume curves for bids (green) and asks (red)
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  ButtonGroup,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Download,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import html2canvas from 'html2canvas';
import { DepthChartData, ZOOM_LEVELS, ZoomLevel } from '../../../types/depth-chart.types';
import { AGGREGATE_LEVELS, AggregateLevel } from '../../../types/trading.types';
import { formatDepthNumber, formatCryptoQuantity } from '../../../utils/depthChartUtils';

export interface DepthChartProps {
  data: DepthChartData;
  symbol: string;
  loading?: boolean;
  error?: string | null;
  zoomLevel?: ZoomLevel;
  onZoomChange?: (zoom: ZoomLevel) => void;
  panOffset?: number;
  onPanOffsetChange?: (offset: number) => void;
  aggregateLevel?: AggregateLevel;
  onAggregateChange?: (aggregate: AggregateLevel) => void;
}

interface ChartDataPoint {
  price: number;
  bidVolume: number;
  askVolume: number;
  priceLabel: string;
}

const DepthChartComponent: React.FC<DepthChartProps> = ({
  data,
  symbol,
  loading = false,
  error = null,
  zoomLevel = 1,
  onZoomChange,
  panOffset = 0,
  onPanOffsetChange,
  aggregateLevel = 0.1,
  onAggregateChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  // Calculate chart dimensions based on screen size
  const chartHeight = isMobile ? 300 : isTablet ? 300 : 400;
  const chartWidth = isMobile ? 350 : isTablet ? 600 : 800;

  // Memoized chart data transformation
  const chartData = useMemo((): ChartDataPoint[] => {
    const points: ChartDataPoint[] = [];

    // Process bids (in reverse order for proper display)
    const reversedBids = [...data.bids].reverse();
    reversedBids.forEach((bid) => {
      points.push({
        price: parseFloat(bid.price),
        bidVolume: parseFloat(bid.cumulative),
        askVolume: 0,
        priceLabel: bid.price,
      });
    });

    // Process asks
    data.asks.forEach((ask) => {
      // Check if price already exists (at spread junction)
      const existing = points.find((p) => Math.abs(p.price - parseFloat(ask.price)) < 0.01);
      if (existing) {
        existing.askVolume = parseFloat(ask.cumulative);
      } else {
        points.push({
          price: parseFloat(ask.price),
          bidVolume: 0,
          askVolume: parseFloat(ask.cumulative),
          priceLabel: ask.price,
        });
      }
    });

    // Sort by price
    return points.sort((a, b) => a.price - b.price);
  }, [data]);

  // Custom tooltip renderer
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload as ChartDataPoint;
    const bidVolume = data.bidVolume;
    const askVolume = data.askVolume;

    return (
      <Paper
        elevation={3}
        sx={{
          p: 1.5,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Fiyat: {formatDepthNumber(data.price, 2)} TRY
        </Typography>
        {bidVolume > 0 && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <TrendingUp sx={{ fontSize: 16, color: theme.palette.success.main }} />
            <Typography variant="caption" color="success.main">
              Alış: {formatCryptoQuantity(bidVolume)}
            </Typography>
          </Box>
        )}
        {askVolume > 0 && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <TrendingDown sx={{ fontSize: 16, color: theme.palette.error.main }} />
            <Typography variant="caption" color="error.main">
              Satış: {formatCryptoQuantity(askVolume)}
            </Typography>
          </Box>
        )}
      </Paper>
    );
  };

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    if (!onZoomChange) return;
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      onZoomChange(ZOOM_LEVELS[currentIndex + 1]);
    }
  }, [zoomLevel, onZoomChange]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    if (!onZoomChange) return;
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      onZoomChange(ZOOM_LEVELS[currentIndex - 1]);
    }
  }, [zoomLevel, onZoomChange]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (onZoomChange) onZoomChange(1);
    if (onPanOffsetChange) onPanOffsetChange(0);
  }, [onZoomChange, onPanOffsetChange]);

  // Handle pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  }, []);

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !onPanOffsetChange) return;

      const deltaX = e.clientX - dragStartX;
      const sensitivity = 0.1;
      const newOffset = Math.max(0, panOffset + Math.round(deltaX * sensitivity));

      onPanOffsetChange(newOffset);
      setDragStartX(e.clientX);
    },
    [isDragging, dragStartX, panOffset, onPanOffsetChange]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle export to PNG
  const handleExport = useCallback(async () => {
    if (!chartRef.current) return;

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: theme.palette.background.paper,
        scale: 2, // Higher quality
      });

      // Create download link
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `depth-chart-${symbol}-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
  }, [symbol, theme.palette.background.paper]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={chartHeight}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (data.bids.length === 0 && data.asks.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Derinlik verisi yükleniyor...
      </Alert>
    );
  }

  return (
    <Paper
      elevation={2}
      ref={chartRef}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header with controls */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Derinlik Grafiği - {symbol}
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          {/* Aggregate level selector */}
          {onAggregateChange && !isMobile && (
            <ButtonGroup size="small" variant="outlined">
              {AGGREGATE_LEVELS.map((level) => (
                <Button
                  key={level}
                  variant={aggregateLevel === level ? 'contained' : 'outlined'}
                  onClick={() => onAggregateChange(level)}
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  {level}%
                </Button>
              ))}
            </ButtonGroup>
          )}

          {/* Zoom controls */}
          {onZoomChange && !isMobile && (
            <Box display="flex" gap={0.5}>
              <Tooltip title="Yakınlaştır">
                <IconButton
                  size="small"
                  onClick={handleZoomIn}
                  disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  aria-label="Yakınlaştır"
                >
                  <ZoomIn fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Uzaklaştır">
                <IconButton
                  size="small"
                  onClick={handleZoomOut}
                  disabled={zoomLevel === ZOOM_LEVELS[0]}
                  aria-label="Uzaklaştır"
                >
                  <ZoomOut fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sıfırla">
                <IconButton size="small" onClick={handleReset} aria-label="Sıfırla">
                  <RestartAlt fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Export button */}
          <Tooltip title="PNG olarak indir">
            <IconButton size="small" onClick={handleExport} aria-label="PNG olarak indir">
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Spread info */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: theme.palette.grey[100],
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Spread: <strong>{data.spread.value} TRY</strong> ({data.spread.percentage}%)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Zoom: <strong>{zoomLevel}x</strong>
        </Typography>
      </Box>

      {/* Chart */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.8} />
                <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorAsk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8} />
                <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.3} />
            <XAxis
              dataKey="price"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => formatDepthNumber(value, 0)}
              style={{ fontSize: isMobile ? 10 : 12 }}
              stroke={theme.palette.text.secondary}
            />
            <YAxis
              tickFormatter={(value) => formatCryptoQuantity(value)}
              style={{ fontSize: isMobile ? 10 : 12 }}
              stroke={theme.palette.text.secondary}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: isMobile ? 11 : 14 }}
              iconType="line"
              formatter={(value) => (value === 'bidVolume' ? 'Alış' : 'Satış')}
            />
            <Area
              type="monotone"
              dataKey="bidVolume"
              stroke={theme.palette.success.main}
              fillOpacity={1}
              fill="url(#colorBid)"
              name="bidVolume"
              animationDuration={300}
            />
            <Area
              type="monotone"
              dataKey="askVolume"
              stroke={theme.palette.error.main}
              fillOpacity={1}
              fill="url(#colorAsk)"
              name="askVolume"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default DepthChartComponent;
