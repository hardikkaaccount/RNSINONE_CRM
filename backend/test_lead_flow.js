const { getChatResponse } = require('./gemini_service');
const fs = require('fs');

async function runTests() {
    console.log("==================================================");
    console.log("🧪 TEST 1: BRAND NEW LEAD (isKnownLead = false)");
    console.log("==================================================");
    const question1 = "Hi, I have a KTM Duke 390. Does FuelX Autotune make a big difference?";
    console.log(`User: ${question1}`);
    
    // Simulating a brand new phone number interacting with the bot
    const answer1 = await getChatResponse("new_user_999", question1, false);
    console.log("\nRace Bot (Expected to ask for details gradually):\n");
    console.log(answer1);
    
    console.log("\n\n==================================================");
    console.log("🧪 TEST 2: EXISTING LEAD (isKnownLead = true)");
    console.log("==================================================");
    const question2 = "Hi, I have a KTM Duke 390. Does FuelX Autotune make a big difference?";
    console.log(`User: ${question2}`);
    
    // Simulating a user who is already in leads.json
    const answer2 = await getChatResponse("existing_user_888", question2, true);
    console.log("\nRace Bot (Expected to ONLY answer the technical question):\n");
    console.log(answer2);
    
    console.log("\n==================================================");
    console.log("Tests Complete.");
}

runTests();
