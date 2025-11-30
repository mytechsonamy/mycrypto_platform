/**
 * Public Dashboard Page
 * Professional landing page for the MyCrypto Platform
 * Inspired by mytrader.tech design patterns with Turkish localization
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Stack,
  useTheme,
  useMediaQuery,
  Divider,
  Paper,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  CheckCircle as CheckCircleIcon,
  LocalAtm as LocalAtmIcon,
  VerifiedUser as VerifiedUserIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';

const PublicDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: SecurityIcon,
      title: 'Güvenli İşlem',
      description: 'End-to-end şifrelenmiş, 2FA korumalı ve güvenli alım-satım',
    },
    {
      icon: SpeedIcon,
      title: 'Anlık Fiyatlar',
      description: 'WebSocket ile gerçek zamanlı pazar verileri ve fiyat güncellemeleri',
    },
    {
      icon: AccountBalanceIcon,
      title: 'Çoklu Para',
      description: 'TRY, BTC, ETH, SOL, BNB ve daha birçok kripto para desteği',
    },
    {
      icon: TrendingUpIcon,
      title: 'Gelişmiş Araçlar',
      description: 'Limit order, piyasa emri ve otomatik fiyat uyarıları',
    },
    {
      icon: LocalAtmIcon,
      title: 'Kolay Para Transferi',
      description: 'Banka transferi ile TRY yatırma ve çekme işlemleri',
    },
    {
      icon: VerifiedUserIcon,
      title: 'KYC Doğrulaması',
      description: 'Hızlı ve güvenli kimlik doğrulama süreci',
    },
  ];

  const advantages = [
    'Düşük ücretler (Maker 0.1%, Taker 0.2%)',
    '24/7 müşteri desteği',
    'Mobil uyumlu arayüz',
    'Gelişmiş güvenlik özellikleri',
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header/Navigation */}
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'white',
          color: '#1f2937',
          boxShadow: isScrolled ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'all 0.3s ease',
          borderBottom: isScrolled ? 'none' : '1px solid #e5e7eb',
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: '1.3rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            MyCrypto
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              color="inherit"
              sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'none' }}
              onClick={() => navigate('/login')}
            >
              Giriş Yap
            </Button>
            <Button
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                '&:hover': {
                  boxShadow: '0 10px 20px rgba(139, 92, 246, 0.3)',
                },
              }}
              onClick={() => navigate('/register')}
            >
              Kayıt Ol
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          py: { xs: 6, md: 10 },
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: '2rem', md: '3rem' },
                  lineHeight: 1.2,
                  color: '#1f2937',
                }}
              >
                Kripto Trading Artık Çok Kolay
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#6b7280',
                  mb: 4,
                  fontSize: { xs: '1rem', md: '1.1rem' },
                  fontWeight: 400,
                  lineHeight: 1.6,
                }}
              >
                MyCrypto Platform ile güvenli, hızlı ve düşük ücretli kripto alım-satımı yapın.
                Profesyonel araçlar ve başlangıç dostu arayüz.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    py: 1.5,
                    px: 4,
                    borderRadius: 2,
                    '&:hover': {
                      boxShadow: '0 15px 30px rgba(139, 92, 246, 0.4)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/register')}
                >
                  Şimdi Başla
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: '#8b5cf6',
                    color: '#8b5cf6',
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    py: 1.5,
                    px: 4,
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(139, 92, 246, 0.05)',
                    },
                  }}
                  onClick={() => navigate('/login')}
                >
                  Hesabına Gir
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  borderRadius: 3,
                  p: 3,
                  color: 'white',
                  boxShadow: '0 20px 40px rgba(139, 92, 246, 0.2)',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  📱 Platform Özellikleri
                </Typography>
                <Stack spacing={1}>
                  {advantages.map((adv, idx) => (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ fontSize: '1.2rem' }} />
                      <Typography variant="body2">{adv}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 2,
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                color: '#1f2937',
              }}
            >
              Neden MyCrypto?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#6b7280',
                fontSize: '1.1rem',
                maxWidth: '600px',
                mx: 'auto',
              }}
            >
              Hem başlangıç seviyesi hem de profesyonel yatırımcılar için tasarlanmış
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: '1px solid #e5e7eb',
                      height: '100%',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#8b5cf6',
                        boxShadow: '0 10px 20px rgba(139, 92, 246, 0.1)',
                        transform: 'translateY(-5px)',
                      },
                    }}
                  >
                    <Icon
                      sx={{
                        fontSize: 40,
                        color: '#8b5cf6',
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        color: '#1f2937',
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#6b7280',
                        lineHeight: 1.6,
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          color: 'white',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={6} md={3} sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  mb: 0.5,
                  fontSize: { xs: '1.8rem', md: '2.5rem' },
                }}
              >
                1000+
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Aktif Kullanıcı
              </Typography>
            </Grid>
            <Grid item xs={6} md={3} sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  mb: 0.5,
                  fontSize: { xs: '1.8rem', md: '2.5rem' },
                }}
              >
                $1M+
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Günlük İşlem Hacmi
              </Typography>
            </Grid>
            <Grid item xs={6} md={3} sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  mb: 0.5,
                  fontSize: { xs: '1.8rem', md: '2.5rem' },
                }}
              >
                24/7
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Müşteri Desteği
              </Typography>
            </Grid>
            <Grid item xs={6} md={3} sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  mb: 0.5,
                  fontSize: { xs: '1.8rem', md: '2.5rem' },
                }}
              >
                5+
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Kripto Para
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 6, md: 8 }, backgroundColor: '#f9fafb' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: 2,
              fontSize: { xs: '1.8rem', md: '2.2rem' },
              color: '#1f2937',
            }}
          >
            Hemen Başlamaya Hazır mısınız?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#6b7280',
              mb: 4,
              fontSize: '1.05rem',
            }}
          >
            Ücretsiz hesap oluşturun ve kripto trading dünyasına adım atın
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              py: 1.5,
              px: 5,
              borderRadius: 2,
              '&:hover': {
                boxShadow: '0 15px 30px rgba(139, 92, 246, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
            onClick={() => navigate('/register')}
            endIcon={<ArrowForwardIcon />}
          >
            Ücretsiz Hesap Oluştur
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: '#1f2937',
          color: 'white',
          py: 4,
          mt: 'auto',
          borderTop: '1px solid #374151',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                MyCrypto
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Güvenli kripto trading platformu
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Platform
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                <Box sx={{ cursor: 'pointer', '&:hover': { color: '#8b5cf6' } }}>
                  Trading
                </Box>
                <Box sx={{ cursor: 'pointer', '&:hover': { color: '#8b5cf6' } }}>
                  Wallet
                </Box>
                <Box sx={{ cursor: 'pointer', '&:hover': { color: '#8b5cf6' } }}>
                  Ücretler
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Destek
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                <Box sx={{ cursor: 'pointer', '&:hover': { color: '#8b5cf6' } }}>
                  İletişim
                </Box>
                <Box sx={{ cursor: 'pointer', '&:hover': { color: '#8b5cf6' } }}>
                  SSS
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Hukuki
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#9ca3af',
                  cursor: 'pointer',
                  '&:hover': { color: '#8b5cf6' },
                }}
                onClick={() => navigate('/terms')}
              >
                Şartlar
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#9ca3af',
                  cursor: 'pointer',
                  '&:hover': { color: '#8b5cf6' },
                }}
                onClick={() => navigate('/kvkk')}
              >
                Gizlilik
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: '#374151', my: 2 }} />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              color: '#9ca3af',
            }}
          >
            <Typography variant="body2">
              © 2025 MyCrypto Platform. Tüm hakları saklıdır.
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              Kripto para yatırımı yüksek risk taşır. Lütfen finansal danışmanla görüşün.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default PublicDashboardPage;
