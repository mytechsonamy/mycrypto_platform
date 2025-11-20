/**
 * Logout Button Component
 * Handles user logout with confirmation dialog
 */

import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../store';
import { logoutUser, selectLogoutLoading } from '../../store/slices/authSlice';

interface LogoutButtonProps {
  variant?: 'button' | 'icon';
  showConfirmation?: boolean;
  onLogoutSuccess?: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'button',
  showConfirmation = true,
  onLogoutSuccess,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loading = useAppSelector(selectLogoutLoading);

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    if (showConfirmation) {
      setDialogOpen(true);
    } else {
      handleLogout();
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Basariyla cikis yapildi.');
      handleCloseDialog();

      if (onLogoutSuccess) {
        onLogoutSuccess();
      } else {
        navigate('/login');
      }
    } catch (error) {
      // Even if API fails, we still log out locally
      toast.info('Cikis yapildi.');
      handleCloseDialog();

      if (onLogoutSuccess) {
        onLogoutSuccess();
      } else {
        navigate('/login');
      }
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <Tooltip title="Cikis Yap">
          <IconButton
            onClick={handleOpenDialog}
            disabled={loading}
            color="inherit"
            aria-label="Cikis yap"
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <LogoutIcon />
            )}
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          onClick={handleOpenDialog}
          disabled={loading}
          variant="outlined"
          color="inherit"
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <LogoutIcon />
            )
          }
          aria-label={loading ? 'Cikis yapiliyor' : 'Cikis yap'}
        >
          {loading ? 'Cikis Yapiliyor...' : 'Cikis Yap'}
        </Button>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">
          Cikis Yap
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Cikis yapmak istediginizden emin misiniz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            disabled={loading}
            color="inherit"
          >
            Iptal
          </Button>
          <Button
            onClick={handleLogout}
            disabled={loading}
            color="primary"
            variant="contained"
            autoFocus
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Cikis Yapiliyor...
              </>
            ) : (
              'Cikis Yap'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LogoutButton;
