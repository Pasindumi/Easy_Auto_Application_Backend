import crypto from "crypto";

const merchant_id = "1233627";
const order_id = "INV-08c95a62-0";
const amount = "63.00";
const currency = "LKR";

const secrets = {
    "NEW_LITERAL": "MTIxMTQzNTE5MzE0ODgyNDY5MDE5Nzc1MjQyMDg0ODk5NjU1ODk=",
    "NEW_DECODED": "12114351931488246901977524208489965589",
    "OLD_LITERAL": "MjQyMDk5MjA1OTI5MTI5ODIzNjAxOTc5NTU3NzIwMTU2OTc2Mzg2NQ==",
    "OLD_DECODED": "2420992059291298236019795577201569763865"
};

const getMd5 = (str) => crypto.createHash("md5").update(str).digest("hex").toUpperCase();

const target = "76B444C859F375E2459090CBBF9C5066";

for (const [name, secret] of Object.entries(secrets)) {
    const hashedSecret = getMd5(secret);
    const hashString =
        merchant_id +
        order_id +
        amount +
        currency +
        hashedSecret;
    const finalHash = getMd5(hashString);

    if (finalHash === target) {
        console.log(`MATCH_FOUND:${name}`);
    }
}
