To install dependencies:
```sh
bun install
```

To run the API only:
```sh
bun run dev
```

To run Postgres/Redis/Meilisearch plus API, storefront, and admin:
```sh
bun run dev:all
# or from the parent folder: ./dev.sh
```

- API: http://localhost:9000 (set `PORT` in `.env`)
- Storefront: http://localhost:3000
- Admin: http://localhost:5173
