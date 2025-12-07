/**
 * LanguageSwitcher Component
 * Allows users to switch between available languages
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';
import { getColors } from '../../theme/figmaTheme';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    handleClose();
  };

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: colors.textSecondary,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          },
        }}
        aria-label="Change language"
        aria-controls={open ? 'language-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: '18px' }}>{currentLanguage.flag}</Typography>
          <LanguageIcon fontSize="small" />
        </Box>
      </IconButton>

      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.border}`,
            minWidth: 180,
          },
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={i18n.language === language.code}
            sx={{
              '&.Mui-selected': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 111, 255, 0.15)' : 'rgba(0, 111, 255, 0.08)',
              },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 111, 255, 0.1)' : 'rgba(0, 111, 255, 0.05)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Typography sx={{ fontSize: '20px' }}>{language.flag}</Typography>
            </ListItemIcon>
            <ListItemText>
              <Typography sx={{ color: colors.textPrimary, fontWeight: 500 }}>
                {language.nativeName}
              </Typography>
            </ListItemText>
            {i18n.language === language.code && (
              <CheckIcon sx={{ color: colors.primaryBlue, ml: 1 }} fontSize="small" />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
