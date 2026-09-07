export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is active');
  }

  const { message, callback_query } = req.body || {};
  const BOT_TOKEN = '8925575289:AAGYb4mGFXhuUoo-_Vl3WB454ePK2Z3OIvU';
  const ADMIN_ID = process.env.ADMIN_CHAT_ID || '5330021607';
  const SUPABASE_URL = 'https://gcqiahwqzfcxfnujzicn.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_FXfjr_BDysskhmnOyhsiQ_ENGIPqQ';

  const supabaseHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  // 1. /start command handling
  if (message && message.text && message.text.startsWith('/start')) {
    const chatId = message.chat.id;
    const textParts = message.text.split(' ');
    const referrerId = textParts.length > 1 ? textParts[1] : null;

    if (referrerId && String(referrerId) !== String(chatId)) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
          method: 'POST',
          headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
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

  // 2. User sends video -> forward to Admin
  const isVideo = message && (message.video || message.video_note || (message.document && message.document.mime_type && message.document.mime_type.startsWith('video/')));

  if (isVideo) {
    const userId = message.from.id;
    const userName = message.from.username ? `@${message.from.username}` : (message.from.first_name || 'User');
    const firstName = message.from.first_name || '';

    // Confirmation message to user
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: '✅ Your video has been submitted! Upon admin verification, 300 $XTAP will be credited to your account.'
      })
    });

    // Forward original message to Admin
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        from_chat_id: userId,
        message_id: message.message_id
      })
    });

    // Action buttons for Admin
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

  // 3. Admin actions (Approve / Reject)
  if (callback_query) {
    const adminChatId = callback_query.from.id;
    const data = callback_query.data;
    const messageId = callback_query.message.message_id;

    if (String(adminChatId) !== String(ADMIN_ID)) {
      return res.status(200).send('Unauthorized');
    }

    if (data.startsWith('approve_')) {
      const targetUserId = data.replace('approve_', '');

      // Check user and update / insert balance
      try {
        const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${targetUserId}&select=*`, {
          headers: supabaseHeaders
        });
        const users = await userRes.json();

        if (users && users.length > 0) {
          const currentBalance = Number(users[0].balance || 0);
          const newBalance = currentBalance + 300;

          await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${targetUserId}`, {
            method: 'PATCH',
            headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
            body: JSON.stringify({ balance: newBalance })
          });
        } else {
          // ইউজার আগে না থাকলে নতুন ইউজার তৈরি করে ব্যালেন্স ৩০০ দেওয়া
          await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
            body: JSON.stringify({
              telegram_id: targetUserId,
              balance: 300
            })
          });
        }
      } catch (e) {
        console.error('Balance update error:', e);
      }

      // Notify User
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetUserId,
          text: '🎉 Congratulations! Your video has been approved and 300 $XTAP has been credited to your balance!'
        })
      });

      // Update Admin message
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          message_id: messageId,
          text: `✅ Video approved! 300 $XTAP credited to User ID: <code>${targetUserId}</code>`,
          parse_mode: 'HTML'
        })
      });
    } else if (data.startsWith('reject_')) {
      const targetUserId = data.replace('reject_', '');

      // Notify User
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetUserId,
          text: '❌ Sorry, your submitted video has been rejected by the admin.'
        })
      });

      // Update Admin message
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
