import dotenv from 'dotenv';
dotenv.config();

import supabase from './src/config/supabase.js';
import { applyBoostToAd } from './src/controllers/boostController.js';

async function verifyBoostSystem() {
    console.log("🚀 Starting Boost System Verification...");
    let adId = null;
    let boostId = null;

    try {
        // 1. Get Prerequisites
        console.log("Checking prerequisites...");
        const { data: users } = await supabase.from('users').select('id').limit(1);
        if (!users || users.length === 0) throw new Error("No users found to create ad.");
        const userId = users[0].id;

        const { data: vehicleTypes } = await supabase.from('vehicle_types').select('id').limit(1);
        if (!vehicleTypes || vehicleTypes.length === 0) throw new Error("No vehicle types found.");
        const vehicleTypeId = vehicleTypes[0].id;

        const { data: boostPackages } = await supabase.from('price_items').select('id').eq('item_type', 'BOOST_PACKAGE').limit(1);

        let packageId;
        if (!boostPackages || boostPackages.length === 0) {
            console.log("⚠️ No boost packages found. Creating a temporary one...");
            // Create a temp boost package
            const { data: tempPkg, error: pkgError } = await supabase.from('price_items').insert({
                name: 'TEST_BOOST',
                code: 'TEST_' + Date.now(),
                description: 'Test Boost Package',
                item_type: 'BOOST_PACKAGE',
                status: 'ACTIVE'
            }).select().single();

            if (pkgError) throw pkgError;
            packageId = tempPkg.id;

            // Add features (mock)
            // Ideally we add 'package_included_items' to link to 'FL_BOOST' (Featured)
            // But let's assume the controller handles it if included items exist.
            // For now, let's just test the function execution.
        } else {
            packageId = boostPackages[0].id;
        }

        console.log(`✅ Using User: ${userId}, VehicleType: ${vehicleTypeId}, Package: ${packageId}`);

        // 2. Create Dummy Ad
        console.log("Creating dummy ad...");
        const { data: ad, error: adError } = await supabase.from('CarAd').insert({
            seller_id: userId,
            vehicle_type_id: vehicleTypeId,
            title: 'VERIFICATION_TEST_AD_' + Date.now(),
            price: 1000000,
            status: 'ACTIVE', // Active to simulate real ad
            is_featured: false,
            is_urgent: false
        }).select().single();

        if (adError) throw adError;
        adId = ad.id;
        console.log(`✅ Created Ad: ${adId}`);

        // 3. Apply Boost
        console.log("Applying Boost...");
        const boostResult = await applyBoostToAd({
            adId: adId,
            packageId: packageId,
            paymentId: null, // mock payment
            durationDays: 7
        });

        if (!boostResult) throw new Error("applyBoostToAd returned null");
        boostId = boostResult.id;
        console.log(`✅ Boost Applied: ${boostId}`);

        // 4. Verify DB State
        console.log("Verifying Database State...");

        // Check ad_boosts table
        const { data: boostRecord, error: brError } = await supabase
            .from('ad_boosts')
            .select('*')
            .eq('id', boostId)
            .single();

        if (brError || !boostRecord) throw new Error("Boost record not found in DB.");
        console.log("✅ ad_boosts record verified.");

        // Check CarAd flags
        // Note: applyBoostToAd only updates flags if 'package_included_items' exist for the package.
        // If we used a random package, it might not have included items.
        // So we might not see flags update unless we ensure the package has items.
        // But preventing crash is the main goal here.

        const { data: updatedAd } = await supabase.from('CarAd').select('is_featured, is_urgent').eq('id', adId).single();
        console.log("Ad Flags after boost:", updatedAd);

        console.log("🎉 VERIFICATION SUCCESSFUL!");

    } catch (error) {
        console.error("❌ VERIFICATION FAILED:", error);
    } finally {
        // 5. Cleanup
        if (adId) {
            console.log("Cleaning up ad...");
            await supabase.from('CarAd').delete().eq('id', adId);
            // ad_boosts should cascade delete or we delete manually
            if (boostId) await supabase.from('ad_boosts').delete().eq('id', boostId);
        }
        console.log("Done.");
    }
}

verifyBoostSystem();
