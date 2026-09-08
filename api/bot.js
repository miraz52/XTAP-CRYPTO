export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('XTAP Bot Backend is Online');
  }

  const { message, callback_query } = req.body || {};
  const BOT_TOKEN = '8925575289:AAGYb4mGFXhuUoo-_Vl3WB454ePK2Z3OIvU';
  const ADMIN_ID = process.env.ADMIN_CHAT_ID || '5330021607';
  const SUPABASE_URL = 'https://grqnxhwzqfrxfnujaicn.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_FXFjr-BDyvkWkHAn0ykoiQ_X96I3Pq0';

  const supabaseHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  // ১. /start কমান্ড হ্যান্ডেল করা
  if (message && message.text && message.text.startsWith('/start')) {
    const chatId = message.chat.id;
    const fullText = message.text.trim();

    // মিনি-অ্যাপ থেকে যখন ইউজার Verify বাটনে চাপ দিয়ে Start করবে
    if (fullText.includes('verify')) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '📹 <b>Human Proof Verification</b>\n\nদয়া করে আপনার মুখ ও হাতের ৫টি আঙুল দেখিয়ে একটি ছোট ভিডিও বা ভিডিও মেসেজ পাঠান।\n\nএডমিন ভেরিফাই করলে আপনার একাউন্টে <b>300 $XTAP</b> যোগ হবে এবং আপনার একাউন্ট ভেরিফাইড হিসেবে সিলমোহর পাবে!',
          parse_mode: 'HTML'
        })
      });
      return res.status(200).send('OK');
    }

    // সাধারণ রেফারেল বা সাধারণ /start
    const textParts = fullText.split(' ');
    const param = textParts.length > 1 ? textParts[1] : null;

    if (param && String(param) !== String(chatId)) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
          method: 'POST',
          headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ referrer_id: String(param), referred_id: String(chatId) })
        });
      } catch (err) {
        console.error('Referral error:', err);
      }
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: 'https://xtap-crypto.vercel.app/coin.png',
        caption: '🚀 Welcome to XTAP Network!\n\n⛏️ Mine XTAP tokens directly to your Pool Wallet.\n📈 Boost your cloud-mining hash rate!\n🔗 Connect your BSC (BEP-20) wallet.\n\nComplete operations to unlock Airdrop!\n\nClick below to start.',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Start XTAP Mining', web_app: { url: 'https://xtap-crypto.vercel.app' } }],
            [{ text: '📢 Community', url: 'https://t.me/cryptotapofficial' }]
          ]
        }
      })
    });

    return res.status(200).send('OK');
  }

  // ২. ইউজার ভিডিও পাঠালে তা অ্যাডমিনের কাছে পাঠানো
  const isVideo = message && (message.video || message.video_note || (message.document && message.document.mime_type && message.document.mime_type.startsWith('video/')));

  if (isVideo) {
    const userId = message.from.id;
    const userName = message.from.username ? `@${message.from.username}` : (message.from.first_name || 'Pilot');

    // ইউজারকে বার্তা
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: '✅ আপনার ভিডিওটি জমা হয়েছে! এডমিন যাচাই করার পর আপনার ব্যালেন্সে 300 $XTAP যুক্ত হবে এবং একাউন্ট ভেরিফাইড হয়ে যাবে।'
      })
    });

    // অ্যাডমিনের কাছে ভিডিও ফরোয়ার্ড
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        from_chat_id: userId,
        message_id: message.message_id
      })
    });

    // অ্যাডমিনের কাছে এপ্রুভাল বাটনসহ তথ্য
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        text: `📹 <b>New Video Submitted!</b>\n\n👤 <b>User:</b> ${userName}\n🆔 <b>User ID:</b> <code>${userId}</code>`,
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

  // ৩. অ্যাডমিন যখন Approve বা Reject বাটনে চাপবেন
  if (callback_query) {
    const adminChatId = callback_query.from.id;
    const data = callback_query.data;
    const messageId = callback_query.message.message_id;

    if (String(adminChatId) !== String(ADMIN_ID)) {
      return res.status(200).send('Unauthorized');
    }

    if (data.startsWith('approve_')) {
      const targetUserId = data.replace('approve_', '');
      const nowIso = new Date().toISOString();

      try {
        // ১. user_tasks টেবিলে Task 100 এন্ট্রি
        await fetch(`${SUPABASE_URL}/rest/v1/user_tasks`, {
          method: 'POST',
          headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            telegram_id: targetUserId,
            task_id: 100,
            completed_at: nowIso,
            last_completed_at: nowIso
          })
        });

        // ২. users টেবিলে is_verified=true এবং pool_balance + 300
        const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${targetUserId}&select=*`, {
          headers: supabaseHeaders
        });
        const users = await userRes.json();

        if (users && users.length > 0) {
          const currentBal = Number(users[0].pool_balance || 0);
          await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${targetUserId}`, {
            method: 'PATCH',
            headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
            body: JSON.stringify({ 
              is_verified: true,
              pool_balance: currentBal + 300 
            })
          });
        }
      } catch (err) {
        console.error('Task update error:', err);
      }

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetUserId,
          text: '🎉 Congratulations! Your video has been approved. 300 $XTAP has been added to your vault balance and your identity is Verified!'
        })
      });

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          message_id: messageId,
          text: `✅ Verified & Approved! 300 $XTAP credited to User ID: <code>${targetUserId}</code>`,
          parse_mode: 'HTML'
        })
      });
    } else if (data.startsWith('reject_')) {
      const targetUserId = data.replace('reject_', '');

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetUserId,
          text: '❌ Sorry, your submitted video has been rejected by the admin. Please try again.'
        })
      });

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          message_id: messageId,
          text: `❌ Video submission was rejected.`,
          parse_mode: 'HTML'
        })
      });
    }

    return res.status(200).send('OK');
  }

  return res.status(200).send('OK');
}
