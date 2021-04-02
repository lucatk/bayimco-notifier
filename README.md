# BayIMCO Notifier

This sleek Node.js application checks BayIMCO ([impfzentren.bayern](https://impfzentren.bayern)) platform for available appointments and can notify you via Telegram.

### Usage

1. Create a telegram bot, set `TELEGRAM_BOT_TOKEN` in `constants.js`
2. Retrieve the bot's chat ID on your target Telegram device (where you want to receive the notifications)
4. Register on [impfzentren.bayern](https://impfzentren.bayern/citizen/)
5. Start bot (`yarn; node .` or build and use the Docker image) using the following environment variables:
    - `EMAIL`: The e-mail you registered with on BayIMCO
    - `PASSWORD`: The password you registered with on BayIMCO (sorry, plaintext!)
    - `CITIZEN_ID`: The citizen ID (located in URL on BayIMCO) to watch for appointments for
    - `TELEGRAM_ID`: The destination chat ID you retrieved earlier
