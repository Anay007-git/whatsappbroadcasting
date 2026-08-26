import { PrismaClient, CampaignStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import { CampaignProcessor } from './processor';

dotenv.config({ path: '../../.env' });
dotenv.config();

const prisma = new PrismaClient();
const minDelay = parseInt(process.env.MESSAGE_MIN_DELAY_MS || '1000', 10);
const processor = new CampaignProcessor(prisma, minDelay);

async function startWorker() {
  console.log('⚡ [EventBlast Worker Service] Initialized and listening for campaign jobs...');

  // Periodic polling loop for running campaigns and automated reminders
  setInterval(async () => {
    try {
      // 1. Find any campaigns in RUNNING state with QUEUED messages
      const runningCampaigns = await prisma.campaign.findMany({
        where: { status: CampaignStatus.RUNNING },
        select: { id: true },
      });

      for (const camp of runningCampaigns) {
        await processor.processCampaign(camp.id);
      }

      // 2. Process automated reminder triggers
      await processor.processAutomatedReminders();
    } catch (e: any) {
      console.error('Error in worker cycle:', e.message);
    }
  }, 3000);
}

startWorker().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
