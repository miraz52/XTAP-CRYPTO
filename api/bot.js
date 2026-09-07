export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is active');
  }

  const { message, callback_query } = req.body || {};
  const BOT_TOKEN = '8925575289:AAGYb4mGFXhuUoo-_Vl3WB454ePK2Z3OIvU';
  const ADMIN_ID = process.env.ADMIN_CHAT_ID || '5330021607';
  const SUPABASE_URL = 'https://gcqiahwqzfcxfnujzicn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_FXfjr_BDysskhmnOyhsiQ_ENGIPqQ';

  // ১. /start কমান্ড হ্যান্ডলিং
  if (message && message.text && message.text.startsWith('/start')) {
    const chatId = message.chat.id;
    const textParts = message.text.split(' ');
    const referrerId = textParts.length > 1 ? textParts[1] : null;

    if (referrerId && String(referrerId) !== String(chatId)) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ referrer_id: String(referrerId), referred_id: String(chatId) })
        });
      } catch (err) {
        console.error('Referral save error:', err);
      }
    }

    const photoUrl = 'https://xtap-crypto.vercel.app/coin.png';
    const payload = {
      chat_id: chatId,
      photo: photoUrl,
      caption: '🚀 Welcome to XTAP Network!\n\n⛏️ Mine XTAP tokens directly to your Pool Wallet.\n📈 Boost your cloud-mining hash rate!\n🔗 Connect your BSC (BEP-20) wallet.\n\nComplete operations to unlock Airdrop!\n\nClick below to start.',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Start XTAP Mining', web_app: { url: 'https://xtap-crypto.vercel.app' } }],
          [{ text: '📢 Community', url: 'https://t.me/cryptotapofficial' }]
        ]
      }
    };

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.status(200).send('OK');
  }

  // ২. ইউজার ভিডিও পাঠালে তা রিসিভ করে অ্যাডমিনের কাছে পাঠানো
  if (message && (message.video || message.video_note)) {
    const userId = message.from.id;
    const userName = message.from.username ? `@${message.from.username}` : message.from.first_name;
    const videoFileId = (message.video && message.video.file_id) || (message.video_note && message.video_note.file_id);

    // ইউজারকে কনফার্মেশন মেসেজ
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: '✅ আপনার ভিডিওটি জমা হয়েছে! অ্যাডমিন ভেরিফাই করলে আপনার একাউন্টে ৩০০ $XTAP জমা হবে।'
      })
    });

    // অ্যাডমিনকে ভিডিও ও Approve/Reject বাটনসহ ফরোয়ার্ড
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        video: videoFileId,
        caption: `📹 নতুন ভিডিও রিভিউয়ের জন্য এসেছে!\n\n👤 ইউজার: ${userName}\n🆔 আইডি: <code>${userId}</code>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve (300 XTAP)', callback_data: `approve_${userId}` },
              { text: '❌ Reject', callback_data: `reject_${userId}` }
            ]
          ]
        }
      })
    });

    return res.status(200).send('OK');
  }

  // ৩. অ্যাডমিন Approve বা Reject বাটনে চাপ দিলে
  if (callback_query) {
    const adminChatId = callback_query.from.id;
    const data = callback_query.data;
    const messageId = callback_query.message.message_id;

    if (String(adminChatId) !== String(ADMIN_ID)) {
      return res.status(200).send('Unauthorized');
    }

    if (data.startsWith('approve_')) {
      const targetUserId = data.replace('approve_', '');

      // ইউজারের ব্যালেন্স ৩০০ $XTAP বাড়িয়ে দেওয়া
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_balance`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user_id: targetUserId, amount: 300 })
        });
      } catch (e) {
        console.error('Balance update error:', e);
      }

      // ইউজারকে মেসেজ
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetUserId,
          text: '🎉 অভিনন্দন! আপনার ভিডিও সফলভাবে অ্যাপ্রুভ হয়েছে এবং ৩০০ $XTAP জমা হয়েছে!'
        })
      });

      // অ্যাডমিন চ্যাটে মেসেজ আপডেট
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          message_id: messageId,
          caption: `✅ ভিডিও অ্যাপ্রুভ করা হয়েছে এবং ইউজারকে ৩০০ $XTAP দেওয়া হয়েছে।`
        })
      });
    } else if (data.startsWith('reject_')) {
      const targetUserId = data.replace('reject_', '');

      // ইউজারকে মেসেজ
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetUserId,
          text: '❌ দুঃখিত, আপনার সাবমিট করা ভিডিওটি বাতিল (Reject) করা হয়েছে।'
        })
      });

      // অ্যাডমিন চ্যাটে মেসেজ আপডেট
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          message_id: messageId,
          caption: `❌ ভিডিওটি রিজেক্ট করা হয়েছে।`
        })
      });
    }

    return res.status(200).send('OK');
  }

  return res.status(200).send('OK');
}
