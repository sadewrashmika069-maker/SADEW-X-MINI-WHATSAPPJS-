if (cmd === 'btnmode') {
    const option = args[0] ? args[0].toLowerCase() : '';
 
    if (option === 'on') {
        // sessionConfig eketa save + MongoDB eketa push
        sessionConfig.BUTTON_MODE = 'true';
        await saveConfig(); // already defined in the plugin
        return reply(`✅ *Button Mode ON!* මින් ඉදිරියට ඔබට Buttons පෙනෙනු ඇත.`);
    } else if (option === 'off') {
        sessionConfig.BUTTON_MODE = 'false';
        await saveConfig();
        return reply(`✅ *Button Mode OFF!* මින් ඉදිරියට ඔබට Number Reply පෙනෙනු ඇත.`);
    } else {
        return reply(`❌ *කරුණාකර නිවැරදි විධානයක් ලබාදෙන්න!*\nඋදා: .btnmode on (හෝ) .btnmode off`);
    }
}
