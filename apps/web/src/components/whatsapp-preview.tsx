'use client';

import React from 'react';
import { Phone, Video, MoreVertical, CheckCheck, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { renderTemplateVariables } from '@eventblast/shared';

interface WhatsAppPreviewProps {
  templateContent: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  sampleContact?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    company?: string;
    phoneNumber?: string;
    customFields?: Record<string, any>;
  };
  sampleEvent?: {
    name?: string;
    startAt?: string | Date;
    venueName?: string;
    venueAddress?: string;
    mapsUrl?: string;
  };
  sampleToken?: string;
  appName?: string;
}

export function WhatsAppPreview({
  templateContent,
  mediaUrl,
  mediaType,
  sampleContact = {
    firstName: 'Rahul',
    lastName: 'Sharma',
    fullName: 'Rahul Sharma',
    company: 'Lux Industries',
  },
  sampleEvent = {
    name: 'International Garment Expo & Summit 2026',
    venueName: 'Biswa Bangla Convention Centre',
    venueAddress: 'New Town, Kolkata',
    mapsUrl: 'https://maps.google.com',
  },
  sampleToken = 'demo-rsvp-token-77',
  appName = 'EventBlast Events',
}: WhatsAppPreviewProps) {
  const rsvpUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/rsvp/${sampleToken}`
    : `https://eventblast.io/rsvp/${sampleToken}`;

  const variables: Record<string, any> = {
    firstName: sampleContact.firstName || 'Rahul',
    lastName: sampleContact.lastName || 'Sharma',
    fullName: sampleContact.fullName || 'Rahul Sharma',
    company: sampleContact.company || 'Lux Industries',
    companyName: appName,
    senderName: appName,
    rsvpUrl,
    eventName: sampleEvent.name || 'Garment Expo 2026',
    eventDate: '15 October 2026',
    eventTime: '10:00 AM',
    venue: sampleEvent.venueName || 'Biswa Bangla Convention Centre',
    eventAddress: sampleEvent.venueAddress || 'New Town, Kolkata',
    mapsUrl: sampleEvent.mapsUrl || 'https://maps.google.com',
    custom: sampleContact.customFields || { vipTier: 'Platinum', dealerCode: 'DLR-7701' },
  };

  const { rendered, missingVariables } = renderTemplateVariables(
    templateContent || 'Hi {{firstName}}, you are invited to {{eventName}}! RSVP here: {{rsvpUrl}}',
    variables,
    true,
  );

  return (
    <div className="w-full max-w-sm mx-auto bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-700/80">
      {/* Phone Notch */}
      <div className="w-36 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
        <div className="w-3 h-3 bg-slate-900 rounded-full mr-2" />
        <div className="w-8 h-1.5 bg-slate-900 rounded-full" />
      </div>

      {/* Screen Container */}
      <div className="bg-[#0b141a] rounded-[26px] overflow-hidden flex flex-col h-[520px] text-slate-100 relative">
        {/* WhatsApp Top Header */}
        <div className="bg-[#202c33] px-3.5 py-2.5 flex items-center justify-between border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
              {sampleContact.firstName?.slice(0, 1) || 'R'}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-1">
                <span>{sampleContact.fullName || 'Rahul Sharma'}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-medium">online</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <Video className="w-4 h-4" />
            <Phone className="w-3.5 h-3.5" />
            <MoreVertical className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Chat Canvas with authentic WhatsApp pattern tone */}
        <div className="flex-1 p-3 overflow-y-auto bg-[#0b141a] bg-opacity-95 flex flex-col justify-end space-y-2">
          {/* Security Notice Pill */}
          <div className="mx-auto my-1 bg-[#182229] px-2.5 py-1 rounded-md text-[10px] text-amber-300/80 text-center max-w-[240px] shadow-sm">
            🔒 Messages are end-to-end encrypted.
          </div>

          {/* Incoming Message Bubble */}
          <div className="max-w-[85%] self-start bg-[#202c33] text-slate-200 rounded-2xl rounded-tl-none p-3 shadow-md border border-slate-700/20 text-xs leading-relaxed space-y-2">
            {/* Media preview if attached */}
            {mediaUrl && (
              <div className="rounded-xl overflow-hidden mb-2 bg-slate-800 border border-slate-700/40 max-h-36">
                <img src={mediaUrl} alt="Event Media Attachment" className="w-full h-auto object-cover" />
              </div>
            )}

            {/* Rendered Text */}
            <div className="whitespace-pre-wrap font-sans text-slate-200">
              {rendered}
            </div>

            {/* Quick Action Button for RSVP if token exists */}
            {rendered.includes('/rsvp/') && (
              <div className="pt-1.5 border-t border-slate-700/40">
                <a
                  href={rsvpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold transition-colors"
                >
                  <span>✓ Open Personalized RSVP</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Timestamp & double checkmarks */}
            <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-0.5">
              <span>10:04 AM</span>
              <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
            </div>
          </div>
        </div>

        {/* Missing Variable Warnings */}
        {missingVariables.length > 0 && (
          <div className="bg-rose-950/90 border-t border-rose-800/80 p-2 text-[11px] text-rose-300">
            ⚠️ Unresolved variables: {missingVariables.map((v) => `{{${v}}}`).join(', ')}
          </div>
        )}

        {/* Input Bar Mock */}
        <div className="bg-[#202c33] p-2 flex items-center gap-2 shrink-0">
          <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-slate-400">
            Type a message...
          </div>
          <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-slate-900 font-bold">
            <span className="text-xs">🎤</span>
          </div>
        </div>
      </div>
    </div>
  );
}
