"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = void 0;
const cron_1 = require("cron");
const boardService_1 = require("./boardService");
const startCronJobs = () => {
    // Run every minute
    new cron_1.CronJob("* * * * *", async () => {
        try {
            console.log("Running cron job to update auction statuses...");
            const auctionsToUpdate = await boardService_1.AuctionService.getAuctionsNeedingStatusUpdate();
            for (const auction of auctionsToUpdate) {
                if (auction.status === "scheduled") {
                    await boardService_1.AuctionService.updateAuctionStatus(auction.id, "live");
                }
                else if (auction.status === "live") {
                    await boardService_1.AuctionService.updateAuctionStatus(auction.id, "ended");
                }
            }
        }
        catch (error) {
            console.error("Error in cron job:", error);
        }
    }).start();
};
exports.startCronJobs = startCronJobs;
