'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getTwilioClient } from './client';

type TriggerType = 'broadcast' | 'reminder' | 'manual';

interface SmsResult {
  success: boolean;
  twilio_sid?: string;
  error?: string;
}

/**
 * Send an SMS to a single user. Callable only from server actions.
 * Logs to sms_log regardless of success/failure.
 */
export async function sendReminder(
  recipientId: string,
  messageText: string,
  sentBy: string,
  triggerType: TriggerType = 'manual'
): Promise<SmsResult> {
  const adminClient = createAdminClient();

  // Get recipient phone
  const { data: recipient } = await adminClient
    .from('users')
    .select('id, phone, sms_enabled')
    .eq('id', recipientId)
    .single();

  if (!recipient || !recipient.phone) {
    return { success: false, error: 'Recipient has no phone number' };
  }

  if (!recipient.sms_enabled) {
    return { success: false, error: 'Recipient has SMS disabled' };
  }

  try {
    const twilioClient = getTwilioClient();
    const from = process.env.TWILIO_FROM_NUMBER!;

    const twilioMsg = await twilioClient.messages.create({
      body: messageText,
      from,
      to: recipient.phone,
    });

    // Log success
    await adminClient.from('sms_log').insert({
      recipient_id: recipientId,
      sent_by: sentBy,
      message_text: messageText,
      twilio_sid: twilioMsg.sid,
      trigger_type: triggerType,
      status: 'sent',
    });

    return { success: true, twilio_sid: twilioMsg.sid };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    // Log failure
    await adminClient.from('sms_log').insert({
      recipient_id: recipientId,
      sent_by: sentBy,
      message_text: messageText,
      trigger_type: triggerType,
      status: 'failed',
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Send a broadcast SMS to all users with phone numbers and SMS enabled.
 */
export async function sendBroadcast(
  messageText: string,
  sentBy: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const adminClient = createAdminClient();

  const { data: recipients } = await adminClient
    .from('users')
    .select('id')
    .eq('sms_enabled', true)
    .not('phone', 'is', null);

  if (!recipients || recipients.length === 0) {
    return { sent: 0, failed: 0, errors: ['No SMS-enabled users with phone numbers'] };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    const result = await sendReminder(r.id, messageText, sentBy, 'broadcast');
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) errors.push(result.error);
    }
  }

  return { sent, failed, errors };
}
