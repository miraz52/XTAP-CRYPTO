export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;
    const BOT_TOKEN = "8925575289:AAGYb4mGFXhuUoo-_Vl3WB454ePK2Z3OIvU";
    
    // আপনার Supabase কনফিগারেশন সরাসরি সেট করা হয়েছে
    const SUPABASE_URL = "https://grqnxhwzqfrxfnujaicn.supabase.co";
    const SUPABASE_KEY = "sb_publishable_FXFjr-BDyvkWkHAn0ykoiQ_X96I3Pq0";

    if (message && message.text && message.text.startsWith('/start')) {
      const chatId = message.chat.id;
      const textParts = message.text.split(' ');
      const referrerId = textParts.length > 1 ? textParts[1] : null;

      // রেফারেল আইডি ডাটাবেজে স্বয়ংক্রিয়ভাবে সেভ হবে
      if (referrerId && String(referrerId) !== String(chatId)) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              referrer_id: String(referrerId),
              referred_id: String(chatId)
            })
          });
        } catch (err) {
          console.error("Referral save error:", err);
        }
      }

      const photoUrl = "https://xtap-crypto.vercel.app/coin.png";
      const payload = {
        chat_id: chatId,
        photo: photoUrl,
        caption: "👋 Welcome to XTAP Network!\n\n⛏️ Mine XTAP tokens directly to your Pool Wallet.\n⚡ Boost your cloud-mining hash rate!\n🔗 Connect your BSC (BEP-20) wallet.\n💰 Complete operations to unlock Airdrop!\n\nClick below to start.",
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
