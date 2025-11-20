/**
 * Backup Codes Display Component
 * Displays backup codes with copy and download options
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Checkbox,
  FormControlLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface BackupCodesDisplayProps {
  codes: string[];
  onConfirm?: () => void;
  showConfirmation?: boolean;
}

const BackupCodesDisplay: React.FC<BackupCodesDisplayProps> = ({
  codes,
  onConfirm,
  showConfirmation = true,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyAll = async () => {
    try {
      const codesText = codes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopySuccess(true);
    } catch (error) {
      console.error('Failed to copy codes:', error);
    }
  };

  const handleDownload = () => {
    const codesText = `MyCrypto Platform - 2FA Yedek Kodlari
==========================================
Olusturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}

Her kod sadece bir kez kullanilabilir.
Bu kodlari guvenli bir yerde saklayin.

${codes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

==========================================
UYARI: Bu dosyayi guvenli bir yerde saklayin
ve kimseyle paylaşmayin.
`;

    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mycrypto-2fa-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCloseSnackbar = () => {
    setCopySuccess(false);
  };

  const handleConfirmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmed(event.target.checked);
  };

  return (
    <Box>
      {/* Warning Message */}
      <Alert
        severity="warning"
        icon={<WarningIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="body2">
          Bu kodlari guvenli bir yere kaydedin. Telefonunuza erisiminizi
          kaybettiginizde hesabiniza giris yapmak icin bu kodlara ihtiyaciniz olacak.
          Her kod sadece bir kez kullanilabilir.
        </Typography>
      </Alert>

      {/* Backup Codes Grid */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={1}>
          {codes.map((code, index) => (
            <Grid item xs={6} sm={4} key={index}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  textAlign: 'center',
                  backgroundColor: 'grey.50',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                  aria-label={`Yedek kod ${index + 1}`}
                >
                  {code}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Action Buttons */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<CopyIcon />}
          onClick={handleCopyAll}
          fullWidth
          aria-label="Tum kodlari kopyala"
        >
          Kopyala
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          fullWidth
          aria-label="Kodlari indir"
        >
          Indir
        </Button>
      </Box>

      {/* Confirmation Checkbox */}
      {showConfirmation && (
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                onChange={handleConfirmChange}
                color="primary"
                inputProps={{
                  'aria-label': 'Yedek kodlari kaydettim onay',
                }}
              />
            }
            label={
              <Typography variant="body2">
                Bu kodlari guvenli bir yere kaydettim
              </Typography>
            }
          />

          {onConfirm && (
            <Button
              variant="contained"
              fullWidth
              onClick={onConfirm}
              disabled={!confirmed}
              sx={{ mt: 2 }}
              aria-label="Kurulumu tamamla"
            >
              Kurulumu Tamamla
            </Button>
          )}
        </Box>
      )}

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
          Kodlar panoya kopyalandi
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BackupCodesDisplay;
