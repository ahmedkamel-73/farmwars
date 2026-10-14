
# Farm Wars - Ready for Cloudflare Pages

## Deploy Steps (one link)
1. Create D1 DB in Cloudflare: wrangler d1 create farm_wars_db
2. Copy DB ID into wrangler.toml
3. Push this repo to GitHub
4. Cloudflare Pages -> Connect to GitHub -> Framework: None, Build command: empty, Output: /
5. Add D1 binding: DB -> farm_wars_db
6. Add Env Vars: BOT_TOKEN, BOT_USERNAME=farmwarsgamebot, OWNER_WALLET=UQA7QBgeXOQldcirB1fWYLr8SRF-3ZVpZliYVNcWp-hmqx4R
7. Deploy -> https://farm-wars.pages.dev
8. Run: wrangler d1 execute farm_wars_db --file=schema.sql
9. Set webhook: https://api.telegram.org/bot<token>/setWebApp?url=https://...

After first deploy, get Adsgram BlockId using your Pages URL, then update env ADSGRAM_BLOCK_ID and redeploy.

EN is default, AR auto if Telegram lang=ar.
