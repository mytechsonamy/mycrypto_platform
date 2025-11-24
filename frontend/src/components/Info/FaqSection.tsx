/**
 * FAQ Section - Frequently Asked Questions about fees with expandable accordion
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';

interface FaqItem {
  question: string;
  answer: string;
  category: 'trading' | 'deposit' | 'withdrawal' | 'general';
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Neden taker ücreti maker ücretinden daha yüksek?',
    answer: 'Maker emirler piyasaya likidite sağlar ve emir defterinde bekler. Taker emirler ise mevcut likiditeden yararlanarak anında işlem yapar. Likidite sağlayanları ödüllendirmek ve piyasayı teşvik etmek için maker ücreti daha düşük tutulur. Bu sistem tüm kripto borsalarda yaygın bir uygulamadır.',
    category: 'trading',
  },
  {
    question: 'Blockchain ağ ücretlerini kim öder?',
    answer: 'Blockchain ağ ücretleri (BTC, ETH, USDT için) kullanıcılar tarafından doğrudan blockchain ağına ödenir. MyCrypto Platform bu ücretleri almaz. Bu ücretler blockchain madencilerine veya validatörlere gider ve işleminizin ağda onaylanmasını sağlar. Ücretler ağın yoğunluğuna göre değişir.',
    category: 'general',
  },
  {
    question: 'İşlem ücretlerimi nasıl azaltabilirim?',
    answer: 'İşlem ücretlerinizi azaltmak için: 1) Market emir yerine limit emir kullanarak maker ücreti (%0.1) ödeyin, 2) Daha yüksek işlem hacimlerine ulaşarak VIP seviyelerde indirim kazanın (gelecekte sunulacak), 3) Acil olmayan işlemler için ağ yoğunluğunun düşük olduğu saatleri tercih edin (blockchain ücretleri için).',
    category: 'trading',
  },
  {
    question: 'TRY yatırımlarım neden ücretsiz?',
    answer: 'MyCrypto Platform, kullanıcı deneyimini iyileştirmek için TRY yatırımlarında banka işlem ücretlerini kendisi karşılar. Bu sayede platform hesabınıza Türk Lirası yatırırken hiçbir ücret ödemezsiniz. Minimum yatırım tutarı 100 TRY\'dir.',
    category: 'deposit',
  },
  {
    question: 'Para yatırma işlemleri geri alınabilir mi?',
    answer: 'Banka transferleri (TRY yatırımları) geri alınamaz. Gönderdiğiniz para hesabınıza yansıdıktan sonra platforma eklenir. Blockchain işlemleri (BTC, ETH, USDT) de geri alınamaz ve değiştirilemez. Bu nedenle işlem yapmadan önce tüm bilgileri dikkatlice kontrol etmeniz önemlidir.',
    category: 'deposit',
  },
  {
    question: 'Çekim işlemim başarısız olursa ne olur?',
    answer: 'Çekim işleminiz başarısız olursa, para hesabınıza geri döner. TRY çekimlerinde banka bilgilerini kontrol edin. Blockchain çekimlerinde (BTC, ETH, USDT) adres bilgisini mutlaka doğru girdiğinizden emin olun. Herhangi bir sorun yaşarsanız destek ekibimize başvurun, blockchain durumunu araştırıp size yardımcı oluruz.',
    category: 'withdrawal',
  },
  {
    question: 'Blockchain ağ ücretleri neden değişiyor?',
    answer: 'Blockchain ağ ücretleri, ağın anlık yoğunluğuna göre dinamik olarak değişir. Ağ çok yoğunken (çok fazla işlem beklerken) madenciler daha yüksek ücretli işlemleri önceliklendirir. Ağ boşken ücretler düşer. Bu durum Bitcoin, Ethereum ve diğer tüm blockchain ağlarında normaldir. MyCrypto bu ücretleri kontrol etmez.',
    category: 'general',
  },
  {
    question: 'Minimum çekim tutarları neden var?',
    answer: 'Minimum çekim tutarları, blockchain ağ ücretlerinin çekim tutarına oranını makul tutmak için belirlenir. Örneğin, çok küçük miktarda BTC çekmek isterseniz, ağ ücreti çekim tutarından fazla olabilir. Minimum tutarlar: TRY 100, BTC 0.001, ETH 0.01, USDT 10 olarak belirlenmiştir.',
    category: 'withdrawal',
  },
  {
    question: 'VIP ücret indirimleri nasıl çalışır?',
    answer: 'Gelecekte yüksek işlem hacmine sahip kullanıcılar için VIP seviyelerde indirimli ücret oranları sunulacak. İşlem hacminiz arttıkça daha düşük maker ve taker ücretlerinden yararlanabileceksiniz. VIP programı detayları yakında duyurulacaktır.',
    category: 'trading',
  },
  {
    question: 'TRY çekim ücreti neden 10 TRY?',
    answer: '10 TRY sabit çekim ücreti, banka işlem maliyetlerini (EFT ücreti, banka komisyonu vb.) karşılamak için alınır. Bu ücret MyCrypto Platform tarafından alınır ve bankaya yapılan transferin maliyetlerini kapsar. Çekim işlemleriniz 1-2 iş günü içinde banka hesabınıza ulaşır.',
    category: 'withdrawal',
  },
  {
    question: 'USDT için hangi blockchain ağını seçmeliyim?',
    answer: 'USDT yatırma ve çekme işlemlerinde ERC-20 (Ethereum) veya TRC-20 (Tron) ağlarını seçebilirsiniz. TRC-20 genellikle daha düşük ağ ücretine sahiptir ve daha hızlıdır. Ancak mutlaka gönderdiğiniz/aldığınız adresin aynı ağı desteklediğinden emin olun! Farklı ağlara USDT göndermek para kaybına yol açar.',
    category: 'general',
  },
  {
    question: 'İşlem ücretleri değişebilir mi?',
    answer: 'Evet, MyCrypto Platform işlem ücretlerini (maker/taker oranları) önceden bildirimde bulunarak güncelleyebilir. Blockchain ağ ücretleri ise anlık olarak ağın durumuna göre sürekli değişir. İşlem yapmadan önce her zaman güncel ücret bilgilerini kontrol etmeniz önerilir. Ücret değişiklikleri duyurular bölümünden paylaşılır.',
    category: 'general',
  },
];

const FaqSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Filter FAQ items based on search term
  const filteredFaqs = FAQ_ITEMS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ px: { xs: 2, sm: 3 } }}>
      {/* Overview */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <HelpOutlineIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Sık Sorulan Sorular
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ücretler hakkında en çok sorulan sorular ve cevapları. Aradığınızı bulamadıysanız
          destek ekibimizle iletişime geçebilirsiniz.
        </Typography>
      </Box>

      {/* Search Box */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          bgcolor: 'grey.50',
          border: 1,
          borderColor: 'grey.300',
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Soru ara... (örn: maker, blockchain, ücret)"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* FAQ Accordions */}
      {filteredFaqs.length > 0 ? (
        <Box>
          {filteredFaqs.map((faq, index) => (
            <Accordion
              key={index}
              expanded={expanded === `panel${index}`}
              onChange={handleAccordionChange(`panel${index}`)}
              elevation={1}
              sx={{
                mb: 1,
                '&:before': {
                  display: 'none',
                },
                '&.Mui-expanded': {
                  bgcolor: 'primary.50',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel${index}-content`}
                id={`panel${index}-header`}
                sx={{
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aradığınız soru bulunamadı
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Farklı bir arama terimi deneyin veya tüm soruları görmek için arama kutusunu temizleyin.
          </Typography>
        </Paper>
      )}

      {/* Contact Support */}
      <Paper
        elevation={0}
        sx={{
          mt: 4,
          p: 3,
          bgcolor: 'info.50',
          border: 2,
          borderColor: 'info.main',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" fontWeight={700} color="info.main" gutterBottom>
          Sorunuza cevap bulamadınız mı?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Destek ekibimiz size yardımcı olmaktan mutluluk duyacaktır. 7/24 canlı destek hattımızdan
          veya e-posta yoluyla bizimle iletişime geçebilirsiniz.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>E-posta:</strong> destek@mycrypto.com.tr | <strong>Telefon:</strong> 0850 123 45 67
        </Typography>
      </Paper>
    </Box>
  );
};

export default FaqSection;
