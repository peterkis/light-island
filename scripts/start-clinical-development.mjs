// The clinical demo is isolated from an existing legacy server on 17321.
process.env.ISLAND_DEMO_PORT='17322';
await import('../server/demo-server.mjs');
