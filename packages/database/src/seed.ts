import { PrismaClient, Role, UserStatus, WhatsAppSessionStatus, WhatsAppProviderType, EventStatus, RSVPStatus, InvitationStatus, CampaignType, CampaignStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateSecureToken } from '@eventblast/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EventBlast database seed...');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'global-events' },
    update: {},
    create: {
      name: 'Global Events & Media Corp',
      slug: 'global-events',
      timezone: 'Asia/Kolkata',
      logoUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=200&h=200&fit=crop',
    },
  });
  console.log(`✓ Organization ready: ${org.name} (${org.id})`);

  // 2. Create Admin User
  const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@eventblast.io' },
    update: { passwordHash },
    create: {
      organizationId: org.id,
      name: 'Rahul Sharma',
      email: 'admin@eventblast.io',
      passwordHash,
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✓ Admin user created: ${adminUser.email} (Password: AdminPassword123!)`);

  // 3. Create Sample WhatsApp Session
  const waSession = await prisma.whatsAppSession.upsert({
    where: { providerSessionId: 'session_marketing_01' },
    update: {},
    create: {
      organizationId: org.id,
      provider: WhatsAppProviderType.MOCK,
      providerSessionId: 'session_marketing_01',
      displayName: 'Marketing Primary Line (+91 98765 43210)',
      phoneNumber: '+919876543210',
      status: WhatsAppSessionStatus.CONNECTED,
      lastSeenAt: new Date(),
      lastSuccessfulMessageAt: new Date(),
    },
  });
  console.log(`✓ WhatsApp session seeded: ${waSession.displayName}`);

  // 4. Create Contact Groups
  const vipGroup = await prisma.contactGroup.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'VIP Dealers' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'VIP Dealers',
      description: 'Exclusive tier 1 retail and wholesale distribution partners',
    },
  });

  const pressGroup = await prisma.contactGroup.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Media & Press' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Media & Press',
      description: 'Journalists, industry influencers, and PR partners',
    },
  });

  // 5. Seed Contacts
  const sampleContactsData = [
    {
      firstName: 'Amit',
      lastName: 'Banerjee',
      fullName: 'Amit Banerjee',
      phoneNumber: '+919830112233',
      email: 'amit.banerjee@luxtextiles.com',
      company: 'Lux Textiles Corp',
      designation: 'Managing Director',
      groupId: vipGroup.id,
      customFields: { vipTier: 'Platinum', dealerCode: 'DLR-7701' },
    },
    {
      firstName: 'Priya',
      lastName: 'Sengupta',
      fullName: 'Priya Sengupta',
      phoneNumber: '+919830223344',
      email: 'priya.s@kolkatafashion.in',
      company: 'Kolkata Fashion Week',
      designation: 'Chief Curator',
      groupId: pressGroup.id,
      customFields: { vipTier: 'Gold', pressPass: 'PRESS-882' },
    },
    {
      firstName: 'Rajesh',
      lastName: 'Agarwal',
      fullName: 'Rajesh Agarwal',
      phoneNumber: '+919830334455',
      email: 'rajesh.agarwal@agarwalgarments.com',
      company: 'Agarwal Garments Retail',
      designation: 'Senior Partner',
      groupId: vipGroup.id,
      customFields: { vipTier: 'Diamond', dealerCode: 'DLR-1024' },
    },
    {
      firstName: 'Sneha',
      lastName: 'Mukherjee',
      fullName: 'Sneha Mukherjee',
      phoneNumber: '+919830445566',
      email: 'sneha@thetelegraph.com',
      company: 'The Telegraph',
      designation: 'Senior Feature Writer',
      groupId: pressGroup.id,
      customFields: { vipTier: 'Gold', pressPass: 'PRESS-109' },
    },
    {
      firstName: 'Vikram',
      lastName: 'Choudhury',
      fullName: 'Vikram Choudhury',
      phoneNumber: '+919830556677',
      email: 'vikram.c@easternapparels.com',
      company: 'Eastern Apparels Pvt Ltd',
      designation: 'VP Sales',
      groupId: vipGroup.id,
      customFields: { vipTier: 'Platinum', dealerCode: 'DLR-9011' },
    },
  ];

  const createdContacts = [];
  for (const cData of sampleContactsData) {
    const contact = await prisma.contact.upsert({
      where: {
        organizationId_phoneNumber: {
          organizationId: org.id,
          phoneNumber: cData.phoneNumber,
        },
      },
      update: {
        company: cData.company,
        designation: cData.designation,
        customFields: cData.customFields,
      },
      create: {
        organizationId: org.id,
        firstName: cData.firstName,
        lastName: cData.lastName,
        fullName: cData.fullName,
        phoneNumber: cData.phoneNumber,
        email: cData.email,
        company: cData.company,
        designation: cData.designation,
        marketingOptIn: true,
        optInSource: 'ANNUAL_DEALER_REGISTRATION',
        optInAt: new Date(),
        customFields: cData.customFields,
      },
    });

    await prisma.contactGroupMember.upsert({
      where: {
        groupId_contactId: {
          groupId: cData.groupId,
          contactId: contact.id,
        },
      },
      update: {},
      create: {
        groupId: cData.groupId,
        contactId: contact.id,
      },
    });

    createdContacts.push(contact);
  }
  console.log(`✓ Seeded ${createdContacts.length} contacts with group memberships`);

  // 6. Create Flagship Event
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 30);
  startDate.setHours(10, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setHours(18, 0, 0, 0);

  const rsvpDeadline = new Date(startDate);
  rsvpDeadline.setDate(rsvpDeadline.getDate() - 3);

  const event = await prisma.event.upsert({
    where: {
      organizationId_slug: {
        organizationId: org.id,
        slug: 'garment-expo-2026',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'International Garment Expo & Summit 2026',
      slug: 'garment-expo-2026',
      description: 'The premier national confluence for garment manufacturers, textile innovators, distributors, and retail moguls. Discover next-generation fabrics, direct supply chain partnerships, and fashion tech showcases.',
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop',
      startAt: startDate,
      endAt: endDate,
      timezone: 'Asia/Kolkata',
      venueName: 'Biswa Bangla Convention Centre (Grand Hall A)',
      venueAddress: 'Biswa Bangla Sarani, Action Area I, New Town, Kolkata, West Bengal 700156',
      latitude: 22.5855,
      longitude: 88.4682,
      mapsUrl: 'https://maps.google.com/?q=Biswa+Bangla+Convention+Centre',
      rsvpEnabled: true,
      rsvpDeadline,
      status: EventStatus.PUBLISHED,
    },
  });
  console.log(`✓ Event created: ${event.name} (${event.slug})`);

  // 7. Seed Event Guests with Unique RSVP Tokens
  for (let i = 0; i < createdContacts.length; i++) {
    const contact = createdContacts[i];
    const uniqueToken = generateSecureToken(12);
    
    // Spread some sample RSVP statuses for demo richness
    let rsvpStatus: RSVPStatus = RSVPStatus.PENDING;
    let invStatus: InvitationStatus = InvitationStatus.DELIVERED;
    if (i === 0) rsvpStatus = RSVPStatus.GOING;
    if (i === 1) rsvpStatus = RSVPStatus.MAYBE;
    if (i === 2) rsvpStatus = RSVPStatus.GOING;

    await prisma.eventGuest.upsert({
      where: {
        eventId_contactId: {
          eventId: event.id,
          contactId: contact.id,
        },
      },
      update: {},
      create: {
        eventId: event.id,
        contactId: contact.id,
        uniqueToken,
        invitationStatus: invStatus,
        rsvpStatus,
        invitedAt: new Date(),
        respondedAt: rsvpStatus !== RSVPStatus.PENDING ? new Date() : null,
      },
    });
  }
  console.log(`✓ Event guests seeded with unique RSVP tokens`);

  // 8. Create Templates
  const template = await prisma.template.upsert({
    where: { id: 'template_expo_invitation' },
    update: {},
    create: {
      id: 'template_expo_invitation',
      organizationId: org.id,
      name: 'Garment Expo 2026 VIP Invitation',
      category: 'INVITATION',
      content: 'Hi {{firstName}},\n\nYou are cordially invited to the *{{eventName}}*.\n\n📅 *Date:* {{eventDate}}\n⏰ *Time:* {{eventTime}}\n📍 *Venue:* {{venue}}\n\nKindly confirm your attendance via your personalized RSVP link:\n👉 {{rsvpUrl}}\n\nWe look forward to hosting you!\nWarm regards,\n*{{companyName}}*',
      mediaUrl: event.bannerUrl,
      mediaType: 'IMAGE',
      variables: ['firstName', 'eventName', 'eventDate', 'eventTime', 'venue', 'rsvpUrl', 'companyName'],
    },
  });
  console.log(`✓ Template seeded: ${template.name}`);

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
