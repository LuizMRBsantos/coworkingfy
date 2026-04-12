import { createClient } from "@supabase/supabase-js";

const BUCKET       = "os-photos";
const UNIT_DOCS_BUCKET = "unit-documents"; // bucket privado — URLs assinadas sob demanda

// Cliente server-side com service role — nunca expor no browser
// Lazy para evitar erro de módulo durante o build (variáveis de ambiente ausentes)
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Faz upload de um arquivo para o bucket os-photos do Supabase Storage.
 * Retorna a URL pública do arquivo.
 * O bucket deve existir e ser público no painel do Supabase.
 */
export async function uploadOsPhoto(
  file: File,
  osId: string,
): Promise<string> {
  const ext      = file.name.split(".").pop() ?? "jpg";
  const path     = `${osId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer   = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Faz upload de um documento de unidade para o bucket privado unit-documents.
 * Retorna o storage path (não URL). Use getUnitDocumentSignedUrl() para gerar URL temporária.
 * Bucket deve existir como PRIVADO no painel do Supabase.
 */
export async function uploadUnitDocument(
  file: File,
  unitId: string,
  itemType: string,
): Promise<string> {
  const ext    = file.name.split(".").pop() ?? "pdf";
  const path   = `${unitId}/${itemType}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(UNIT_DOCS_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) throw new Error(`Unit doc upload failed: ${error.message}`);

  return path;
}

/**
 * Gera URL assinada (1h) para um documento privado de unidade.
 */
export async function getUnitDocumentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await getSupabase().storage
    .from(UNIT_DOCS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error || !data) throw new Error(`Signed URL failed: ${error?.message}`);
  return data.signedUrl;
}
