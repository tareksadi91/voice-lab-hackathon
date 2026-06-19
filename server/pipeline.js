export async function runPipeline(transcript, { pool, store, extract, match }) {
  const dossier = await extract(transcript);
  const { paid_matches } = await match(dossier, pool);
  return store.saveCall({ dossier, paid_matches });
}
