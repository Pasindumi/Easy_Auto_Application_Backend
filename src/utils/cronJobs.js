import cron from "node-cron";
import supabase from "../config/supabase.js";
import { initializeNotificationJobs } from "../jobs/notificationJobs.js";

const startCronJobs = () => {
    // Initialize Notification Jobs
    initializeNotificationJobs();

    // Run every day at midnight
    cron.schedule("0 0 * * *", async () => {
        console.log("Running Ad Expiry Job...");
        try {
            const { error } = await supabase
                .from("CarAd")
                .update({ status: "EXPIRED" })
                .eq("status", "ACTIVE")
                .lt("expiry_date", new Date().toISOString());

            if (error) {
                console.error("Error expire ads:", error);
            } else {
                console.log("Ad Expiry Job Completed.");
            }
        } catch (err) {
            console.error("Cron Job Failed:", err);
        }
    });

    // Run every hour to check for expired bans
    cron.schedule("0 * * * *", async () => {
        console.log("Running User Unban Job...");
        try {
            const { error } = await supabase
                .from("users")
                .update({ status: "ACTIVE", ban_expires_at: null, ban_reason: null })
                .eq("status", "BANNED")
                .lt("ban_expires_at", new Date().toISOString());

            if (error) {
                console.error("Error unbanning users:", error);
            } else {
                console.log("User Unban Job Completed.");
            }
        } catch (err) {
            console.error("User Unban Cron Job Failed:", err);
        }
    });
};

export default startCronJobs;
