import { CronJob } from "cron";
import { AuctionService } from "./boardService";

export const startCronJobs = () => {
  // Run every minute
  new CronJob("* * * * *", async () => {
    try {
      console.log("Running cron job to update auction statuses...");
      const auctionsToUpdate =
        await AuctionService.getAuctionsNeedingStatusUpdate();

      for (const auction of auctionsToUpdate) {
        if (auction.status === "scheduled") {
          await AuctionService.updateAuctionStatus(auction.id, "live");
        } else if (auction.status === "live") {
          await AuctionService.updateAuctionStatus(auction.id, "ended");
        }
      }
    } catch (error) {
      console.error("Error in cron job:", error);
    }
  }).start();
};
