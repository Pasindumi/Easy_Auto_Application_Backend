import cron from "node-cron";
import supabase from "../config/supabase.js";

const startCronJobs = () => {
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
};

export default startCronJobs;
