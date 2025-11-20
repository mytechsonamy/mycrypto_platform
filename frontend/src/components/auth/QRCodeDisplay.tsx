/**
 * QR Code Display Component
 * Displays QR code for 2FA setup with manual entry fallback
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';

interface QRCodeDisplayProps {
  qrCode: string;
  secret: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ qrCode, secret }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopySuccess(true);
    } catch (error) {
      console.error('Failed to copy secret:', error);
    }
  };

  const handleCloseSnackbar = () => {
    setCopySuccess(false);
  };

  // Format secret for display (add spaces every 4 characters)
  const formattedSecret = secret.replace(/(.{4})/g, '$1 ').trim();

  return (
    <Box sx={{ textAlign: 'center' }}>
      {/* QR Code Image */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 3,
          display: 'inline-block',
          backgroundColor: 'white',
        }}
      >
        <Box
          component="img"
          src={qrCode}
          alt="2FA QR Kodu"
          sx={{
            width: { xs: 180, sm: 200 },
            height: { xs: 180, sm: 200 },
            display: 'block',
          }}
        />
      </Paper>

      {/* Instructions */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Google Authenticator veya benzer bir uygulama ile QR kodunu tarayin.
      </Typography>

      {/* Manual Entry Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          QR kodu tarayamiyorsaniz, bu kodu manuel olarak girin:
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.50',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 600,
              letterSpacing: 1,
              wordBreak: 'break-all',
            }}
            aria-label="Manuel giris kodu"
          >
            {formattedSecret}
          </Typography>

          <Tooltip title="Kopyala" arrow>
            <IconButton
              onClick={handleCopySecret}
              size="small"
              sx={{ ml: 1 }}
              aria-label="Kodu kopyala"
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>

      {/* Copy Success Notification */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ width: '100%' }}
        >
          Kod panoya kopyalandi
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QRCodeDisplay;
