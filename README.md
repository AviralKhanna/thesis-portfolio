# Thesis — Portfolio Intelligence

A local investment research application with a public, static portfolio demo.

## Public site

Vercel serves only `frontend/`. It uses five fictional companies and sample values. Portfolio navigation, filtering and sample JSON export work. Uploads, broker connections and research generation require the local application; the public demo does not accept credentials or files. Several research sections are still placeholders.

## Local tools

```sh
npm run check
PORT=4010 npm start
```

The original private working data remains in the local source workspace. No storage, input documents, reports, environment files or credentials are included in the Vercel upload. Existing repository history remains private.

## Live website

https://thesis-portfolio-rouge.vercel.app
