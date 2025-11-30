/**
 * Public Dashboard Page
 * Landing page for users who haven't logged in yet
 * Displays information about the platform and call-to-action buttons
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  AppBar,
  Toolbar,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';

const PublicDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: SecurityIcon,
      title: 'Güvenli Alım-Satım',
      description: 'End-to-end şifrelenmiş işlemlerle güvenli kripto alım-satımı yapın',
    },
    {
      icon: SpeedIcon,
      title: 'Hızlı İşlemler',
      description: 'Gerçek zamanlı fiyat güncellemeleri ve anlık sipariş işleme',
    },
    {
      icon: AccountBalanceIcon,
      title: 'Çoklu Para Desteği',
      description: 'TRY, BTC, ETH ve daha birçok kripto para ile işlem yapın',
    },
    {
      icon: TrendingUpIcon,
      title: 'Gelişmiş Grafikler',
      description: 'Detaylı pazar analitiği ve fiyat tahmin araçları',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header/Navigation */}
      <AppBar position="static" sx={{ backgroundColor: '#f5f5f5', color: 'text.primary', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', color: '#1976d2' }}>
            MyCrypto Platform
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button color="primary" onClick={() => navigate('/login')}>
              Giriş Yap
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/register')}
            >
              Kayıt Ol
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, flexGrow: 1 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 'bold',
              mb: 2,
              background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '2rem', md: '3rem' },
            }}
          >
            Kripto Alım-Satımı Basitleştirildi
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              mb: 4,
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            MyCrypto Platform ile güvenli ve hızlı kripto para işlemleri yapın
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                padding: '12px 32px',
                fontSize: '1rem',
                minWidth: { xs: '100%', sm: 'auto' },
              }}
            >
              Şimdi Başla
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                padding: '12px 32px',
                fontSize: '1rem',
                minWidth: { xs: '100%', sm: 'auto' },
              }}
            >
              Var olan hesaba gir
            </Button>
          </Stack>
        </Box>

        {/* Features Section */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 6,
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            Neden MyCrypto Platform?
          </Typography>
          <Grid container spacing={3}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 3,
                      border: '1px solid #e0e0e0',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                      <Icon
                        sx={{
                          fontSize: 48,
                          color: 'primary.main',
                          mb: 2,
                        }}
                      />
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ fontWeight: 'bold', mb: 1 }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Stats Section */}
        <Box
          sx={{
            backgroundColor: '#f5f5f5',
            borderRadius: 3,
            p: 4,
            mb: 8,
          }}
        >
          <Grid container spacing={4} textAlign="center">
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                1000+
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aktif Kullanıcı
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                24/7
              </Typography>
              <Typography variant="body2" color="text.secondary">
                İşlem Desteği
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                $1M+
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Günlük İşlem Hacmi
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                5+
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Desteklenen Kripto Para
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* CTA Section */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
            borderRadius: 3,
            p: 4,
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              mb: 2,
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            Hemen Başlamaya Hazır mısınız?
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, fontSize: '1rem' }}>
            Ücretsiz bir hesap oluşturun ve kripto alım-satımına başlayın
          </Typography>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'white',
              color: 'primary.main',
              padding: '12px 32px',
              fontSize: '1rem',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
            onClick={() => navigate('/register')}
          >
            Ücretsiz Hesap Oluştur
          </Button>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: '#f5f5f5',
          borderTop: '1px solid #e0e0e0',
          py: 3,
          mt: 'auto',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={2} justifyContent="space-between">
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                © 2025 MyCrypto Platform. Tüm hakları saklıdır.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Stack direction="row" spacing={2}>
                <Typography
                  component="button"
                  variant="body2"
                  sx={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'primary.main',
                    textDecoration: 'underline',
                  }}
                  onClick={() => navigate('/terms')}
                >
                  Şartlar
                </Typography>
                <Typography
                  component="button"
                  variant="body2"
                  sx={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'primary.main',
                    textDecoration: 'underline',
                  }}
                  onClick={() => navigate('/kvkk')}
                >
                  Gizlilik
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default PublicDashboardPage;
