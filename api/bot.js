import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('XTAP Bot Backend is Online');
  }

  const { message, callback_query } = req.body || {};
  const BOT_TOKEN = '8925575289:AAGYb4mGFXhuUoo-_Vl3WB454ePK2Z3OIvU';
  const ADMIN_ID = process.env.ADMIN_CHAT_ID || '5330021607';
  const SUPABASE_URL = 'https://grqnxhwzqfrxfnujaicn.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_FXFjr-BDyvkWkHAn0ykoiQ_X96I3Pq0';

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. /start Command Handling
  if (message && message.text && message.text.startsWith('/start')) {
    const chatId = message.chat.id;
    const fullText = message.text.trim();

    // Human Proof Verification Request
    if (fullText.includes('verify')) {
      const verifyMessage = 
        `🛡️ <b>XTAP PROTOCOL: HUMAN PROOF VERIFICATION</b>\n\n` +
        `To prevent Sybil attacks and qualify for the upcoming Mainnet TGE distribution, please submit your biometric proof of humanity.\n\n` +
        `<b>📋 Submission Instructions:</b>\n` +
        `• Record a short video clip (or video note).\n` +
        `• Ensure your face is clearly visible.\n` +
        `• Show all 5 open fingers toward the camera.\n` +
        `• Send the video directly in this chat.\n\n` +
        `<b>🎁 Reward:</b> <code>+300.0000 XTAP</code>\n` +
        `<b>⚡ Status:</b> Awaiting Video Upload`;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: verifyMessage,
          parse_mode: 'HTML'
        })
      });
      return res.status(200).send('OK');
    }

    // Standard /start Referral
    const textParts = fullText.split(' ');
    const param = textParts.length > 1 ? textParts[1] : null;

    if (param && String(param) !== String(chatId)) {
      try {
        await supabase.from('referrals').insert([{ referrer_id: String(param), referred_id: String(chatId) }]);
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
        caption: 
          `⚡ <b>Welcome to XTAP Network Protocol</b>\n\n` +
          `• Decentralized Cloud Farming Engine\n` +
          `• BEP-20 Settlement Integration\n` +
          `• Anti-Sybil Proof of Humanity Protected\n\n` +
          `Launch the terminal below to start mining operations.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Launch Terminal', web_app: { url: 'https://xtap-crypto.vercel.app' } }],
            [{ text: '📢 Official Channel', url: 'https://t.me/Cryptotapxofficial' }]
          ]
        }
      })
    });

    return res.status(200).send('OK');
  }

  // 2. Video Receipt & Forwarding to Admin
  const isVideo = message && (message.video || message.video_note || (message.document && message.document.mime_type && message.document.mime_type.startsWith('video/')));

  if (isVideo) {
    const userId = message.from.id;
    const userName = message.from.username ? `@${message.from.username}` : (message.from.first_name || 'Pilot');

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: `✅ <b>Submission Received</b>\n\nYour verification video has been queued for protocol validation. Upon approval, <b>300.0000 XTAP</b> will be deposited to your pool vault and your pilot credentials will be upgraded to Verified.`,
        parse_mode: 'HTML'
      })
    });

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        from_chat_id: userId,
        message_id: message.message_id
      })
    });

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        text: `🛡️ <b>New Verification Request</b>\n\n<b>Pilot:</b> ${userName}\n<b>Telegram ID:</b> <code>${userId}</code>\n<b>Action:</b> Review the video above and select verdict.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve (+300 XTAP)', callback_data: `approve_${userId}` },
              { text: '❌ Reject', callback_data: `reject_${userId}` }
            ]
          ]
        }
      })
    });

    return res.status(200).send('OK');
  }

  // 3. Admin Decision Handling
  if (callback_query) {
    const adminChatId = callback_query.from.id;
    const data = callback_query.data;
    const messageId = callback_query.message.message_id;

    if (String(adminChatId) !== String(ADMIN_ID)) {
      return res.status(200).send('Unauthorized');
    }

    if (data.startsWith('approve_')) {
      const targetUserId = data.replace('approve_', '').trim();
      const numUserId = Number(targetUserId);
      const nowIso = new Date().toISOString();

      try {
        // ১. users টেবিলে চেক করা (String এবং Number উভয় ফিল্টারে)
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .or(`telegram_id.eq.${numUserId},telegram_id.eq."${targetUserId}"`);

        let currentBal = 0;
        if (users && users.length > 0) {
          currentBal = parseFloat(users[0].pool_balance) || 0;
        }

        const newBal = currentBal + 300;

        // ২. users আপডেট
        await supabase
          .from('users')
          .update({ is_verified: true, pool_balance: newBal })
          .or(`telegram_id.eq.${numUserId},telegram_id.eq."${targetUserId}"`);

        // ৩. user_tasks টেবিলে Task ID 100 সংরক্ষণ
        await supabase
          .from('user_tasks')
          .upsert({
            telegram_id: numUserId,
            task_id: 100,
            completed_at: nowIso,
            last_completed_at: nowIso
          }, { onConflict: 'telegram_id,task_id' });

      } catch (err) {
        console.error('Database sync error:', err);
      }

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetUserId,
          text: `🎉 <b>Verification Successful!</b>\n\nYour biometric authentication has been approved.\n\n• Status: <b>Verified ✓</b>\n• Credited: <b>+300.0000 XTAP</b>\n• Mainnet Airdrop: <b>Unlocked</b>`,
          parse_mode: 'HTML'
        })
      });

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          message_id: messageId,
          text: `✅ <b>Approved</b>: 300 XTAP credited to Pilot <code>${targetUserId}</code>.`,
          parse_mode: 'HTML'
        })
      });
    } else if (data.startsWith('reject_')) {
      const targetUserId = data.replace('reject_', '').trim();

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetUserId,
          text: `❌ <b>Verification Failed</b>\n\nYour video submission did not meet the validation criteria (unclear face or fingers not visible). Please record again and re-submit.`,
          parse_mode: 'HTML'
        })
      });

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          message_id: messageId,
          text: `❌ <b>Rejected</b> for Pilot <code>${targetUserId}</code>.`,
          parse_mode: 'HTML'
        })
      });
    }

    return res.status(200).send('OK');
  }

  return res.status(200).send('OK');
}
