/**
 * Verification Processing Component
 * Shows loading state while verifying email token
 */

import React from 'react';
import { Paper, Typography, Box, CircularProgress } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const VerificationProcessing: React.FC = () => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
      }}
      role="status"
      aria-labelledby="verification-processing-title"
      aria-live="polite"
    >
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
        <CircularProgress size={64} thickness={4} />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VerifiedUserIcon
            sx={{ fontSize: 32, color: 'primary.main' }}
            aria-hidden="true"
          />
        </Box>
      </Box>

      <Typography
        id="verification-processing-title"
        component="h1"
        variant="h5"
        gutterBottom
        sx={{ fontWeight: 600 }}
      >
        Doğrulanıyor...
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
      >
        E-posta adresiniz doğrulanıyor. Lütfen bekleyin.
      </Typography>
    </Paper>
  );
};

export default VerificationProcessing;
